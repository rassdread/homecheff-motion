/** Studio V23 — director style presets (per storyboard). */

export const STUDIO_DIRECTOR_PROFILES = [
  "commercial",
  "documentary",
  "cinematic",
  "social_media",
  "storytelling",
  "educational",
] as const;

export type StudioDirectorProfile = (typeof STUDIO_DIRECTOR_PROFILES)[number];

export const DEFAULT_STUDIO_DIRECTOR_PROFILE: StudioDirectorProfile = "commercial";

export function isStudioDirectorProfile(value: string): value is StudioDirectorProfile {
  return (STUDIO_DIRECTOR_PROFILES as readonly string[]).includes(value);
}

export function normalizeStudioDirectorProfile(
  value: string | undefined | null
): StudioDirectorProfile {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  return isStudioDirectorProfile(trimmed) ? trimmed : DEFAULT_STUDIO_DIRECTOR_PROFILE;
}

export function buildDirectorProfilePrompt(profile: StudioDirectorProfile): string {
  switch (profile) {
    case "documentary":
      return "Observational documentary direction with natural framing and authentic pacing.";
    case "cinematic":
      return "Cinematic direction with intentional composition, depth, and dramatic visual rhythm.";
    case "social_media":
      return "Social-first direction with punchy framing, clear subjects, and energetic cuts.";
    case "storytelling":
      return "Narrative storytelling direction that guides emotional beats scene by scene.";
    case "educational":
      return "Educational direction with clear explanatory framing and readable composition.";
    case "commercial":
    default:
      return "Commercial direction with polished product storytelling and brand-friendly framing.";
  }
}
