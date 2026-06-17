"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { usePricingCatalog } from "@/hooks/use-pricing-catalog";
import type { PricingCatalogCategory } from "@/lib/studio-pricing-catalog-meta";
import { PRICING_CATALOG_CATEGORIES } from "@/lib/studio-pricing-catalog-meta";

type Props = {
  categoryFilter?: PricingCatalogCategory;
  compact?: boolean;
  full?: boolean;
  showDescriptions?: boolean;
};

export function CreditPricingCatalog({
  categoryFilter,
  compact = false,
  full = false,
  showDescriptions = true,
}: Props) {
  const t = useActiveTranslator();
  const { items, loading } = usePricingCatalog();

  const grouped = useMemo(() => {
    const filtered =
      categoryFilter ? items.filter((row) => row.category === categoryFilter) : items;
    const map = new Map<PricingCatalogCategory, typeof filtered>();
    for (const row of filtered) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [categoryFilter, items]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("pricing.catalog.loading" as never)}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{t("pricing.catalog.empty" as never)}</p>;
  }

  const categories = categoryFilter ? [categoryFilter] : PRICING_CATALOG_CATEGORIES;

  return (
    <div
      className={compact ? "space-y-3" : full ? "space-y-8" : "space-y-6"}
      data-testid="credit-pricing-catalog"
    >
      {categories.map((category) => {
        const rows = grouped.get(category);
        if (!rows?.length) {
          return null;
        }
        return (
          <section key={category} data-testid={`pricing-catalog-category-${category}`}>
            {!categoryFilter ?
              <h3
                className={`font-semibold text-zinc-900 ${compact ? "text-sm" : "text-base"}`}
              >
                {t(`pricing.catalog.category.${category}` as never)}
              </h3>
            : null}
            <ul className={`${compact ? "mt-2 space-y-1" : "mt-3 space-y-2"}`}>
              {rows.map((row) => (
                <li
                  key={row.actionType}
                  className={`rounded-lg border border-zinc-200 bg-white ${
                    compact ? "px-3 py-2" : "px-4 py-3"
                  }`}
                  data-testid={`pricing-catalog-item-${row.actionType}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={`font-medium text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
                      {row.displayName}
                    </p>
                    <p className={`font-semibold text-emerald-700 ${compact ? "text-sm" : "text-base"}`}>
                      {row.isFree ?
                        t("pricing.catalog.free" as never)
                      : t("pricing.catalog.credits", { count: row.creditCost } as never)}
                    </p>
                  </div>
                  {showDescriptions && row.description && !compact ?
                    <p className="mt-1 text-sm text-zinc-600">{row.description}</p>
                  : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
