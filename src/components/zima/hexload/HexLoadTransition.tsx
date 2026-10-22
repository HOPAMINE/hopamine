"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createHexLoadAnimation,
  type HexLoadAnimation,
  type HexLoadOrigin,
} from "./hexLoadAnimation";

const ZIMA_LOGO_SRC = "/zima/logo.png";
const ZIMA_LOGO_WIDTH_PX = 106;
const ZIMA_LOGO_HEIGHT_PX = 39;

// Auth bounces (Clerk refresh, onboarding gate) can change the route more than once;
// the reveal waits until the pathname has been quiet for this long.
const SETTLE_AFTER_NAVIGATION_MS = 400;
const HOLD_BEFORE_ARRIVAL_REVEAL_MS = 400;
// If the route never changes (navigation blocked, auth bounce, etc.) the cover must not trap the user.
const NAVIGATION_FALLBACK_REVEAL_MS = 6000;
const REVEAL_ON_ARRIVAL_STORAGE_KEY = "zima-hex-load-reveal-on-arrival";

type CoverAndNavigateOptions = {
  replace?: boolean;
  origin?: HexLoadOrigin;
  /** Runs once the screen is fully covered and before navigating, e.g. activating the Clerk session. A throw lifts the cover and rethrows. */
  beforeNavigate?: () => Promise<unknown> | unknown;
};

export type HexLoadTransitionApi = {
  /** Covers the screen, navigates underneath, and reveals once the new route has rendered. */
  coverAndNavigate(href: string, options?: CoverAndNavigateOptions): Promise<void>;
  /** Covers the screen and resolves once it is fully hidden. Pair with `reveal`. */
  cover(origin?: HexLoadOrigin): Promise<void>;
  /** Lifts the cover. Resolves when the last hexagon is gone. */
  reveal(): Promise<void>;
};

const HexLoadTransitionContext = createContext<HexLoadTransitionApi | null>(null);

/** Call before a full-page redirect so the destination mounts covered and flips open on arrival. */
export function markHexLoadRevealOnArrival() {
  try {
    window.sessionStorage.setItem(REVEAL_ON_ARRIVAL_STORAGE_KEY, "1");
  } catch {
    // Storage blocked: the destination simply renders without the reveal.
  }
}

export function clearHexLoadRevealOnArrival() {
  try {
    window.sessionStorage.removeItem(REVEAL_ON_ARRIVAL_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was stored either.
  }
}

function consumeRevealOnArrivalFlag(): boolean {
  try {
    const flagged = window.sessionStorage.getItem(REVEAL_ON_ARRIVAL_STORAGE_KEY) === "1";
    if (flagged) window.sessionStorage.removeItem(REVEAL_ON_ARRIVAL_STORAGE_KEY);
    return flagged;
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HexLoadTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<HexLoadAnimation | null>(null);
  const pendingRevealRef = useRef<{
    startPathname: string;
    settleTimerId: number;
    fallbackTimerId: number;
  } | null>(null);

  const getAnimation = useCallback((): HexLoadAnimation | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!animationRef.current) {
      animationRef.current = createHexLoadAnimation(canvas, {
        centerLogoSrc: ZIMA_LOGO_SRC,
        centerLogoWidthPx: ZIMA_LOGO_WIDTH_PX,
        centerLogoHeightPx: ZIMA_LOGO_HEIGHT_PX,
      });
    }
    return animationRef.current;
  }, []);

  const showCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.visibility = "visible";
  }, []);

  const hideCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.visibility = "hidden";
  }, []);

  const cover = useCallback(
    async (origin?: HexLoadOrigin) => {
      const animation = getAnimation();
      if (!animation || prefersReducedMotion()) return;
      showCanvas();
      await animation.cover(origin);
    },
    [getAnimation, showCanvas],
  );

  const reveal = useCallback(async () => {
    const animation = animationRef.current;
    if (animation) await animation.reveal();
    hideCanvas();
  }, [hideCanvas]);

  const finishPendingReveal = useCallback(() => {
    const pending = pendingRevealRef.current;
    if (!pending) return;
    pendingRevealRef.current = null;
    window.clearTimeout(pending.settleTimerId);
    window.clearTimeout(pending.fallbackTimerId);
    // This provider survived the navigation, so the arrival insurance is not needed.
    clearHexLoadRevealOnArrival();
    void reveal();
  }, [reveal]);

  const restartSettleTimer = useCallback(() => {
    const pending = pendingRevealRef.current;
    if (!pending) return;
    window.clearTimeout(pending.settleTimerId);
    pending.settleTimerId = window.setTimeout(finishPendingReveal, SETTLE_AFTER_NAVIGATION_MS);
  }, [finishPendingReveal]);

  const coverAndNavigate = useCallback(
    async (href: string, options: CoverAndNavigateOptions = {}) => {
      const navigate = () => (options.replace ? router.replace(href) : router.push(href));
      if (!canvasRef.current || prefersReducedMotion()) {
        await options.beforeNavigate?.();
        navigate();
        return;
      }

      const startPathname = window.location.pathname;
      await cover(options.origin);

      if (options.beforeNavigate) {
        try {
          await options.beforeNavigate();
        } catch (error) {
          await reveal();
          throw error;
        }
      }

      // If the auth step above remounted this provider (hard navigation or layout swap),
      // the new instance finds this flag and opens from a covered state instead of flashing.
      markHexLoadRevealOnArrival();
      navigate();

      pendingRevealRef.current = {
        startPathname,
        settleTimerId: 0,
        fallbackTimerId: window.setTimeout(finishPendingReveal, NAVIGATION_FALLBACK_REVEAL_MS),
      };
      // The route may already have moved under the cover (auth bounce, same-path navigation).
      if (window.location.pathname !== startPathname || new URL(href, window.location.href).pathname === startPathname) {
        restartSettleTimer();
      }
    },
    [cover, reveal, router, finishPendingReveal, restartSettleTimer],
  );

  useEffect(() => {
    const pending = pendingRevealRef.current;
    if (!pending || pathname === pending.startPathname) return;
    restartSettleTimer();
  }, [pathname, restartSettleTimer]);

  // The storage flag is read once into a ref so React Strict Mode's second effect run
  // (after the simulated unmount destroys the first animation) can still play the reveal.
  const arrivalRevealPendingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (arrivalRevealPendingRef.current === null) {
      arrivalRevealPendingRef.current = consumeRevealOnArrivalFlag();
    }
    if (!arrivalRevealPendingRef.current || prefersReducedMotion()) return;
    const animation = getAnimation();
    if (!animation) return;
    showCanvas();
    animation.coverInstantly();
    const revealTimerId = window.setTimeout(() => {
      arrivalRevealPendingRef.current = false;
      void reveal();
    }, HOLD_BEFORE_ARRIVAL_REVEAL_MS);

    return () => {
      window.clearTimeout(revealTimerId);
      animationRef.current?.destroy();
      animationRef.current = null;
      hideCanvas();
    };
  }, [getAnimation, showCanvas, hideCanvas, reveal]);

  useEffect(() => {
    return () => {
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, []);

  const api = useMemo<HexLoadTransitionApi>(
    () => ({ coverAndNavigate, cover, reveal }),
    [coverAndNavigate, cover, reveal],
  );

  return (
    <HexLoadTransitionContext.Provider value={api}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] h-full w-full"
        style={{ visibility: "hidden" }}
      />
    </HexLoadTransitionContext.Provider>
  );
}

/** Outside a provider this degrades to a plain navigation, so callers never need to guard. */
export function useHexLoadTransition(): HexLoadTransitionApi {
  const context = useContext(HexLoadTransitionContext);
  const router = useRouter();
  return useMemo<HexLoadTransitionApi>(() => {
    if (context) return context;
    return {
      coverAndNavigate: async (href, options) => {
        if (options?.replace) router.replace(href);
        else router.push(href);
      },
      cover: async () => undefined,
      reveal: async () => undefined,
    };
  }, [context, router]);
}
