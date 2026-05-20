/** Per-image baked-in text protection for Instant Premium (text in source photos). */

export type BakedTextProtectionStatus =
  | "none"
  | "detected"
  | "confirmed"
  | "masked"
  | "skipped";

export const BAKED_TEXT_PROTECTION_STATUSES: readonly BakedTextProtectionStatus[] = [
  "none",
  "detected",
  "confirmed",
  "masked",
  "skipped",
] as const;

/** Normalized 0–1 rectangle on the image frame. */
export type BakedTextMaskRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BakedTextProtectionInput = {
  /** User enabled protection for this upload. */
  enabled: boolean;
  /** Exact characters visible in the source image (required when enabled). */
  exactText?: string;
  /** Anchor Y for text band (0–1), used for mask + locked layer position. */
  positionY?: number;
  maskRegion?: BakedTextMaskRegion;
  status?: BakedTextProtectionStatus;
};

export const BAKED_TEXT_CLEANED_PROMPT_BLOCK = `BAKED-IN TEXT PROTECTION:
- The source image has text areas intentionally cleaned or blanked before animation.
- Do not invent signs, letters, labels, captions, subtitles, logos, or readable text.
- Do not attempt to restore, improve, translate, or rewrite removed text regions.
- Keep cleaned areas visually neutral and stable during motion.
- Final exact text will be rendered separately as locked overlay layers after generation.`;

export function isBakedTextProtectionStatus(value: string): value is BakedTextProtectionStatus {
  return (BAKED_TEXT_PROTECTION_STATUSES as readonly string[]).includes(value);
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}

export const MIN_MASK_PIXELS = 4;
export const MIN_MASK_NORMALIZED = 0.01;

export const BAKED_TEXT_MASK_BLOCKS_SKIPPED_WARNING_NL =
  "Sommige tekstblokken konden niet automatisch beschermd worden.";

export type MaskRegionPixels = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function isValidMaskScalar(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Normalized 0–1 mask region; null when width/height are zero, NaN, or out of bounds. */
export function normalizeMaskRegionNormalized(
  raw: Partial<BakedTextMaskRegion> | null | undefined
): BakedTextMaskRegion | null {
  if (!raw) {
    return null;
  }
  const x = raw.x;
  const y = raw.y;
  const width = raw.width;
  const height = raw.height;
  if (!isValidMaskScalar(x) || !isValidMaskScalar(y) || !isValidMaskScalar(width) || !isValidMaskScalar(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }

  let nx = Math.max(0, x);
  let ny = Math.max(0, y);
  let nw = width;
  let nh = height;

  if (nx >= 1 || ny >= 1) {
    return null;
  }

  nw = Math.min(nw, 1 - nx);
  nh = Math.min(nh, 1 - ny);
  if (nw <= 0 || nh <= 0) {
    return null;
  }

  const minNorm = MIN_MASK_NORMALIZED;
  if (nw < minNorm) {
    nx = Math.min(nx, 1 - minNorm);
    nw = Math.max(nw, minNorm);
  }
  if (nh < minNorm) {
    ny = Math.min(ny, 1 - minNorm);
    nh = Math.max(nh, minNorm);
  }
  if (nx + nw > 1) {
    nw = 1 - nx;
  }
  if (ny + nh > 1) {
    nh = 1 - ny;
  }
  if (nw < minNorm || nh < minNorm) {
    return null;
  }

  return { x: nx, y: ny, width: nw, height: nh };
}

/**
 * Pixel extract/crop box for sharp/FFmpeg — clamped inside the image with a minimum size.
 */
export function normalizeMaskRegion(
  region: BakedTextMaskRegion,
  imageWidth: number,
  imageHeight: number,
  options?: { minPx?: number }
): MaskRegionPixels | null {
  const minPx = options?.minPx ?? MIN_MASK_PIXELS;
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) {
    return null;
  }
  const iw = Math.max(1, Math.round(imageWidth));
  const ih = Math.max(1, Math.round(imageHeight));

  const norm = normalizeMaskRegionNormalized(region);
  if (!norm) {
    return null;
  }

  let left = Math.round(norm.x * iw);
  let top = Math.round(norm.y * ih);
  let width = Math.round(norm.width * iw);
  let height = Math.round(norm.height * ih);

  left = Math.max(0, Math.min(left, iw - 1));
  top = Math.max(0, Math.min(top, ih - 1));

  width = Math.max(minPx, width);
  height = Math.max(minPx, height);

  width = Math.min(width, iw - left);
  height = Math.min(height, ih - top);

  if (width < minPx || height < minPx) {
    return null;
  }

  left = Math.floor(left);
  top = Math.floor(top);
  width = Math.floor(width);
  height = Math.floor(height);

  if (width < minPx || height < minPx) {
    return null;
  }
  if (![left, top, width, height].every((n) => Number.isFinite(n) && n >= 0)) {
    return null;
  }

  return { left, top, width, height };
}

export function logInvalidMaskRegion(params: {
  imageIndex: number;
  ocrText?: string;
  rawBbox: unknown;
  normalizedBbox: BakedTextMaskRegion | null;
  imageWidth: number;
  imageHeight: number;
}): void {
  console.warn(
    "[mask-region-invalid]",
    JSON.stringify({
      imageIndex: params.imageIndex,
      ocrText: params.ocrText?.slice(0, 120),
      rawBbox: params.rawBbox,
      normalizedBbox: params.normalizedBbox,
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
    })
  );
}

/** Default band covering typical title/caption placement. */
export function defaultMaskRegionForTextPosition(positionY: number): BakedTextMaskRegion {
  const height = 0.22;
  const width = 0.94;
  const y = clamp01(positionY) - height / 2;
  return {
    x: (1 - width) / 2,
    y: Math.max(0, Math.min(1 - height, y)),
    width,
    height,
  };
}

export function parseBakedTextMaskRegion(value: unknown): BakedTextMaskRegion | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  return normalizeMaskRegionNormalized({
    x: o.x as number,
    y: o.y as number,
    width: o.width as number,
    height: o.height as number,
  });
}

export function parseBakedTextProtectionInput(value: unknown): BakedTextProtectionInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (o.enabled !== true) {
    return { enabled: false, status: "none" };
  }
  const exactText = typeof o.exactText === "string" ? o.exactText : "";
  const positionY = typeof o.positionY === "number" ? clamp01(o.positionY) : 0.12;
  const maskRegion = parseBakedTextMaskRegion(o.maskRegion) ?? defaultMaskRegionForTextPosition(positionY);
  const status =
    typeof o.status === "string" && isBakedTextProtectionStatus(o.status) ? o.status : "confirmed";
  return {
    enabled: true,
    exactText,
    positionY,
    maskRegion,
    status,
  };
}

export function projectUsesBakedTextProtection(
  images: Array<{ hasBakedText?: boolean; bakedTextProtectionStatus?: string | null }>
): boolean {
  return images.some(
    (img) =>
      img.hasBakedText === true ||
      img.bakedTextProtectionStatus === "masked" ||
      img.bakedTextProtectionStatus === "confirmed"
  );
}
