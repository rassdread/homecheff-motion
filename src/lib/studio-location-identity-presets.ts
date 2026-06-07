/** Location Identity Builder — preset ids (i18n keys under studio.locationIdentity.*). */

export const LOCATION_IDENTITY_TYPES = [
  "kitchen",
  "restaurant",
  "market",
  "garden",
  "street",
  "living_room",
  "studio_room",
  "shop",
  "pickup",
  "workshop",
  "school",
  "office",
] as const;

export type LocationIdentityTypeId = (typeof LOCATION_IDENTITY_TYPES)[number];

export const LOCATION_IDENTITY_CORE_STYLES = [
  "realistic",
  "cinematic",
  "cartoon",
  "cartoon_3d",
  "documentary",
  "minimalist",
  "premium",
  "warm_local",
  "urban",
  "nature",
] as const;

export const LOCATION_IDENTITY_ADVANCED_STYLES = [
  "cyberpunk",
  "fantasy",
  "dark_fantasy",
  "horror",
  "dystopian",
  "sci_fi",
  "noir",
  "experimental",
] as const;

export type LocationIdentityCoreStyleId = (typeof LOCATION_IDENTITY_CORE_STYLES)[number];
export type LocationIdentityAdvancedStyleId = (typeof LOCATION_IDENTITY_ADVANCED_STYLES)[number];
export type LocationIdentityStyleId = LocationIdentityCoreStyleId | LocationIdentityAdvancedStyleId;

export const LOCATION_IDENTITY_MOODS = [
  "warm",
  "cozy",
  "busy",
  "calm",
  "professional",
  "inspiring",
  "playful",
  "luxury",
  "artisan",
  "community",
] as const;

export type LocationIdentityMoodId = (typeof LOCATION_IDENTITY_MOODS)[number];

export const LOCATION_IDENTITY_ARCHITECTURE = [
  "modern",
  "classic",
  "industrial",
  "local",
  "rural",
  "urban",
  "tropical",
  "minimalist",
] as const;

export type LocationIdentityArchitectureId = (typeof LOCATION_IDENTITY_ARCHITECTURE)[number];

export const LOCATION_IDENTITY_MATERIALS = [
  "wood",
  "stone",
  "glass",
  "metal",
  "plants",
  "textile",
  "tiles",
  "concrete",
] as const;

export type LocationIdentityMaterialId = (typeof LOCATION_IDENTITY_MATERIALS)[number];

export const LOCATION_IDENTITY_LIGHTING = [
  "daylight",
  "golden_hour",
  "night",
  "soft_light",
  "studio_light",
  "neon",
  "warm_interior",
] as const;

export type LocationIdentityLightingId = (typeof LOCATION_IDENTITY_LIGHTING)[number];

export const LOCATION_IDENTITY_CROWD = [
  "empty",
  "quiet",
  "moderate",
  "busy",
  "festival",
  "market_feel",
] as const;

export type LocationIdentityCrowdId = (typeof LOCATION_IDENTITY_CROWD)[number];

export const LOCATION_IDENTITY_COLOR_THEMES = [
  "homecheff",
  "warm",
  "earth",
  "premium",
  "pastel",
  "neon",
  "dark",
  "light",
] as const;

export type LocationIdentityColorThemeId = (typeof LOCATION_IDENTITY_COLOR_THEMES)[number];

/** Styles with static preview cards in UI. */
export const LOCATION_IDENTITY_STYLE_PREVIEW_IDS: LocationIdentityStyleId[] = [
  "warm_local",
  "cinematic",
  "cartoon",
  "minimalist",
  "urban",
  "nature",
  "premium",
];

export function listVisibleLocationStyles(showAdvanced: boolean): LocationIdentityStyleId[] {
  const core = [...LOCATION_IDENTITY_CORE_STYLES];
  if (!showAdvanced) {
    return core;
  }
  return [...core, ...LOCATION_IDENTITY_ADVANCED_STYLES];
}

export function isAdvancedLocationStyle(styleId: string): boolean {
  return (LOCATION_IDENTITY_ADVANCED_STYLES as readonly string[]).includes(styleId);
}

/** CSS preview tokens per style (no images). */
export const LOCATION_IDENTITY_STYLE_PREVIEW_TOKENS: Record<
  string,
  { gradient: string; accent: string; radius: string }
> = {
  warm_local: {
    gradient: "from-amber-200 via-orange-100 to-rose-100",
    accent: "#B45309",
    radius: "rounded-xl",
  },
  cinematic: {
    gradient: "from-zinc-700 via-zinc-500 to-zinc-300",
    accent: "#18181B",
    radius: "rounded-md",
  },
  cartoon: {
    gradient: "from-emerald-200 via-teal-100 to-sky-100",
    accent: "#006D52",
    radius: "rounded-2xl",
  },
  minimalist: {
    gradient: "from-zinc-100 via-white to-zinc-200",
    accent: "#71717A",
    radius: "rounded-sm",
  },
  urban: {
    gradient: "from-slate-400 via-zinc-300 to-blue-200",
    accent: "#0067B1",
    radius: "rounded-lg",
  },
  nature: {
    gradient: "from-green-300 via-emerald-200 to-lime-100",
    accent: "#006D52",
    radius: "rounded-2xl",
  },
  premium: {
    gradient: "from-stone-300 via-amber-100 to-yellow-50",
    accent: "#92400E",
    radius: "rounded-lg",
  },
};
