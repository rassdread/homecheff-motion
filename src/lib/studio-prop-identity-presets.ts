/** Prop Identity Builder — preset ids (i18n keys under studio.propIdentity.*). */

export const PROP_IDENTITY_TYPES = [
  "tool",
  "sport",
  "food",
  "electronics",
  "clothing",
  "transport",
  "decoration",
  "music",
  "toy",
  "business",
] as const;

export type PropIdentityTypeId = (typeof PROP_IDENTITY_TYPES)[number];

export const PROP_IDENTITY_FUNCTIONS = [
  "cooking",
  "delivery",
  "sports",
  "presenting",
  "designing",
  "travel",
  "selling",
  "harvest",
  "learning",
  "entertainment",
] as const;

export type PropIdentityFunctionId = (typeof PROP_IDENTITY_FUNCTIONS)[number];

export const PROP_IDENTITY_SHAPES = [
  "rounded",
  "compact",
  "minimalist",
  "robust",
  "premium",
  "playful",
  "industrial",
] as const;

export type PropIdentityShapeId = (typeof PROP_IDENTITY_SHAPES)[number];

export const PROP_IDENTITY_MATERIALS = [
  "wood",
  "metal",
  "plastic",
  "glass",
  "fabric",
  "paper",
  "leather",
  "stone",
] as const;

export type PropIdentityMaterialId = (typeof PROP_IDENTITY_MATERIALS)[number];

export const PROP_IDENTITY_SIZES = [
  "small",
  "handheld",
  "medium",
  "large",
  "extra_large",
] as const;

export type PropIdentitySizeId = (typeof PROP_IDENTITY_SIZES)[number];

export const PROP_IDENTITY_STYLES = [
  "artisan",
  "modern",
  "premium",
  "industrial",
  "playful",
  "minimalist",
] as const;

export type PropIdentityStyleId = (typeof PROP_IDENTITY_STYLES)[number];

export const PROP_IDENTITY_COLOR_THEMES = [
  "homecheff",
  "warm",
  "earth",
  "premium",
  "pastel",
  "neon",
  "dark",
  "light",
] as const;

export type PropIdentityColorThemeId = (typeof PROP_IDENTITY_COLOR_THEMES)[number];

export const PROP_IDENTITY_STYLE_PREVIEW_IDS: PropIdentityStyleId[] = [
  "artisan",
  "modern",
  "premium",
  "industrial",
  "playful",
  "minimalist",
];

export const PROP_IDENTITY_STYLE_PREVIEW_TOKENS: Record<
  string,
  { gradient: string; accent: string; radius: string }
> = {
  artisan: {
    gradient: "from-amber-200 via-orange-100 to-rose-100",
    accent: "#B45309",
    radius: "rounded-xl",
  },
  modern: {
    gradient: "from-zinc-100 via-white to-slate-200",
    accent: "#0067B1",
    radius: "rounded-md",
  },
  premium: {
    gradient: "from-stone-300 via-amber-100 to-yellow-50",
    accent: "#92400E",
    radius: "rounded-lg",
  },
  industrial: {
    gradient: "from-zinc-500 via-slate-400 to-zinc-300",
    accent: "#27272A",
    radius: "rounded-sm",
  },
  playful: {
    gradient: "from-emerald-200 via-teal-100 to-sky-100",
    accent: "#006D52",
    radius: "rounded-2xl",
  },
  minimalist: {
    gradient: "from-zinc-100 via-white to-zinc-200",
    accent: "#71717A",
    radius: "rounded-sm",
  },
};
