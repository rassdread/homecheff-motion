export const STUDIO_LOCATION_CATEGORIES = [
  "city",
  "restaurant",
  "garden",
  "market",
  "street",
  "home",
  "office",
  "nature",
  "fantasy",
  "other",
] as const;

export type StudioLocationCategory = (typeof STUDIO_LOCATION_CATEGORIES)[number];

export function isStudioLocationCategory(value: string): value is StudioLocationCategory {
  return (STUDIO_LOCATION_CATEGORIES as readonly string[]).includes(value);
}

/** HomeCheff brand accents for location category badges (UI). */
export const STUDIO_LOCATION_CATEGORY_BADGE_CLASS: Record<StudioLocationCategory, string> = {
  city: "border-[#0067B1]/35 bg-[#0067B1]/10 text-[#0067B1]",
  restaurant: "border-amber-300/80 bg-amber-50 text-amber-800",
  garden: "border-[#006D52]/35 bg-[#006D52]/10 text-[#006D52]",
  market: "border-violet-300/80 bg-violet-50 text-violet-800",
  street: "border-zinc-300 bg-zinc-100 text-zinc-700",
  home: "border-rose-300/80 bg-rose-50 text-rose-800",
  office: "border-cyan-300/80 bg-cyan-50 text-cyan-800",
  nature: "border-emerald-300/80 bg-emerald-50 text-emerald-800",
  fantasy: "border-fuchsia-300/80 bg-fuchsia-50 text-fuchsia-800",
  other: "border-zinc-200 bg-zinc-100 text-zinc-600",
};
