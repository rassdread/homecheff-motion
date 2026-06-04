export const STUDIO_PROP_CATEGORIES = [
  "phone",
  "laptop",
  "food",
  "drink",
  "plant",
  "vehicle",
  "furniture",
  "screen",
  "clothing",
  "packaging",
  "tool",
  "brand_asset",
  "other",
] as const;

export type StudioPropCategory = (typeof STUDIO_PROP_CATEGORIES)[number];

export function isStudioPropCategory(value: string): value is StudioPropCategory {
  return (STUDIO_PROP_CATEGORIES as readonly string[]).includes(value);
}

export const STUDIO_PROP_CATEGORY_BADGE_CLASS: Record<StudioPropCategory, string> = {
  phone: "border-[#0067B1]/35 bg-[#0067B1]/10 text-[#0067B1]",
  laptop: "border-cyan-300/80 bg-cyan-50 text-cyan-800",
  food: "border-amber-300/80 bg-amber-50 text-amber-800",
  drink: "border-orange-300/80 bg-orange-50 text-orange-800",
  plant: "border-[#006D52]/35 bg-[#006D52]/10 text-[#006D52]",
  vehicle: "border-zinc-400/80 bg-zinc-100 text-zinc-700",
  furniture: "border-stone-300/80 bg-stone-50 text-stone-800",
  screen: "border-violet-300/80 bg-violet-50 text-violet-800",
  clothing: "border-rose-300/80 bg-rose-50 text-rose-800",
  packaging: "border-teal-300/80 bg-teal-50 text-teal-800",
  tool: "border-zinc-300 bg-zinc-100 text-zinc-600",
  brand_asset: "border-[#006D52]/50 bg-[#006D52]/15 text-[#006D52] font-bold",
  other: "border-zinc-200 bg-zinc-100 text-zinc-600",
};
