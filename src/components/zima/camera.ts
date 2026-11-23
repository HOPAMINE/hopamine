/**
 * Camera logic for the globe. No React in here: pure math plus MapLibre calls,
 * so it can be tested and reused without mounting a component. Globe.tsx is
 * the thin adapter that wires these into a React lifecycle.
 */
import type { Map as MapLibreMap } from "maplibre-gl";

export type GlobeView = {
  center: [number, number];
  zoom: number;
  /** Camera tilt in degrees. Omit to keep the current tilt. */
  pitch?: number;
  /** Compass rotation in degrees. Omit to keep the current bearing. */
  bearing?: number;
};

/** Start centred on the US with the whole globe in frame. */
export const INITIAL_CENTER: [number, number] = [-98, 39];
/** Fraction of the shorter viewport side the globe should span on load. */
const GLOBE_FILL = 0.9;
/** Measured sphere diameter in CSS px at zoom 2. It doubles per zoom level. */
const GLOBE_DIAMETER_AT_ZOOM_2 = 600;
/** Used when the container has no measurable size yet (a phone-sized globe). */
const FALLBACK_ZOOM = 1.2;

/** Idle rotation speed. Land drifts left. One turn takes 360 / this many seconds. */
const SPIN_DEG_PER_SEC = 2;
/**
 * Above this zoom the sphere no longer reads as a globe: the idle spin stops,
 * and a flight uses MapLibre's own arc instead of the spin-and-dive.
 */
export const GLOBE_MAX_ZOOM = 4;
/** Resume spinning this long after the user last touched the map. */
const SPIN_RESUME_MS = 4000;

/** Fraction of the flight spent spinning; the zoom-in takes the remainder. */
const SPIN_PHASE = 0.55;

/** Map events that mean the user wants control back. */
const INPUT_EVENTS = ["mousedown", "touchstart", "wheel"] as const;

/** Pointer going down on and coming off the map. */
const HOLD_START_EVENTS = ["mousedown", "touchstart"] as const;
const HOLD_END_EVENTS = ["mouseup", "touchend", "touchcancel"] as const;

/** Keeps longitude in [-180, 180) so tile cache keys stay at wrap 0. */
export const wrapLng = (lng: number) =>
  ((((lng + 180) % 360) + 360) % 360) - 180;

/** Shortest eastward angle from `from` to `to`, in [0, 360). */
const forwardLng = (from: number, to: number) =>
  (((to - from) % 360) + 360) % 360;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** How long a click on a marker takes to settle on that place. */
const DIVE_MS = 1600;

/**
 * Glide the camera onto a point and zoom in. Stays at least a step closer than
 * the current zoom, and never zooms back out. A click during the glide takes
 * over, the same way a drag does.
 */
export function easeToPlace(
  map: MapLibreMap,
  center: [number, number],
  zoom: number,
  maxZoom: number,
): void {
  const current = map.getZoom();
  const next = Math.min(maxZoom, Math.max(zoom, current + 0.6));
  const delta = next - current;
  map.stop();
  map.easeTo({
    center,
    zoom: next,
    duration: Math.round(Math.min(DIVE_MS, Math.max(650, delta * 220))),
    easing: easeInOutCubic,
    essential: true,
  });
}

/** Zoom at which the sphere spans `fill` of the container's shorter side. */
export function fitGlobeZoom(el: HTMLElement, fill = GLOBE_FILL): number {
  const side = Math.min(el.clientWidth, el.clientHeight);
  const zoom = 2 + Math.log2((fill * side) / GLOBE_DIAMETER_AT_ZOOM_2);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : FALLBACK_ZOOM;
}

export type FlightOptions = {
  /** Spin plus dive time. */
  durationMs?: number;
  /** Full extra revolutions before the dive. */
  extraTurns?: number;
  /**
   * Zoom to ease back to during the spin, normally the fitted globe zoom. Lets
   * a flight that starts slightly zoomed in still open with the whole sphere.
   * Defaults to the current zoom.
   */
  spinZoom?: number;
  /** Fires exactly once: `true` on landing, `false` if cancelled. */
  onDone?: (landed: boolean) => void;
};

/**
 * Picks the flight for the current zoom: the spin-and-dive while the sphere
 * still reads as a globe, MapLibre's own arc once zoomed in past that.
 */
export function flyToView(
  map: MapLibreMap,
  view: GlobeView,
  opts: FlightOptions = {},
): () => void {
  return map.getZoom() > GLOBE_MAX_ZOOM
    ? arcTo(map, view, opts)
    : spinTo(map, view, opts);
}

/**
 * MapLibre's built-in flyTo: zooms out along an arc and back in, duration from
 * the distance. Same cancel and onDone contract as spinTo.
 */
function arcTo(
  map: MapLibreMap,
  view: GlobeView,
  { onDone }: FlightOptions,
): () => void {
  let done = false;
  const finish = (landed: boolean) => {
    if (done) return;
    done = true;
    map.off("moveend", land);
    INPUT_EVENTS.forEach((e) => map.off(e, cancel));
    onDone?.(landed);
  };
  const land = () => finish(true);
  const cancel = () => {
    map.stop();
    finish(false);
  };

  INPUT_EVENTS.forEach((e) => map.on(e, cancel));
  map.once("moveend", land);
  map.flyTo({
    center: view.center,
    zoom: view.zoom,
    pitch: view.pitch,
    bearing: view.bearing,
  });
  return cancel;
}

/**
 * Animates the camera to `view`, adding `extraTurns` full revolutions of
 * longitude in the idle-spin direction so the globe visibly spins on the way.
 * Drives the camera frame by frame, which sidesteps MapLibre's shortest-path
 * longitude normalisation in flyTo. Any user input cancels the flight. Returns
 * a cancel function.
 */
export function spinTo(
  map: MapLibreMap,
  view: GlobeView,
  { durationMs = 3500, extraTurns = 1, spinZoom, onDone }: FlightOptions = {},
): () => void {
  const start = map.getCenter();
  const startZoom = map.getZoom();
  const midZoom = spinZoom ?? startZoom;
  const startPitch = map.getPitch();
  const startBearing = map.getBearing();
  const endPitch = view.pitch ?? startPitch;
  const endBearing = view.bearing ?? startBearing;
  const [endLng, endLat] = view.center;
  const totalLng = forwardLng(start.lng, endLng) + 360 * extraTurns;
  const t0 = performance.now();
  let frame = 0;
  let done = false;

  const finish = (landed: boolean) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    INPUT_EVENTS.forEach((e) => map.off(e, cancel));
    onDone?.(landed);
  };
  const cancel = () => finish(false);

  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / durationMs);
    // Two phases: the globe spins to the target longitude (easing back out to
    // midZoom if it started zoomed in), then the camera dives straight down.
    const e = easeInOutCubic(Math.min(1, t / SPIN_PHASE));
    const z = easeInOutCubic(Math.max(0, (t - SPIN_PHASE) / (1 - SPIN_PHASE)));
    const spinPhaseZoom = startZoom + (midZoom - startZoom) * e;
    map.jumpTo({
      center: [
        wrapLng(start.lng + totalLng * e),
        start.lat + (endLat - start.lat) * e,
      ],
      zoom: spinPhaseZoom + (view.zoom - midZoom) * z,
      pitch: startPitch + (endPitch - startPitch) * z,
      bearing: startBearing + (endBearing - startBearing) * z,
    });
    if (t < 1) frame = requestAnimationFrame(tick);
    else finish(true);
  };

  INPUT_EVENTS.forEach((e) => map.on(e, cancel));
  frame = requestAnimationFrame(tick);
  return cancel;
}

/**
 * Reports whether the user has hold of the map: `true` on the first touch or
 * mouse-down, `false` once the pointer lifts and any fling inertia has
 * settled. Programmatic flights never count. Chrome that should get out of
 * the way while the map is being moved listens to this. Returns a cleanup
 * function.
 */
export function watchMapHold(
  map: MapLibreMap,
  onChange: (held: boolean) => void,
): () => void {
  let pointerDown = false;
  let held = false;

  const emit = (next: boolean) => {
    if (held === next) return;
    held = next;
    onChange(next);
  };
  // After the pointer lifts, wait out inertia; a new press before it ends
  // keeps the hold (the stale moveend then finds pointerDown true and stops).
  const settle = () => {
    if (pointerDown) return;
    if (map.isMoving()) map.once("moveend", settle);
    else emit(false);
  };
  const down = () => {
    pointerDown = true;
    emit(true);
  };
  const up = () => {
    pointerDown = false;
    settle();
  };

  HOLD_START_EVENTS.forEach((e) => map.on(e, down));
  HOLD_END_EVENTS.forEach((e) => map.on(e, up));
  return () => {
    HOLD_START_EVENTS.forEach((e) => map.off(e, down));
    HOLD_END_EVENTS.forEach((e) => map.off(e, up));
    map.off("moveend", settle);
  };
}

/**
 * Slowly rotates the globe while idle. Pauses on user input or while
 * `isBusy()` is true, resumes after SPIN_RESUME_MS, and never runs when zoomed
 * in or when the user prefers reduced motion. Returns a cleanup function.
 */
export function startSpin(map: MapLibreMap, isBusy: () => boolean): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return () => {};

  let paused = false;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let last = performance.now();

  const tick = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    if (!paused && !isBusy() && map.getZoom() < GLOBE_MAX_ZOOM) {
      const { lng, lat } = map.getCenter();
      map.setCenter([wrapLng(lng + SPIN_DEG_PER_SEC * dt), lat]);
    }
    frame = requestAnimationFrame(tick);
  };

  const pause = () => {
    paused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      paused = false;
      last = performance.now();
    }, SPIN_RESUME_MS);
  };

  INPUT_EVENTS.forEach((e) => map.on(e, pause));
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(resumeTimer);
    INPUT_EVENTS.forEach((e) => map.off(e, pause));
  };
}
