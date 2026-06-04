"use client";

import {
  isStudioPropCategory,
  STUDIO_PROP_CATEGORY_BADGE_CLASS,
  type StudioPropCategory,
} from "@/lib/studio-prop-categories";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";

const CATEGORY_LABEL_KEYS: Record<StudioPropCategory, TranslationKey> = {
  phone: "studio.props.category.phone",
  laptop: "studio.props.category.laptop",
  food: "studio.props.category.food",
  drink: "studio.props.category.drink",
  plant: "studio.props.category.plant",
  vehicle: "studio.props.category.vehicle",
  furniture: "studio.props.category.furniture",
  screen: "studio.props.category.screen",
  clothing: "studio.props.category.clothing",
  packaging: "studio.props.category.packaging",
  tool: "studio.props.category.tool",
  brand_asset: "studio.props.category.brand_asset",
  other: "studio.props.category.other",
};

type StudioPropCategoryBadgeProps = {
  category: StudioPropCategory | string;
  className?: string;
};

export function StudioPropCategoryBadge({ category, className = "" }: StudioPropCategoryBadgeProps) {
  const t = useActiveTranslator();
  const label = isStudioPropCategory(category) ? t(CATEGORY_LABEL_KEYS[category]) : category;
  const style = isStudioPropCategory(category)
    ? STUDIO_PROP_CATEGORY_BADGE_CLASS[category]
    : STUDIO_PROP_CATEGORY_BADGE_CLASS.other;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  );
}
