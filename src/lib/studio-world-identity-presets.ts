/** World Identity Builder — preset ids (i18n under studio.worldIdentity.*). */

export const WORLD_IDENTITY_CORE_TYPES = [
  "brand_universe",
  "community_universe",
  "food_universe",
  "garden_universe",
  "design_universe",
  "education_universe",
  "sports_universe",
  "lifestyle_universe",
  "local_market_universe",
  "documentary_universe",
  "cartoon_universe",
  "cinematic_universe",
] as const;

export const WORLD_IDENTITY_ADVANCED_TYPES = [
  "cyberpunk",
  "steampunk",
  "fantasy",
  "dark_fantasy",
  "horror",
  "dystopian",
  "sci_fi",
  "noir",
  "post_apocalyptic",
  "retro_future",
  "experimental",
] as const;

export type WorldIdentityCoreTypeId = (typeof WORLD_IDENTITY_CORE_TYPES)[number];
export type WorldIdentityAdvancedTypeId = (typeof WORLD_IDENTITY_ADVANCED_TYPES)[number];
export type WorldIdentityTypeId = WorldIdentityCoreTypeId | WorldIdentityAdvancedTypeId;

export const WORLD_IDENTITY_VISUAL_STYLES = [
  "cartoon_3d",
  "cinematic",
  "community",
  "documentary",
  "warm_local",
  "premium",
  "minimalist",
  "playful",
] as const;

export type WorldIdentityVisualStyleId = (typeof WORLD_IDENTITY_VISUAL_STYLES)[number];

export const WORLD_IDENTITY_SHAPES = [
  "rounded",
  "friendly",
  "accessible",
  "compact",
  "minimal",
  "robust",
  "premium",
  "industrial",
] as const;

export type WorldIdentityShapeId = (typeof WORLD_IDENTITY_SHAPES)[number];

export const WORLD_IDENTITY_COLOR_THEMES = [
  "homecheff",
  "warm",
  "earth",
  "premium",
  "pastel",
  "neon",
  "dark",
  "light",
] as const;

export type WorldIdentityColorThemeId = (typeof WORLD_IDENTITY_COLOR_THEMES)[number];

export const WORLD_IDENTITY_LIGHTING = [
  "daylight",
  "golden_hour",
  "soft",
  "warm_interior",
  "dramatic",
  "studio",
  "natural",
] as const;

export type WorldIdentityLightingId = (typeof WORLD_IDENTITY_LIGHTING)[number];

export const WORLD_IDENTITY_MOODS = [
  "warm",
  "hopeful",
  "entrepreneurial",
  "local",
  "energetic",
  "calm",
  "premium",
  "playful",
  "inspiring",
  "community",
] as const;

export type WorldIdentityMoodId = (typeof WORLD_IDENTITY_MOODS)[number];

export const WORLD_IDENTITY_ENV_FEELS = [
  "cozy",
  "community",
  "professional",
  "outdoor",
  "urban",
  "artisan",
  "family",
  "market",
] as const;

export type WorldIdentityEnvFeelId = (typeof WORLD_IDENTITY_ENV_FEELS)[number];

export const WORLD_IDENTITY_MUSIC_STYLES = [
  "warm",
  "rhythmic",
  "cinematic",
  "acoustic",
  "electronic",
  "orchestral",
  "minimal",
  "uplifting",
] as const;

export type WorldIdentityMusicStyleId = (typeof WORLD_IDENTITY_MUSIC_STYLES)[number];

export const WORLD_IDENTITY_AMBIENCE = [
  "community",
  "kitchen",
  "garden",
  "market",
  "studio",
  "street",
  "nature",
  "office",
] as const;

export type WorldIdentityAmbienceId = (typeof WORLD_IDENTITY_AMBIENCE)[number];

export const WORLD_IDENTITY_AUDIO_ENERGY = [
  "calm",
  "positive",
  "dynamic",
  "intense",
  "neutral",
  "human",
] as const;

export type WorldIdentityAudioEnergyId = (typeof WORLD_IDENTITY_AUDIO_ENERGY)[number];

export const WORLD_IDENTITY_VOICE_DIRECTIONS = [
  "warm_narrator",
  "documentary",
  "founder",
  "commercial",
  "educational",
  "human_local",
] as const;

export type WorldIdentityVoiceDirectionId = (typeof WORLD_IDENTITY_VOICE_DIRECTIONS)[number];

export const WORLD_IDENTITY_SOUND_FEELS = [
  "local",
  "premium",
  "human",
  "natural",
  "urban",
  "magical",
] as const;

export type WorldIdentitySoundFeelId = (typeof WORLD_IDENTITY_SOUND_FEELS)[number];

export const WORLD_IDENTITY_CAMERA_STYLES = [
  "steady",
  "documentary",
  "cinematic",
  "handheld",
  "dynamic",
  "static",
] as const;

export type WorldIdentityCameraStyleId = (typeof WORLD_IDENTITY_CAMERA_STYLES)[number];

export const WORLD_IDENTITY_MOTION_STYLES = [
  "slow",
  "steady",
  "tracking",
  "push_in",
  "energetic",
  "minimal",
] as const;

export type WorldIdentityMotionStyleId = (typeof WORLD_IDENTITY_MOTION_STYLES)[number];

export const WORLD_IDENTITY_PACING = [
  "slow",
  "medium",
  "fast",
  "dynamic",
  "calm",
] as const;

export type WorldIdentityPacingId = (typeof WORLD_IDENTITY_PACING)[number];

export const WORLD_IDENTITY_PREFERRED_SHOTS = [
  "wide",
  "medium",
  "close_up",
  "detail",
  "group",
  "tracking",
  "establishing",
] as const;

export type WorldIdentityPreferredShotId = (typeof WORLD_IDENTITY_PREFERRED_SHOTS)[number];

export const WORLD_IDENTITY_RENDER_STRATEGIES = [
  "multi_image",
  "start_end",
  "hybrid",
  "speed_plan",
  "shot_split",
] as const;

export type WorldIdentityRenderStrategyId = (typeof WORLD_IDENTITY_RENDER_STRATEGIES)[number];

export const WORLD_IDENTITY_TYPE_PREVIEW_IDS: WorldIdentityTypeId[] = [
  "community_universe",
  "food_universe",
  "garden_universe",
  "design_universe",
  "sports_universe",
  "cartoon_universe",
  "cinematic_universe",
  "documentary_universe",
  "brand_universe",
  "fantasy",
  "sci_fi",
];

export const WORLD_IDENTITY_ADVANCED_PREVIEW_IDS: WorldIdentityTypeId[] = [
  "fantasy",
  "sci_fi",
];

export function listVisibleWorldTypes(showAdvanced: boolean): WorldIdentityTypeId[] {
  const core = [...WORLD_IDENTITY_CORE_TYPES];
  if (!showAdvanced) return core;
  return [...core, ...WORLD_IDENTITY_ADVANCED_TYPES];
}

export function isAdvancedWorldType(typeId: string): boolean {
  return (WORLD_IDENTITY_ADVANCED_TYPES as readonly string[]).includes(typeId);
}

export function isAdvancedWorldPreviewType(typeId: string): boolean {
  return (WORLD_IDENTITY_ADVANCED_PREVIEW_IDS as readonly string[]).includes(typeId);
}

export const WORLD_IDENTITY_TYPE_PREVIEW_TOKENS: Record<
  string,
  { gradient: string; accent: string; energy: string }
> = {
  community_universe: {
    gradient: "from-emerald-200 via-teal-100 to-sky-100",
    accent: "#006D52",
    energy: "warm",
  },
  food_universe: {
    gradient: "from-amber-200 via-orange-100 to-rose-100",
    accent: "#B45309",
    energy: "cozy",
  },
  garden_universe: {
    gradient: "from-green-300 via-emerald-200 to-lime-100",
    accent: "#006D52",
    energy: "natural",
  },
  design_universe: {
    gradient: "from-violet-200 via-indigo-100 to-blue-100",
    accent: "#0067B1",
    energy: "premium",
  },
  sports_universe: {
    gradient: "from-orange-300 via-red-200 to-yellow-100",
    accent: "#EA580C",
    energy: "dynamic",
  },
  cartoon_universe: {
    gradient: "from-pink-200 via-purple-100 to-sky-100",
    accent: "#7C3AED",
    energy: "playful",
  },
  cinematic_universe: {
    gradient: "from-zinc-700 via-zinc-500 to-zinc-300",
    accent: "#18181B",
    energy: "dramatic",
  },
  documentary_universe: {
    gradient: "from-stone-400 via-stone-200 to-amber-100",
    accent: "#57534E",
    energy: "human",
  },
  brand_universe: {
    gradient: "from-[#006D52]/30 via-[#0067B1]/20 to-white",
    accent: "#0067B1",
    energy: "brand",
  },
  fantasy: {
    gradient: "from-fuchsia-300 via-violet-200 to-indigo-200",
    accent: "#7E22CE",
    energy: "magical",
  },
  sci_fi: {
    gradient: "from-cyan-400 via-blue-300 to-slate-400",
    accent: "#0891B2",
    energy: "futuristic",
  },
};
