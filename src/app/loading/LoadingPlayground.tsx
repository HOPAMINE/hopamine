"use client";

import { useEffect, useRef, useState } from "react";
import { jetbrainsMono } from "../../../fonts";
import {
  createHexLoadAnimation,
  type HexLoadAnimation,
  type HexLoadOrigin,
} from "@/components/zima/hexload/hexLoadAnimation";

const HOLD_BEFORE_REVEAL_MS = 700;
const MARK_FADE_MS = 420;
const MARK_APPEAR_DELAY_MS = 280;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LoadingPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<HexLoadAnimation | null>(null);
  const playingRef = useRef(false);
  const [markVisible, setMarkVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animation = createHexLoadAnimation(canvas, {
      showCenterMark: false,
    });
    animationRef.current = animation;
    let cancelled = false;

    async function play(origin?: HexLoadOrigin) {
      if (cancelled || playingRef.current || prefersReducedMotion()) return;
      playingRef.current = true;
      setMarkVisible(false);
      canvas.style.visibility = "visible";
      try {
        const covered = animation.cover(origin);
        await new Promise((resolve) => window.setTimeout(resolve, MARK_APPEAR_DELAY_MS));
        if (!cancelled) setMarkVisible(true);
        await covered;
        await new Promise((resolve) => window.setTimeout(resolve, HOLD_BEFORE_REVEAL_MS));
        if (cancelled) return;
        setMarkVisible(false);
        await animation.reveal();
      } finally {
        if (!cancelled) {
          canvas.style.visibility = "hidden";
          setMarkVisible(false);
        }
        playingRef.current = false;
      }
    }

    void play();

    function onPointerDown(event: PointerEvent) {
      void play({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelled = true;
      playingRef.current = false;
      window.removeEventListener("pointerdown", onPointerDown);
      animation.destroy();
      animationRef.current = null;
    };
  }, []);

  return (
    <main className="flex h-dvh w-full items-center justify-center bg-white text-neutral-900">
      {markVisible ? null : (
        <p className="font-mono text-sm tracking-wide text-neutral-500">
          Click anywhere to replay the hex load
        </p>
      )}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] h-full w-full opacity-90"
        style={{ visibility: "hidden" }}
      />
      <p
        className={`${jetbrainsMono.className} pointer-events-none fixed top-1/2 left-1/2 z-[210] -translate-x-1/2 -translate-y-1/2 text-7xl leading-none font-black text-white transition-opacity ease-out ${markVisible ? "opacity-100" : "opacity-0"}`}
        style={{ letterSpacing: "-0.02em", transitionDuration: `${MARK_FADE_MS}ms` }}
      >
        zima
      </p>
    </main>
  );
}
