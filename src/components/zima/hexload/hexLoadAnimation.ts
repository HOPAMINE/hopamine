export type HexLoadOrigin = { x: number; y: number };

export type HexLoadAnimationOptions = {
  centerLogoSrc?: string;
  centerLogoWidthPx?: number;
  centerLogoHeightPx?: number;
};

export type HexLoadAnimation = {
  /** Fills the screen with hexagons from `origin` (default: viewport centre). Resolves once fully covered. */
  cover(origin?: HexLoadOrigin): Promise<void>;
  /** Draws the fully covered state in one frame, for pages that mount already hidden behind the hexagons. */
  coverInstantly(): void;
  /** Flicker-flips the hexagons away. Waits for `cover` to finish first if it is still running. */
  reveal(): Promise<void>;
  destroy(): void;
};

type HexLoadPhase = "idle" | "covering" | "covered" | "revealing" | "finished";

type HexCell = {
  centerX: number;
  centerY: number;
  fillDelayMs: number;
  flipDelayMs: number;
  color: string;
};

const HEX_WIDTH_PX = 64;
const HEX_CIRCUMRADIUS_PX = HEX_WIDTH_PX / Math.sqrt(3);
const HEX_ROW_STEP_PX = HEX_CIRCUMRADIUS_PX * 2 * 0.75;
// Slight overlap hides antialiased seams between neighbouring polygons.
const HEX_SEAM_OVERLAP_SCALE = 1.03;
const BLUE_SHADES = ["#00a6f3", "#0ea5e9", "#0284c7", "#38bdf8", "#0369a1"];

const CENTER_HEX_CIRCUMRADIUS_PX = HEX_CIRCUMRADIUS_PX * 3.4;
const CENTER_HEX_COLOR = "#ffffff";

const FILL_WAVE_MS = 900;
const FILL_JITTER_MS = 120;
const FILL_HEX_MS = 380;
const CENTER_POP_START_MS = FILL_WAVE_MS + FILL_JITTER_MS + FILL_HEX_MS * 0.5;
const CENTER_POP_MS = 480;
export const HEX_LOAD_COVER_TOTAL_MS = CENTER_POP_START_MS + CENTER_POP_MS;

const FLIP_WAVE_MS = 700;
const FLIP_HEX_MS = 520;
// The centre hex waits until the last small hex has started leaving, then turns on its own slower clock.
const CENTER_TURN_DELAY_MS = FLIP_WAVE_MS + 200;
const CENTER_TURN_MS = 800;
export const HEX_LOAD_REVEAL_TOTAL_MS = Math.max(
  FLIP_WAVE_MS + FLIP_HEX_MS,
  CENTER_TURN_DELAY_MS + CENTER_TURN_MS,
);

const MAX_DEVICE_PIXEL_RATIO = 2;

// Built lazily: Path2D only exists in the browser, and this module is also evaluated during SSR.
let unitHexPath: Path2D | null = null;
function getUnitHexPath(): Path2D {
  if (unitHexPath) return unitHexPath;
  const path = new Path2D();
  for (let corner = 0; corner < 6; corner++) {
    const angle = (Math.PI / 180) * (60 * corner - 90);
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (corner === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  unitHexPath = path;
  return path;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function easeOutBack(progress: number): number {
  const overshoot = 1.70158;
  const shifted = progress - 1;
  return 1 + (overshoot + 1) * shifted * shifted * shifted + overshoot * shifted * shifted;
}

function easeInCubic(progress: number): number {
  return progress * progress * progress;
}

function easeInOutCubic(progress: number): number {
  if (progress < 0.5) return 4 * progress * progress * progress;
  const remaining = -2 * progress + 2;
  return 1 - (remaining * remaining * remaining) / 2;
}

// Three quick dips, then the flip-away.
function flickerOpacity(progress: number): number {
  if (progress < 0.12) return 1 - (progress / 0.12) * 0.85;
  if (progress < 0.24) return 0.15 + ((progress - 0.12) / 0.12) * 0.85;
  if (progress < 0.36) return 1 - ((progress - 0.24) / 0.12) * 0.7;
  if (progress < 0.48) return 0.3 + ((progress - 0.36) / 0.12) * 0.7;
  return 1 - easeInCubic((progress - 0.48) / 0.52);
}

function flickerFlipWidthScale(progress: number): number {
  if (progress < 0.48) return 1;
  return 1 - easeInCubic((progress - 0.48) / 0.52);
}

// Projected width of a flat shape turning 90° on its vertical axis.
function cleanTurnWidthScale(progress: number): number {
  return Math.cos(easeInOutCubic(progress) * (Math.PI / 2));
}

function buildHexGrid(
  viewportWidth: number,
  viewportHeight: number,
  origin: HexLoadOrigin,
): HexCell[] {
  const columnCount = Math.ceil(viewportWidth / HEX_WIDTH_PX) + 2;
  const rowCount = Math.ceil(viewportHeight / HEX_ROW_STEP_PX) + 2;
  const farthestDistance = Math.hypot(
    Math.max(origin.x, viewportWidth - origin.x),
    Math.max(origin.y, viewportHeight - origin.y),
  );
  const cells: HexCell[] = [];

  for (let row = 0; row < rowCount; row++) {
    const rowOffsetPx = row % 2 === 1 ? HEX_WIDTH_PX / 2 : 0;
    for (let column = 0; column < columnCount; column++) {
      const centerX = column * HEX_WIDTH_PX + rowOffsetPx - HEX_WIDTH_PX / 2;
      const centerY = row * HEX_ROW_STEP_PX - HEX_CIRCUMRADIUS_PX;
      const normalizedDistance =
        Math.hypot(centerX - origin.x, centerY - origin.y) / farthestDistance;

      cells.push({
        centerX,
        centerY,
        fillDelayMs: normalizedDistance * FILL_WAVE_MS + Math.random() * FILL_JITTER_MS,
        flipDelayMs: Math.random() * FLIP_WAVE_MS,
        color: BLUE_SHADES[Math.floor(Math.random() * BLUE_SHADES.length)],
      });
    }
  }

  return cells;
}

export function createHexLoadAnimation(
  canvas: HTMLCanvasElement,
  options: HexLoadAnimationOptions = {},
): HexLoadAnimation {
  const context = canvas.getContext("2d");
  const centerLogoWidthPx = options.centerLogoWidthPx ?? 0;
  const centerLogoHeightPx = options.centerLogoHeightPx ?? 0;
  const centerLogoImage = options.centerLogoSrc ? new Image() : null;
  if (centerLogoImage && options.centerLogoSrc) {
    // `coverInstantly` draws a single frame; repaint it once the logo arrives so the centre hex is not blank.
    centerLogoImage.onload = () => {
      if (phase === "covered") drawCoveringFrame(HEX_LOAD_COVER_TOTAL_MS);
    };
    centerLogoImage.src = options.centerLogoSrc;
  }

  let phase: HexLoadPhase = "idle";
  let phaseStartedAtMs = 0;
  let cells: HexCell[] = [];
  let viewportWidth = 0;
  let viewportHeight = 0;
  let devicePixelRatio = 1;
  let frameId = 0;
  let destroyed = false;
  let coveredListeners: Array<() => void> = [];
  let finishedListeners: Array<() => void> = [];

  function prepareCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    canvas.width = Math.round(viewportWidth * devicePixelRatio);
    canvas.height = Math.round(viewportHeight * devicePixelRatio);
  }

  function drawHex(
    centerX: number,
    centerY: number,
    radiusPx: number,
    widthScale: number,
    opacity: number,
    color: string,
  ) {
    if (!context) return;
    context.setTransform(
      devicePixelRatio * radiusPx * widthScale,
      0,
      0,
      devicePixelRatio * radiusPx,
      devicePixelRatio * centerX,
      devicePixelRatio * centerY,
    );
    context.globalAlpha = opacity;
    context.fillStyle = color;
    context.fill(getUnitHexPath());
  }

  function drawCenterHex(scale: number, widthScale: number, opacity: number) {
    if (!context || scale <= 0) return;
    const screenCenterX = viewportWidth / 2;
    const screenCenterY = viewportHeight / 2;
    drawHex(
      screenCenterX,
      screenCenterY,
      CENTER_HEX_CIRCUMRADIUS_PX * scale,
      widthScale,
      opacity,
      CENTER_HEX_COLOR,
    );
    if (!centerLogoImage?.complete || centerLogoImage.naturalWidth === 0) return;
    context.setTransform(
      devicePixelRatio * scale * widthScale,
      0,
      0,
      devicePixelRatio * scale,
      devicePixelRatio * screenCenterX,
      devicePixelRatio * screenCenterY,
    );
    context.drawImage(
      centerLogoImage,
      -centerLogoWidthPx / 2,
      -centerLogoHeightPx / 2,
      centerLogoWidthPx,
      centerLogoHeightPx,
    );
  }

  function clearCanvas() {
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawCoveringFrame(elapsedMs: number) {
    clearCanvas();
    for (const cell of cells) {
      const fillProgress = clamp01((elapsedMs - cell.fillDelayMs) / FILL_HEX_MS);
      if (fillProgress <= 0) continue;
      drawHex(
        cell.centerX,
        cell.centerY,
        HEX_CIRCUMRADIUS_PX * easeOutBack(fillProgress) * HEX_SEAM_OVERLAP_SCALE,
        1,
        clamp01(fillProgress / 0.6),
        cell.color,
      );
    }
    const centerPopProgress = clamp01((elapsedMs - CENTER_POP_START_MS) / CENTER_POP_MS);
    drawCenterHex(easeOutBack(centerPopProgress), 1, clamp01(centerPopProgress / 0.4));
  }

  function drawRevealingFrame(elapsedMs: number) {
    clearCanvas();
    for (const cell of cells) {
      const flipProgress = clamp01((elapsedMs - cell.flipDelayMs) / FLIP_HEX_MS);
      if (flipProgress >= 1) continue;
      drawHex(
        cell.centerX,
        cell.centerY,
        HEX_CIRCUMRADIUS_PX * HEX_SEAM_OVERLAP_SCALE,
        flickerFlipWidthScale(flipProgress),
        flickerOpacity(flipProgress),
        cell.color,
      );
    }
    const centerTurnProgress = clamp01((elapsedMs - CENTER_TURN_DELAY_MS) / CENTER_TURN_MS);
    if (centerTurnProgress < 1) {
      drawCenterHex(1, cleanTurnWidthScale(centerTurnProgress), 1);
    }
  }

  function notify(listeners: Array<() => void>) {
    for (const listener of listeners) listener();
  }

  function renderFrame(frameTimeMs: number) {
    if (destroyed) return;
    const elapsedMs = frameTimeMs - phaseStartedAtMs;

    if (phase === "covering") {
      if (elapsedMs >= HEX_LOAD_COVER_TOTAL_MS) {
        drawCoveringFrame(HEX_LOAD_COVER_TOTAL_MS);
        phase = "covered";
        const listeners = coveredListeners;
        coveredListeners = [];
        notify(listeners);
        return;
      }
      drawCoveringFrame(elapsedMs);
    } else if (phase === "revealing") {
      if (elapsedMs >= HEX_LOAD_REVEAL_TOTAL_MS) {
        clearCanvas();
        phase = "finished";
        const listeners = finishedListeners;
        finishedListeners = [];
        notify(listeners);
        return;
      }
      drawRevealingFrame(elapsedMs);
    } else {
      return;
    }

    frameId = requestAnimationFrame(renderFrame);
  }

  function startPhase(nextPhase: "covering" | "revealing") {
    cancelAnimationFrame(frameId);
    phase = nextPhase;
    phaseStartedAtMs = performance.now();
    frameId = requestAnimationFrame(renderFrame);
  }

  function beginReveal() {
    if (phase !== "covered") return;
    startPhase("revealing");
  }

  return {
    cover(origin) {
      prepareCanvas();
      cells = buildHexGrid(
        viewportWidth,
        viewportHeight,
        origin ?? { x: viewportWidth / 2, y: viewportHeight / 2 },
      );
      startPhase("covering");
      return new Promise((resolve) => coveredListeners.push(resolve));
    },

    coverInstantly() {
      cancelAnimationFrame(frameId);
      prepareCanvas();
      cells = buildHexGrid(viewportWidth, viewportHeight, {
        x: viewportWidth / 2,
        y: viewportHeight / 2,
      });
      phase = "covered";
      drawCoveringFrame(HEX_LOAD_COVER_TOTAL_MS);
    },

    reveal() {
      if (phase === "finished" || phase === "idle") return Promise.resolve();
      const finished = new Promise<void>((resolve) => finishedListeners.push(resolve));
      if (phase === "covered") beginReveal();
      else if (phase === "covering") coveredListeners.push(beginReveal);
      return finished;
    },

    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      coveredListeners = [];
      finishedListeners = [];
    },
  };
}
