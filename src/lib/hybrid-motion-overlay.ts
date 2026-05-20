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
  | "perspective_reprojection"
  | "affine_transform"
  | "static_overlay"
  | "freeze_region";

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
