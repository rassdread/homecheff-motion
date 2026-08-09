/**
 * S.7E — Structured subtitle styles (provider-neutral).
 * Fixed ASS StudioNarration remains the burn-in runtime; styles are planning metadata.
 */

export const STUDIO_SUBTITLE_STYLES = [
  "default",
  "minimal",
  "cinema",
  "documentary",
  "podcast",
  "commercial",
  "social",
  "accessibility",
  "brand",
] as const;

export type StudioSubtitleStyleId = (typeof STUDIO_SUBTITLE_STYLES)[number];

export function isStudioSubtitleStyleId(value: string | null | undefined): value is StudioSubtitleStyleId {
  return Boolean(value && (STUDIO_SUBTITLE_STYLES as readonly string[]).includes(value));
}

export function normalizeStudioSubtitleStyle(
  value: string | null | undefined,
  fallback: StudioSubtitleStyleId = "default"
): StudioSubtitleStyleId {
  const raw = (value ?? "").trim().toLowerCase();
  return isStudioSubtitleStyleId(raw) ? raw : fallback;
}

export type StudioSubtitleStyleDescriptor = {
  id: StudioSubtitleStyleId;
  label: string;
  position: "bottom" | "top" | "middle";
  highContrast: boolean;
  /** Runtime burn-in still uses fixed ASS until styling engine ships */
  burnInImplemented: boolean;
};

export const STUDIO_SUBTITLE_STYLE_DESCRIPTORS: Record<
  StudioSubtitleStyleId,
  StudioSubtitleStyleDescriptor
> = {
  default: {
    id: "default",
    label: "Default",
    position: "bottom",
    highContrast: false,
    burnInImplemented: true,
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
  cinema: {
    id: "cinema",
    label: "Cinema",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
  documentary: {
    id: "documentary",
    label: "Documentary",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
  podcast: {
    id: "podcast",
    label: "Podcast",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
  commercial: {
    id: "commercial",
    label: "Commercial",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
  social: {
    id: "social",
    label: "Social",
    position: "middle",
    highContrast: true,
    burnInImplemented: false,
  },
  accessibility: {
    id: "accessibility",
    label: "Accessibility",
    position: "bottom",
    highContrast: true,
    burnInImplemented: false,
  },
  brand: {
    id: "brand",
    label: "Brand",
    position: "bottom",
    highContrast: false,
    burnInImplemented: false,
  },
};
