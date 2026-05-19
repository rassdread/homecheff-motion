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
  if (
    typeof o.x !== "number" ||
    typeof o.y !== "number" ||
    typeof o.width !== "number" ||
    typeof o.height !== "number"
  ) {
    return null;
  }
  const width = Math.min(1, Math.max(0.1, o.width));
  const height = Math.min(1, Math.max(0.08, o.height));
  return {
    x: clamp01(o.x),
    y: clamp01(o.y),
    width,
    height,
  };
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
