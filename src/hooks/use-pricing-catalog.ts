"use client";

import { useEffect, useState } from "react";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

export function usePricingCatalog() {
  const [items, setItems] = useState<StudioPricingCatalogPublicEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const res = await fetch("/api/billing/pricing-catalog");
          if (!res.ok) {
            throw new Error("pricing catalog fetch failed");
          }
          const data = (await res.json()) as { items?: StudioPricingCatalogPublicEntry[] };
          if (!cancelled) {
            setItems(data.items ?? []);
          }
        } catch {
          if (!cancelled) {
            setItems([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
