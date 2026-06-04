export const STUDIO_PROMPT_STYLE_PROFILES = [
  "commercial",
  "cinematic",
  "children_story",
  "documentary",
  "social_media",
  "corporate",
] as const;

export type StudioPromptStyleProfile = (typeof STUDIO_PROMPT_STYLE_PROFILES)[number];

export const DEFAULT_STUDIO_PROMPT_STYLE_PROFILE: StudioPromptStyleProfile = "commercial";

export function isStudioPromptStyleProfile(value: string): value is StudioPromptStyleProfile {
  return (STUDIO_PROMPT_STYLE_PROFILES as readonly string[]).includes(value);
}

export function normalizeStudioPromptStyleProfile(
  value: string | undefined | null
): StudioPromptStyleProfile {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioPromptStyleProfile(trimmed) ? trimmed : DEFAULT_STUDIO_PROMPT_STYLE_PROFILE;
}

export function buildStyleProfilePrompt(profile: StudioPromptStyleProfile): string {
  switch (profile) {
    case "cinematic":
      return "Cinematic film aesthetic with dramatic lighting, depth, and polished composition.";
    case "children_story":
      return "Warm, friendly storybook tone with approachable characters and soft community energy.";
    case "documentary":
      return "Natural documentary realism with authentic movement and observational framing.";
    case "social_media":
      return "Bright, punchy social-ready visuals with clear subjects and energetic pacing.";
    case "corporate":
      return "Clean corporate presentation with professional polish and trustworthy tone.";
    case "commercial":
    default:
      return "Professional commercial quality with clear product storytelling and brand-friendly tone.";
  }
}
