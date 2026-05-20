import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import type { LockedTextAlign } from "@/lib/locked-text-layer";

/** Post-render visual integration style for reprojected text. */
export type OverlayStyle =
  | "exact"
  | "cinematic"
  | "social-ui"
  | "floating"
  | "soft-glow"
  | "kinetic";

export const OVERLAY_STYLES: readonly OverlayStyle[] = [
  "exact",
  "cinematic",
  "social-ui",
  "floating",
  "soft-glow",
  "kinetic",
] as const;

/** How Instant Premium preserves typography through the pipeline. */
export type TextRenderMode =
  | "ai_protection"
  | "hybrid_overlay"
  | "exact_freeze"
  | "none";

export const TEXT_RENDER_MODES: readonly TextRenderMode[] = [
  "ai_protection",
  "hybrid_overlay",
  "exact_freeze",
  "none",
] as const;

export const DEFAULT_TEXT_RENDER_MODE: TextRenderMode = "hybrid_overlay";
export const DEFAULT_OVERLAY_STYLE: OverlayStyle = "cinematic";

export type Point2D = { x: number; y: number };

/** High-res texture patch for pixel-preserved reprojection (DeeVid-style). */
export type TextPatch = {
  id: string;
  text: string;
  polygon: Point2D[];
  bbox: BakedTextMaskRegion;
  patchUrl: string;
  patchWidth: number;
  patchHeight: number;
  padding: number;
  zIndex: number;
  confidence: number;
  fontInfo?: { family?: string; weight?: number };
  colorInfo?: { text?: string; background?: string };
  sourceImageOrder?: number;
};

export type ImageTextPatchesSnapshot = {
  version: 1;
  patches: TextPatch[];
};

export type DetectedTextBlock = {
  id: string;
  text: string;
  bbox: BakedTextMaskRegion;
  rotation?: number;
  fontFamilyEstimate?: string;
  fontWeightEstimate?: number;
  textColor?: string;
  backgroundColor?: string;
  alignment?: LockedTextAlign;
  zIndex?: number;
  confidence: number;
  imageWidth?: number;
  imageHeight?: number;
};

export type HybridTextBlockMetadata = DetectedTextBlock & {
  sourceImageId?: string;
  editedText?: string;
  blockType?: string;
};

export type ProjectDetectedTextSnapshot = {
  version: 1;
  capturedAt: string;
  blocks: HybridTextBlockMetadata[];
};

export type TrackingMode =
  | "homography"
  | "affine"
  | "optical_flow"
  | "perspective_reprojection"
  | "affine_transform"
  | "static_overlay"
  | "freeze_region";

export type TextTrackingMode = "homography" | "affine" | "optical_flow" | "static" | "freeze";

export const HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK = `SCENE MOTION ONLY:
- Do not generate readable typography, UI text, captions, subtitles, logos, watermarks, or letters.
- Do not invent, restore, translate, or rewrite text in cleaned regions.
- Animate only environment, subjects, lighting, camera movement, depth, and particles.
- Keep cleaned text regions as neutral texture without readable characters.`;

export function isTextRenderMode(value: string): value is TextRenderMode {
  return (TEXT_RENDER_MODES as readonly string[]).includes(value);
}

export function isOverlayStyle(value: string): value is OverlayStyle {
  return (OVERLAY_STYLES as readonly string[]).includes(value);
}

export function normalizeTextRenderMode(value: unknown): TextRenderMode {
  if (typeof value === "string" && isTextRenderMode(value)) {
    return value;
  }
  return DEFAULT_TEXT_RENDER_MODE;
}

export function normalizeOverlayStyle(value: unknown): OverlayStyle {
  if (typeof value === "string" && isOverlayStyle(value)) {
    return value;
  }
  return DEFAULT_OVERLAY_STYLE;
}

export function usesHybridPreAiNeutralize(mode: TextRenderMode): boolean {
  return mode === "hybrid_overlay" || mode === "exact_freeze" || mode === "ai_protection";
}

export function usesHybridPostReprojection(mode: TextRenderMode): boolean {
  return mode === "hybrid_overlay" || mode === "exact_freeze";
}

export function usesPixelPreservedPatches(mode: TextRenderMode): boolean {
  return mode === "hybrid_overlay";
}

export function bboxToPolygon(bbox: BakedTextMaskRegion): Point2D[] {
  const { x, y, width, height } = bbox;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function parseImageTextPatches(raw: unknown): ImageTextPatchesSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.patches)) {
    return null;
  }
  return { version: 1, patches: o.patches as TextPatch[] };
}

export function collectProjectTextPatches(
  images: Array<{ order: number; instantTextPatches?: unknown }>
): TextPatch[] {
  const all: TextPatch[] = [];
  for (const image of images) {
    const snap = parseImageTextPatches(image.instantTextPatches);
    if (!snap) continue;
    for (const patch of snap.patches) {
      all.push({ ...patch, sourceImageOrder: image.order, zIndex: patch.zIndex ?? image.order + 1 });
    }
  }
  return all.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

export function shouldMaskForVidu(mode: TextRenderMode): boolean {
  return mode !== "none";
}

export function parseProjectDetectedTextMetadata(raw: unknown): ProjectDetectedTextSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.blocks)) {
    return null;
  }
  return {
    version: 1,
    capturedAt: typeof o.capturedAt === "string" ? o.capturedAt : new Date().toISOString(),
    blocks: o.blocks as HybridTextBlockMetadata[],
  };
}
