/**
 * S.7E — Translation quality modes + Translation Studio contract.
 * Overlay/language-export only — NOT dubbing.
 */

export const STUDIO_TRANSLATION_QUALITIES = [
  "formal",
  "informal",
  "marketing",
  "literal",
  "creative",
  "brand_safe",
  "technical",
  "regional",
] as const;

export type StudioTranslationQuality = (typeof STUDIO_TRANSLATION_QUALITIES)[number];

export function isStudioTranslationQuality(
  value: string | null | undefined
): value is StudioTranslationQuality {
  return Boolean(value && (STUDIO_TRANSLATION_QUALITIES as readonly string[]).includes(value));
}

export function normalizeStudioTranslationQuality(
  value: string | null | undefined,
  fallback: StudioTranslationQuality = "literal"
): StudioTranslationQuality {
  const raw = (value ?? "").trim().toLowerCase().replace(/-/g, "_");
  return isStudioTranslationQuality(raw) ? raw : fallback;
}

export type StudioTranslationStudioContract = {
  version: "7e.1";
  sourceLanguage: string;
  targetLanguage: string | null;
  quality: StudioTranslationQuality;
  mode: "overlay_export";
  /** Explicit product honesty */
  isDubbing: false;
  isLipSync: false;
  reuse: { reuseWithoutRegeneration: true };
  review: {
    status: "draft" | "approved" | "brand_approved" | "unknown";
  };
};

export function buildTranslationStudio(input: {
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
  quality?: string | null;
  reviewStatus?: "draft" | "approved" | "brand_approved" | null;
}): StudioTranslationStudioContract {
  return {
    version: "7e.1",
    sourceLanguage: (input.sourceLanguage ?? "en").trim().toLowerCase().slice(0, 2) || "en",
    targetLanguage: input.targetLanguage?.trim().toLowerCase().slice(0, 2) || null,
    quality: normalizeStudioTranslationQuality(input.quality, "literal"),
    mode: "overlay_export",
    isDubbing: false,
    isLipSync: false,
    reuse: { reuseWithoutRegeneration: true },
    review: { status: input.reviewStatus ?? "unknown" },
  };
}
