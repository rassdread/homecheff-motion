export const PHOTO_VIDEO_FONTS = ["modern", "strong", "elegant", "playful", "classic", "script"] as const;
export type PhotoVideoFontId = (typeof PHOTO_VIDEO_FONTS)[number];

export const PHOTO_VIDEO_ALIGNS = ["left", "center", "right"] as const;
export type PhotoVideoAlign = (typeof PHOTO_VIDEO_ALIGNS)[number];

export const PHOTO_VIDEO_BACKGROUNDS = ["none", "dark", "light"] as const;
export type PhotoVideoTextBackground = (typeof PHOTO_VIDEO_BACKGROUNDS)[number];

/** Web-safe / already-loaded stacks. No extra font package. */
export const PHOTO_VIDEO_FONT_STACK: Record<PhotoVideoFontId, string> = {
  modern: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  strong: "Arial Black, Arial, ui-sans-serif, sans-serif",
  elegant: "Georgia, 'Times New Roman', Times, serif",
  playful: "Trebuchet MS, ui-rounded, sans-serif",
  classic: "'Times New Roman', Times, serif",
  script: "cursive",
};

export const PHOTO_VIDEO_FONT_WEIGHT: Record<PhotoVideoFontId, number> = {
  modern: 700,
  strong: 900,
  elegant: 600,
  playful: 700,
  classic: 700,
  script: 600,
};

export const PHOTO_VIDEO_TEXT_COLORS = [
  "#FFFFFF",
  "#041428",
  "#006D52",
  "#0067B1",
  "#F4C542",
  "#E11D48",
] as const;

export const PHOTO_VIDEO_DEFAULT_TEXT_COLOR = "#FFFFFF";
export const PHOTO_VIDEO_DEFAULT_FONT: PhotoVideoFontId = "modern";
export const PHOTO_VIDEO_DEFAULT_ALIGN: PhotoVideoAlign = "center";
export const PHOTO_VIDEO_DEFAULT_BACKGROUND: PhotoVideoTextBackground = "dark";
export const PHOTO_VIDEO_TEXT_SIZE_MIN = 1;
export const PHOTO_VIDEO_TEXT_SIZE_MAX = 8;
export const PHOTO_VIDEO_DEFAULT_TEXT_SIZE = 4;
export const PHOTO_VIDEO_MAX_OVERLAYS = 24;
export const PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO = 4;
export const PHOTO_VIDEO_TEXT_MAX_CHARS = 80;

export type PhotoVideoTextOverlay = {
  id: string;
  photoId: string;
  text: string;
  /** Anchor 0..1 across canvas width. */
  x: number;
  /** Anchor 0..1 across canvas height. */
  y: number;
  /** 1–8 user size, mapped to font scale. */
  size: number;
  color: string;
  font: PhotoVideoFontId;
  align: PhotoVideoAlign;
  background: PhotoVideoTextBackground;
};

export function createTextOverlay(input: {
  id: string;
  photoId: string;
  text?: string;
  x?: number;
  y?: number;
}): PhotoVideoTextOverlay {
  return {
    id: input.id,
    photoId: input.photoId,
    text: (input.text ?? "").slice(0, PHOTO_VIDEO_TEXT_MAX_CHARS),
    x: input.x ?? 0.5,
    y: input.y ?? 0.22,
    size: PHOTO_VIDEO_DEFAULT_TEXT_SIZE,
    color: PHOTO_VIDEO_DEFAULT_TEXT_COLOR,
    font: PHOTO_VIDEO_DEFAULT_FONT,
    align: PHOTO_VIDEO_DEFAULT_ALIGN,
    background: PHOTO_VIDEO_DEFAULT_BACKGROUND,
  };
}

export function fontSizePx(size: number, canvasMinEdge: number): number {
  const clamped = Math.max(PHOTO_VIDEO_TEXT_SIZE_MIN, Math.min(PHOTO_VIDEO_TEXT_SIZE_MAX, size));
  const t = (clamped - PHOTO_VIDEO_TEXT_SIZE_MIN) / (PHOTO_VIDEO_TEXT_SIZE_MAX - PHOTO_VIDEO_TEXT_SIZE_MIN);
  return Math.round(canvasMinEdge * (0.035 + t * 0.09));
}

export type OverlayBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Keep the overlay inside the canvas and off the bottom-right watermark.
 * Coordinates are normalized 0..1.
 */
export function clampOverlayPosition(x: number, y: number): { x: number; y: number } {
  const pad = 0.08;
  const nx = Math.max(pad, Math.min(1 - pad, x));
  const ny = Math.max(pad, Math.min(1 - pad, y));
  if (nx > 0.72 && ny > 0.78) {
    return { x: 0.72, y: ny };
  }
  return { x: nx, y: ny };
}

export function nudgeOverlay(overlay: PhotoVideoTextOverlay, dx: number, dy: number): PhotoVideoTextOverlay {
  const next = clampOverlayPosition(overlay.x + dx, overlay.y + dy);
  return { ...overlay, x: next.x, y: next.y };
}

export function overlayVisibleForPhoto(
  overlay: PhotoVideoTextOverlay,
  activePhotoId: string | null
): boolean {
  return Boolean(activePhotoId) && overlay.photoId === activePhotoId;
}

export function clientPointToNormalized(input: {
  clientX: number;
  clientY: number;
  rectLeft: number;
  rectTop: number;
  rectWidth: number;
  rectHeight: number;
}): { x: number; y: number } {
  if (input.rectWidth <= 0 || input.rectHeight <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: (input.clientX - input.rectLeft) / input.rectWidth,
    y: (input.clientY - input.rectTop) / input.rectHeight,
  };
}

export function hitTestLayouts(
  layouts: Array<{ id: string } & OverlayBox>,
  x: number,
  y: number
): string | null {
  for (let i = layouts.length - 1; i >= 0; i -= 1) {
    const box = layouts[i]!;
    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      return box.id;
    }
  }
  return null;
}

export function overlayCollidesWatermark(x: number, y: number): boolean {
  return x > 0.72 && y > 0.78;
}
