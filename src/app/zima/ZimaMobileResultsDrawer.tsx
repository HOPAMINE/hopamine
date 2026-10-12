"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type PanInfo,
} from "framer-motion";
import type { ZimaSearchResult } from "@/lib/zima/searchResults";
import { jetbrainsMono } from "../../../fonts";
import { ZimaSearchResultCards } from "./ZimaSearchResultCards";

type Props = {
  results: ZimaSearchResult[];
  loadingResults?: boolean;
  errorMessage?: string | null;
  cityLabel?: string;
  selectedResultId?: string | null;
  onSelectResult: (id: string) => void;
};

type Snap = "collapsed" | "start" | "peek" | "expanded";

type SnapOffsets = Record<Snap, number>;

const COLLAPSED_PX = 56;
const START_PX = 132;
const PEEK_FRACTION = 0.38;
const PEEK_MIN_PX = 200;
const DECELERATION_RATE = 0.998;
const SETTLE_SPRING = { type: "spring", stiffness: 400, damping: 40 } as const;
const DRAG_ELASTIC = 0.04;

const projectDistance = (velocityPxPerSec: number) =>
  (velocityPxPerSec / 1000) * (DECELERATION_RATE / (1 - DECELERATION_RATE));

function snapOffsets(height: number, viewport: number): SnapOffsets {
  const peek = Math.min(
    height,
    Math.max(PEEK_MIN_PX, Math.round(PEEK_FRACTION * viewport)),
  );
  return {
    expanded: 0,
    peek: height - peek,
    start: height - START_PX,
    collapsed: height - COLLAPSED_PX,
  };
}

function nearestSnap(offsets: SnapOffsets, offset: number): Snap {
  let best: Snap = "start";
  let bestDistance = Infinity;
  for (const snap of Object.keys(offsets) as Snap[]) {
    const distance = Math.abs(offsets[snap] - offset);
    if (distance < bestDistance) {
      best = snap;
      bestDistance = distance;
    }
  }
  return best;
}

function foundBuildersLabel(
  count: number,
  loadingResults: boolean,
  cityLabel: string,
) {
  if (loadingResults && count === 0) return `searching ${cityLabel}…`;
  const noun = count === 1 ? "builder" : "builders";
  return `we found ${count} ${noun}`;
}

/**
 * Draggable results sheet for mobile search: map stays visible above a
 * bottom drawer listing profiles and organizations.
 */
export function ZimaMobileResultsDrawer({
  results,
  loadingResults = false,
  errorMessage = null,
  cityLabel = "New York City",
  selectedResultId,
  onSelectResult,
}: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [snap, setSnap] = useState<Snap>("start");
  const [offsets, setOffsets] = useState<SnapOffsets | null>(null);
  const count = results.length;

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => {
      const height = el.offsetHeight;
      if (offsets === null) y.set(height);
      setOffsets(snapOffsets(height, window.innerHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const targetRef = useRef<number | null>(null);
  const settleTo = (offset: number, velocity = 0) => {
    animationRef.current?.stop();
    targetRef.current = offset;
    animationRef.current = animate(
      y,
      offset,
      reduceMotion ? { duration: 0 } : { ...SETTLE_SPRING, velocity },
    );
  };
  useEffect(() => () => animationRef.current?.stop(), []);

  const target = offsets ? offsets[snap] : null;
  useEffect(() => {
    if (target === null || targetRef.current === target) return;
    settleTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!offsets) return;
    const projected = y.get() + projectDistance(info.velocity.y);
    const next = nearestSnap(offsets, projected);
    settleTo(offsets[next], info.velocity.y);
    setSnap(next);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <motion.section
        ref={sheetRef}
        aria-label="Search results"
        className="pointer-events-auto absolute inset-x-0 bottom-0 top-0 flex flex-col rounded-t-[24px] border-t border-neutral-200/80 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
        style={{ y }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={
          offsets ? { top: offsets.expanded, bottom: offsets.collapsed } : undefined
        }
        dragElastic={DRAG_ELASTIC}
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Drag to resize results"
          onPointerDown={(e) => dragControls.start(e)}
          className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-3 px-4 pb-2 pt-3 active:cursor-grabbing"
        >
          <div className="h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
          <h2
            className={`${jetbrainsMono.className} w-full text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-900`}
          >
            {foundBuildersLabel(count, loadingResults, cityLabel)}
          </h2>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ZimaSearchResultCards
            results={results}
            loadingResults={loadingResults}
            errorMessage={errorMessage}
            cityLabel={cityLabel}
            selectedResultId={selectedResultId}
            onSelectResult={onSelectResult}
          />
        </div>
      </motion.section>
    </div>
  );
}
