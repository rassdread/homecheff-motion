"use client";

import {
  isStudioLocationCategory,
  STUDIO_LOCATION_CATEGORY_BADGE_CLASS,
  type StudioLocationCategory,
} from "@/lib/studio-location-categories";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";

const CATEGORY_LABEL_KEYS: Record<StudioLocationCategory, TranslationKey> = {
  city: "studio.locations.category.city",
  restaurant: "studio.locations.category.restaurant",
  garden: "studio.locations.category.garden",
  market: "studio.locations.category.market",
  street: "studio.locations.category.street",
  home: "studio.locations.category.home",
  office: "studio.locations.category.office",
  nature: "studio.locations.category.nature",
  fantasy: "studio.locations.category.fantasy",
  other: "studio.locations.category.other",
};

type StudioLocationCategoryBadgeProps = {
  category: StudioLocationCategory | string;
  className?: string;
};

export function StudioLocationCategoryBadge({
  category,
  className = "",
}: StudioLocationCategoryBadgeProps) {
  const t = useActiveTranslator();
  const label = isStudioLocationCategory(category) ? t(CATEGORY_LABEL_KEYS[category]) : category;
  const style = isStudioLocationCategory(category)
    ? STUDIO_LOCATION_CATEGORY_BADGE_CLASS[category]
    : STUDIO_LOCATION_CATEGORY_BADGE_CLASS.other;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  );
}
