/**
 * Presentation product foundation — overlays, branding, exports.
 * Standalone from Studio; accepts uploaded MP4 or Motion output.
 */

export const PRESENTATION_FEATURE_IDS = [
  "subtitles",
  "subtitle_editing",
  "multilingual_captions",
  "text_overlays",
  "titles",
  "lower_thirds",
  "cta_screens",
  "branding",
  "logo_placement",
  "language_versions",
  "safe_area_validation",
  "export_presets",
  "watermarks",
  "brand_kits",
] as const;

export type PresentationFeatureId = (typeof PRESENTATION_FEATURE_IDS)[number];

export const PRESENTATION_PLATFORM_PRESETS = [
  "tiktok",
  "instagram",
  "youtube_shorts",
  "facebook",
  "linkedin",
  "custom",
] as const;

export type PresentationPlatformPreset = (typeof PRESENTATION_PLATFORM_PRESETS)[number];

export type PresentationInputSource = "video_upload" | "motion_output";

export const PRESENTATION_WORKFLOW_STEP_IDS = [
  "video_upload",
  "speech_analysis",
  "subtitles",
  "overlays",
  "branding",
  "exports",
] as const;

export type PresentationWorkflowStepId = (typeof PRESENTATION_WORKFLOW_STEP_IDS)[number];

export type PresentationSafeAreaSpec = {
  platform: PresentationPlatformPreset;
  titleSafePercent: number;
  actionSafePercent: number;
  subtitleZonePercent: number;
};

export type PresentationDeliverable = {
  id: string;
  sourceVideoUrl: string;
  platform: PresentationPlatformPreset;
  languageCode: string;
  featuresApplied: PresentationFeatureId[];
  exportUrl?: string;
};
