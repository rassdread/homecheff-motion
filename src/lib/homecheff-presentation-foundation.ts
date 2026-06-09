import {
  PRESENTATION_FEATURE_IDS,
  PRESENTATION_PLATFORM_PRESETS,
  type PresentationFeatureId,
  type PresentationPlatformPreset,
  type PresentationSafeAreaSpec,
} from "@/types/homecheff-presentation-suite";

export { PRESENTATION_FEATURE_IDS, PRESENTATION_PLATFORM_PRESETS };

export const PRESENTATION_SAFE_AREA_SPECS: PresentationSafeAreaSpec[] = [
  { platform: "tiktok", titleSafePercent: 88, actionSafePercent: 80, subtitleZonePercent: 22 },
  { platform: "instagram", titleSafePercent: 90, actionSafePercent: 85, subtitleZonePercent: 20 },
  { platform: "youtube_shorts", titleSafePercent: 90, actionSafePercent: 82, subtitleZonePercent: 24 },
  { platform: "facebook", titleSafePercent: 92, actionSafePercent: 88, subtitleZonePercent: 18 },
  { platform: "linkedin", titleSafePercent: 94, actionSafePercent: 90, subtitleZonePercent: 16 },
  { platform: "custom", titleSafePercent: 100, actionSafePercent: 100, subtitleZonePercent: 20 },
];

export function resolveSafeAreaSpec(platform: PresentationPlatformPreset): PresentationSafeAreaSpec {
  return (
    PRESENTATION_SAFE_AREA_SPECS.find((s) => s.platform === platform) ??
    PRESENTATION_SAFE_AREA_SPECS[PRESENTATION_SAFE_AREA_SPECS.length - 1]
  );
}

export function presentationFeatureLabelKey(feature: PresentationFeatureId): string {
  return `suite.presentation.feature.${feature}`;
}

export function presentationPlatformLabelKey(platform: PresentationPlatformPreset): string {
  return `suite.presentation.platform.${platform}`;
}

/** Maps existing story overlay + hybrid overlay capabilities to presentation features */
export const PRESENTATION_FEATURE_IMPLEMENTATION_STATUS: Record<
  PresentationFeatureId,
  "wired" | "partial" | "foundation"
> = {
  subtitles: "partial",
  subtitle_editing: "foundation",
  multilingual_captions: "foundation",
  text_overlays: "wired",
  titles: "partial",
  lower_thirds: "foundation",
  cta_screens: "foundation",
  branding: "partial",
  logo_placement: "partial",
  language_versions: "foundation",
  safe_area_validation: "foundation",
  export_presets: "foundation",
  watermarks: "foundation",
  brand_kits: "foundation",
};
