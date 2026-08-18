import type { PhotoVideoStyle } from "@/lib/photo-video/constants";

export const PHOTO_VIDEO_STANDARD_TRANSITIONS = [
  "cut",
  "fade",
  "slide",
  "wipe",
  "zoom_blend",
] as const;

export const PHOTO_VIDEO_SIGNATURE_TRANSITIONS = [
  "hc_shards",
  "hc_tiles",
  "hc_orbit",
  "hc_ripple",
  "hc_split",
  "hc_strips",
  "hc_lens",
] as const;

export const PHOTO_VIDEO_TRANSITION_KINDS = [
  "auto",
  ...PHOTO_VIDEO_STANDARD_TRANSITIONS,
  ...PHOTO_VIDEO_SIGNATURE_TRANSITIONS,
] as const;

export type PhotoVideoTransitionKind = (typeof PHOTO_VIDEO_TRANSITION_KINDS)[number];
export type PhotoVideoResolvedTransition = Exclude<PhotoVideoTransitionKind, "auto">;

export const PHOTO_VIDEO_DEFAULT_TRANSITION: PhotoVideoTransitionKind = "auto";

const LEGACY_STYLE_TO_TRANSITION: Record<PhotoVideoStyle, PhotoVideoTransitionKind> = {
  auto: "auto",
  smooth: "fade",
  calm: "fade",
  energetic: "slide",
};

const OVERLAP_SECONDS: Record<PhotoVideoTransitionKind, number> = {
  auto: 0.4,
  cut: 0,
  fade: 0.45,
  slide: 0.5,
  wipe: 0.5,
  zoom_blend: 0.5,
  hc_shards: 0.7,
  hc_tiles: 0.7,
  hc_orbit: 0.65,
  hc_ripple: 0.7,
  hc_split: 0.65,
  hc_strips: 0.7,
  hc_lens: 0.65,
};

/** Standard, standard, signature — same composition always yields the same sequence. */
const AUTO_CYCLE: readonly PhotoVideoResolvedTransition[] = [
  "fade",
  "slide",
  "hc_shards",
  "wipe",
  "zoom_blend",
  "hc_tiles",
  "slide",
  "fade",
  "hc_orbit",
  "wipe",
  "zoom_blend",
  "hc_ripple",
  "fade",
  "slide",
  "hc_split",
  "wipe",
  "zoom_blend",
  "hc_strips",
  "fade",
  "slide",
  "hc_lens",
];

export function isPhotoVideoTransitionKind(value: unknown): value is PhotoVideoTransitionKind {
  return typeof value === "string" && (PHOTO_VIDEO_TRANSITION_KINDS as readonly string[]).includes(value);
}

export function isPhotoVideoResolvedTransition(value: unknown): value is PhotoVideoResolvedTransition {
  return isPhotoVideoTransitionKind(value) && value !== "auto";
}

export function mapLegacyStyleToTransition(style: PhotoVideoStyle): PhotoVideoTransitionKind {
  return LEGACY_STYLE_TO_TRANSITION[style] ?? "auto";
}

export function overlapSecondsForTransition(kind: PhotoVideoTransitionKind): number {
  return OVERLAP_SECONDS[kind] ?? OVERLAP_SECONDS.fade;
}

export function autoTransitionAtIndex(index: number): PhotoVideoResolvedTransition {
  const i = Math.max(0, Math.floor(index));
  return AUTO_CYCLE[i % AUTO_CYCLE.length] ?? "fade";
}

export function hashTransitionSeed(fromId: string, toId: string, extra = ""): number {
  const source = `${fromId}:${toId}:${extra}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function resolveTransitionKind(
  stored: PhotoVideoTransitionKind | undefined,
  style: PhotoVideoStyle
): PhotoVideoTransitionKind {
  return isPhotoVideoTransitionKind(stored) ? stored : mapLegacyStyleToTransition(style);
}

export function boundaryTransitionKind(
  stored: PhotoVideoTransitionKind | undefined,
  style: PhotoVideoStyle,
  fromIndex: number
): PhotoVideoResolvedTransition {
  const kind = resolveTransitionKind(stored, style);
  if (kind === "auto") return autoTransitionAtIndex(fromIndex);
  return kind;
}
