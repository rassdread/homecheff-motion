/** Character Identity Builder — preset ids (i18n keys under studio.characterIdentity.*). */

export const CHARACTER_IDENTITY_TYPES = [
  "human",
  "mascot",
  "animal",
  "avatar",
  "robot",
  "alien",
  "monster",
  "object_character",
  "vehicle_character",
  "brand_character",
] as const;

export type CharacterIdentityTypeId = (typeof CHARACTER_IDENTITY_TYPES)[number];

export const CHARACTER_IDENTITY_CORE_STYLES = [
  "flat_cartoon",
  "2d_cartoon",
  "3d_cartoon",
  "comic",
  "storybook",
  "semi_realistic",
  "cinematic",
  "stylized",
] as const;

export const CHARACTER_IDENTITY_ADVANCED_STYLES = [
  "anime",
  "manga",
  "clay",
  "low_poly",
  "voxel",
  "realistic",
  "cyberpunk",
  "steampunk",
  "noir",
  "fantasy",
  "dark_fantasy",
  "horror",
  "dystopian",
  "post_apocalyptic",
  "sci_fi",
  "retro_future",
  "experimental",
] as const;

export type CharacterIdentityCoreStyleId = (typeof CHARACTER_IDENTITY_CORE_STYLES)[number];
export type CharacterIdentityAdvancedStyleId = (typeof CHARACTER_IDENTITY_ADVANCED_STYLES)[number];
export type CharacterIdentityStyleId = CharacterIdentityCoreStyleId | CharacterIdentityAdvancedStyleId;

export const CHARACTER_IDENTITY_SHAPE_LANGUAGES = [
  "rounded",
  "compact",
  "elongated",
  "robust",
  "minimal",
  "expressive",
  "playful",
  "professional",
] as const;

export type CharacterIdentityShapeId = (typeof CHARACTER_IDENTITY_SHAPE_LANGUAGES)[number];

export const CHARACTER_IDENTITY_ENERGIES = [
  "calm",
  "friendly",
  "neutral",
  "energetic",
  "chaotic",
  "heroic",
  "mysterious",
  "premium",
  "funny",
] as const;

export type CharacterIdentityEnergyId = (typeof CHARACTER_IDENTITY_ENERGIES)[number];

export const CHARACTER_IDENTITY_PERSONALITY_PRESETS = [
  "warm",
  "energetic",
  "funny",
  "professional",
  "calm",
  "reliable",
  "creative",
  "adventurous",
] as const;

export const CHARACTER_IDENTITY_OUTFIT_PRESETS = [
  "chef",
  "garden",
  "designer",
  "delivery",
  "entrepreneur",
  "casual",
  "sporty",
  "presenter",
] as const;

export const CHARACTER_IDENTITY_ACCESSORY_PRESETS = [
  "spoon",
  "basket",
  "needle",
  "phone",
  "package",
  "bicycle",
  "ball",
  "camera",
  "notebook",
] as const;

export const CHARACTER_IDENTITY_COLOR_THEMES = [
  "homecheff",
  "warm",
  "earth",
  "premium",
  "pastel",
  "neon",
  "dark",
  "light",
] as const;

export type CharacterIdentityColorThemeId = (typeof CHARACTER_IDENTITY_COLOR_THEMES)[number];

/** Styles with static preview cards in UI. */
export const CHARACTER_IDENTITY_STYLE_PREVIEW_IDS: CharacterIdentityStyleId[] = [
  "flat_cartoon",
  "3d_cartoon",
  "comic",
  "storybook",
  "cinematic",
];

export function listVisibleCharacterStyles(showAdvanced: boolean): CharacterIdentityStyleId[] {
  const core = [...CHARACTER_IDENTITY_CORE_STYLES];
  if (!showAdvanced) {
    return core;
  }
  return [...core, ...CHARACTER_IDENTITY_ADVANCED_STYLES];
}

export function isAdvancedCharacterStyle(styleId: string): boolean {
  return (CHARACTER_IDENTITY_ADVANCED_STYLES as readonly string[]).includes(styleId);
}

/** CSS preview tokens per style (no images). */
export const CHARACTER_IDENTITY_STYLE_PREVIEW_TOKENS: Record<
  string,
  { gradient: string; accent: string; radius: string }
> = {
  flat_cartoon: {
    gradient: "from-emerald-200 via-teal-100 to-sky-100",
    accent: "#006D52",
    radius: "rounded-2xl",
  },
  "3d_cartoon": {
    gradient: "from-violet-200 via-indigo-100 to-blue-100",
    accent: "#0067B1",
    radius: "rounded-3xl",
  },
  comic: {
    gradient: "from-amber-200 via-orange-100 to-yellow-100",
    accent: "#EA580C",
    radius: "rounded-lg",
  },
  storybook: {
    gradient: "from-rose-100 via-amber-50 to-lime-100",
    accent: "#B45309",
    radius: "rounded-xl",
  },
  cinematic: {
    gradient: "from-zinc-700 via-zinc-500 to-zinc-300",
    accent: "#18181B",
    radius: "rounded-md",
  },
};
