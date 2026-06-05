"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAssetDetailView } from "@/components/studio/studio-asset-detail-view";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import {
  buildStudioAssetRegistry,
  searchStudioAssetRegistry,
} from "@/lib/studio-media-asset-registry";
import type { StudioAssetCategory, StudioAsset } from "@/types/studio-media-asset";

type TabId =
  | "all"
  | "character"
  | "location"
  | "prop"
  | "reference_image"
  | "voice"
  | "music"
  | "sound"
  | "brand_asset";

const TABS: TabId[] = [
  "all",
  "character",
  "location",
  "prop",
  "reference_image",
  "voice",
  "music",
  "sound",
  "brand_asset",
];

function tabToCategory(tab: TabId): StudioAssetCategory | "all" | "sound" {
  return tab;
}

function matchesTab(asset: StudioAsset, tab: TabId): boolean {
  if (tab === "all") return true;
  if (tab === "sound") {
    return asset.category === "ambience" || asset.category === "sound_effect" || asset.category === "mouth_asset";
  }
  if (tab === "reference_image") {
    return asset.category === "reference_image" || asset.category === "mouth_asset";
  }
  return asset.category === tab;
}

type Props = {
  layout?: "page" | "embedded";
  storyboardAssets?: StudioAsset[];
};

export function StudioAssetLibrary({ layout = "page", storyboardAssets }: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [loading, setLoading] = useState(layout === "page");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userRegistry, setUserRegistry] = useState<StudioAsset[]>([]);

  const load = useCallback(async () => {
    if (storyboardAssets) {
      return;
    }
    setLoading(true);
    setError("");
    const [chars, locs, props] = await Promise.all([
      fetchStudioCharacters(),
      fetchStudioLocations(),
      fetchStudioProps(),
    ]);
    if (!chars.ok || !locs.ok || !props.ok) {
      setError(t("studio.mediaAsset.error.loadFailed"));
      setUserRegistry([]);
      setLoading(false);
      return;
    }
    setUserRegistry(
      buildStudioAssetRegistry({
        characters: chars.data.characters,
        locations: locs.data.locations,
        props: props.data.props,
        includeSystemCatalog: true,
      })
    );
    setLoading(false);
  }, [storyboardAssets, t]);

  useEffect(() => {
    if (storyboardAssets || !session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load, storyboardAssets]);

  const registry = storyboardAssets ?? userRegistry;

  const filtered = useMemo(() => {
    const category = tabToCategory(tab);
    const base =
      category === "sound" || category === "reference_image"
        ? registry.filter((a) => matchesTab(a, tab))
        : searchStudioAssetRegistry({
            registry,
            category: category === "all" ? "all" : (category as StudioAssetCategory),
            query,
            collectionId: collectionId || undefined,
          });
    if (category === "sound" || category === "reference_image") {
      const q = query.trim().toLowerCase();
      return base.filter((a) => {
        if (collectionId && !a.collectionIds.includes(collectionId)) return false;
        if (!q) return true;
        return [a.name, a.description, ...a.tags].join(" ").toLowerCase().includes(q);
      });
    }
    return base;
  }, [registry, tab, query, collectionId]);

  const selected = filtered.find((a) => a.id === selectedId) ?? registry.find((a) => a.id === selectedId) ?? null;

  const inner = (
    <div className={layout === "page" ? "" : "rounded-xl border border-slate-200 bg-slate-50/50 p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t("studio.mediaAsset.title")}</h2>
          <p className="mt-1 text-xs text-slate-600">{t("studio.mediaAsset.hint")}</p>
        </div>
        {layout === "page" ?
          <Link
            href="/studio"
            className="text-xs font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.mediaAsset.backToStudio")}
          </Link>
        : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              tab === id ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {t(`studio.mediaAsset.tab.${id}` as never)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("studio.mediaAsset.search")}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">{t("studio.mediaAsset.filterCollectionAll")}</option>
          {STUDIO_ASSET_COLLECTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.labelKey as never)}
            </option>
          ))}
        </select>
      </div>

      {loading ?
        <p className="mt-4 text-sm text-slate-600">{t("button.loading")}</p>
      : error ?
        <p className="mt-4 text-sm text-red-700">{error}</p>
      : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <ul className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-white p-2">
            {filtered.length === 0 ?
              <li className="px-2 py-4 text-xs text-slate-500">{t("studio.mediaAsset.empty")}</li>
            : filtered.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-50 ${
                      selectedId === asset.id ? "bg-slate-100" : ""
                    }`}
                  >
                    {asset.previewUrl ?
                      <img
                        src={asset.previewUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                    : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] uppercase text-slate-500">
                        {asset.category.slice(0, 3)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{asset.name}</span>
                      <span className="block truncate text-slate-500">
                        {t(`studio.mediaAsset.source.${asset.source}` as never)} ·{" "}
                        {t(`studio.mediaAsset.tab.${asset.category}` as never)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            }
          </ul>
          {selected ?
            <StudioAssetDetailView asset={selected} onClose={() => setSelectedId(null)} />
          : (
            <p className="text-xs text-slate-500">{t("studio.mediaAsset.selectHint")}</p>
          )}
        </div>
      )}
    </div>
  );

  if (layout === "embedded") {
    return inner;
  }

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-10 sm:py-14">{inner}</section>
      </main>
    </StudioAuthGate>
  );
}
