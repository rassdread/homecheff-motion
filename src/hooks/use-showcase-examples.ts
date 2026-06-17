"use client";

import { useEffect, useState } from "react";
import type { HomeCheffExample } from "@/lib/homecheff-examples";
import type { ShowcasePageKey } from "@/types/studio-showcase-item";

type ShowcaseApiResponse = {
  ok: boolean;
  items: HomeCheffExample[];
  source: "page" | "global" | "static";
};

export function useShowcaseExamples(pageKey: ShowcasePageKey) {
  const [examples, setExamples] = useState<HomeCheffExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ShowcaseApiResponse["source"]>("static");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/showcase-items?pageKey=${encodeURIComponent(pageKey)}`);
          if (!res.ok) {
            throw new Error("showcase fetch failed");
          }
          const data = (await res.json()) as ShowcaseApiResponse;
          if (cancelled) {
            return;
          }
          setExamples(data.items ?? []);
          setSource(data.source ?? "static");
        } catch {
          if (!cancelled) {
            setExamples([]);
            setSource("static");
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
  }, [pageKey]);

  return { examples, loading, source };
}
