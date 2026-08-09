/**
 * S.6E — Canonical option maps (UI/legacy → Matrix value → CreativeSpecification field).
 * Persisted legacy strings remain readable via compatibility maps.
 */

export type MatrixOptionFamily =
  | "shotType"
  | "cameraMovement"
  | "energy"
  | "action"
  | "emotion"
  | "style"
  | "director"
  | "lighting"
  | "duration"
  | "aspect"
  | "platform"
  | "audioProfile";

export type CanonicalOptionMapping = {
  family: MatrixOptionFamily;
  uiValue: string;
  canonicalValue: string;
  specPath: string;
};

/** Legacy camera presets → canonical shot types (compat). */
export const LEGACY_CAMERA_TO_SHOT: Record<string, string> = {
  closeup: "close_up",
  close_up: "close_up",
  medium: "medium_shot",
  medium_shot: "medium_shot",
  wide: "wide_shot",
  wide_shot: "wide_shot",
  establishing: "establishing_shot",
  establishing_shot: "establishing_shot",
  over_shoulder: "over_the_shoulder",
  over_the_shoulder: "over_the_shoulder",
  pov: "pov",
  aerial: "aerial",
  dutch: "dutch_angle",
  dutch_angle: "dutch_angle",
};

export const CANONICAL_SHOT_TYPES = [
  "close_up",
  "medium_shot",
  "wide_shot",
  "establishing_shot",
  "over_the_shoulder",
  "pov",
  "aerial",
  "dutch_angle",
  "two_shot",
  "insert",
  "custom",
] as const;

export const CANONICAL_CAMERA_MOVEMENTS = [
  "static",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "dolly_in",
  "dolly_out",
  "orbit",
  "handheld",
  "crane",
  "custom",
] as const;

export const CANONICAL_ENERGIES = ["calm", "balanced", "energetic", "intense"] as const;

export const CANONICAL_PLATFORMS = [
  "tiktok",
  "instagram",
  "instagram_reels",
  "youtube_shorts",
  "youtube",
  "social",
  "business",
  "generic",
] as const;

export type CanonicalPlatform = (typeof CANONICAL_PLATFORMS)[number];

const PLATFORM_ALIASES: Record<string, CanonicalPlatform> = {
  tiktok: "tiktok",
  tt: "tiktok",
  instagram: "instagram",
  ig: "instagram",
  instagram_reels: "instagram_reels",
  reels: "instagram_reels",
  youtube_shorts: "youtube_shorts",
  shorts: "youtube_shorts",
  youtube: "youtube",
  yt: "youtube",
  social: "social",
  business: "business",
  b2b: "business",
  generic: "generic",
};

/** Platform → default aspect (user choice still authoritative when set). */
export const PLATFORM_DEFAULT_ASPECT: Partial<Record<CanonicalPlatform, string>> = {
  tiktok: "9:16",
  instagram: "9:16",
  instagram_reels: "9:16",
  youtube_shorts: "9:16",
  youtube: "16:9",
  social: "9:16",
  business: "16:9",
};

export function mapLegacyCameraToShot(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const key = value.trim().toLowerCase();
  return LEGACY_CAMERA_TO_SHOT[key] ?? key;
}

export function mapCanonicalPlatform(value: string | null | undefined): CanonicalPlatform | null {
  if (!value?.trim()) return null;
  return PLATFORM_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function mapOptionToSpecPath(
  family: MatrixOptionFamily,
  uiValue: string
): CanonicalOptionMapping {
  const normalized = uiValue.trim().toLowerCase();
  switch (family) {
    case "shotType":
      return {
        family,
        uiValue,
        canonicalValue: mapLegacyCameraToShot(normalized) ?? normalized,
        specPath: "composition.shotType",
      };
    case "cameraMovement":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "camera.movement",
      };
    case "energy":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "movement.energy",
      };
    case "action":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "performance.action",
      };
    case "emotion":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "performance.emotion",
      };
    case "style":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "style.styleProfile",
      };
    case "director":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "style.directorProfile",
      };
    case "lighting":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "lighting",
      };
    case "duration":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "duration.resolvedSeconds",
      };
    case "aspect":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "aspectRatio.resolved",
      };
    case "platform":
      return {
        family,
        uiValue,
        canonicalValue: mapCanonicalPlatform(normalized) ?? normalized,
        specPath: "platform",
      };
    case "audioProfile":
      return {
        family,
        uiValue,
        canonicalValue: normalized,
        specPath: "audio.mood",
      };
  }
}

/** Apply a mapped option onto a mutable CreativeSpecification-like object. */
export function applyMappedOption(
  spec: Record<string, unknown>,
  mapping: CanonicalOptionMapping
): void {
  const parts = mapping.specPath.split(".");
  let cursor: Record<string, unknown> = spec;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cursor[key];
    if (!next || typeof next !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1]!;
  if (mapping.family === "duration") {
    const n = Number(mapping.canonicalValue);
    cursor[leaf] = Number.isFinite(n) ? n : mapping.canonicalValue;
  } else {
    cursor[leaf] = mapping.canonicalValue;
  }
}
