"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAssetDetailView } from "@/components/studio/studio-asset-detail-view";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { brand } from "@/lib/brand";
import {
  fetchAssetLibraryPreferences,
  fetchGeneratedReferenceHistory,
  fetchUserUploadLibrary,
} from "@/lib/studio-asset-library-client";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import {
  applyAssetLibraryPreferences,
  applyAssetLibraryFilters,
  ASSET_LIBRARY_USER_COLLECTIONS,
  type AssetLibraryOriginFilter,
  type AssetLibrarySort,
  type AssetLibraryTab,
  type AssetLibraryViewMode,
} from "@/lib/studio-asset-library-filters";
import { assembleUserStudioAssetRegistry } from "@/lib/assemble-user-studio-asset-registry";
import { computeStudioAssetLibraryCounts } from "@/lib/studio-asset-library-counts";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import {
  StudioCanonicalBaseBadge,
  StudioIdentityScoreBadge,
} from "@/components/studio/studio-variant-quality-panel";
import type { StudioAsset } from "@/types/studio-media-asset";

const TABS: AssetLibraryTab[] = [
  "all",
  "favorites",
  "recent",
  "character",
  "prop",
  "location",
  "world",
  "reference_image",
  "generated",
  "derived",
  "voice",
  "music",
  "sound",
];

type Props = {
  layout?: "page" | "embedded";
  hubMode?: boolean;
  storyboardAssets?: StudioAsset[];
  initialTab?: AssetLibraryTab;
  initialCollection?: string;
  initialOrigin?: AssetLibraryOriginFilter;
  onRegistryChange?: () => void;
};

function parseInitialTab(value: string | null): AssetLibraryTab {
  if (value && TABS.includes(value as AssetLibraryTab)) {
    return value as AssetLibraryTab;
  }
  return "all";
}

export function StudioAssetLibrary({
  layout = "page",
  hubMode = false,
  storyboardAssets,
  initialTab,
  initialCollection,
  initialOrigin,
  onRegistryChange,
}: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAdmin = session.user?.role === "admin";

  const [loading, setLoading] = useState(layout === "page");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<AssetLibraryTab>(() => {
    if (initialTab) {
      return initialTab;
    }
    if (typeof window !== "undefined") {
      return parseInitialTab(new URLSearchParams(window.location.search).get("tab"));
    }
    return "all";
  });
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [collectionId, setCollectionId] = useState(initialCollection ?? "");
  const [originFilter, setOriginFilter] = useState<AssetLibraryOriginFilter>(initialOrigin ?? "all");
  const [sort, setSort] = useState<AssetLibrarySort>("updated_desc");
  const [viewMode, setViewMode] = useState<AssetLibraryViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userRegistry, setUserRegistry] = useState<StudioAsset[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showSystemAssets, setShowSystemAssets] = useState(false);

  const load = useCallback(async () => {
    if (storyboardAssets) {
      return;
    }
    setLoading(true);
    setError("");
    const [chars, locs, props, worlds, prefs, history, uploads, audioLib, voiceLib] = await Promise.all([
      fetchStudioCharacters(),
      fetchStudioLocations(),
      fetchStudioProps(),
      fetchStudioWorlds(),
      fetchAssetLibraryPreferences(),
      fetchGeneratedReferenceHistory(),
      fetchUserUploadLibrary(),
      fetchUserAudioLibraryApi(),
      fetch("/api/studio/user-voice-library", { cache: "no-store" }).then(async (res) => {
        if (!res.ok) {
          return { ok: false as const };
        }
        const json = (await res.json()) as { ok: boolean; library?: { voices: unknown[] } };
        return json.ok && json.library
          ? { ok: true as const, voices: json.library.voices as import("@/types/studio-user-voice-library").UserVoiceLibraryEntry[] }
          : { ok: false as const };
      }),
    ]);
    if (!chars.ok || !locs.ok || !props.ok || !worlds.ok) {
      setError(t("studio.mediaAsset.error.loadFailed"));
      setUserRegistry([]);
      setLoading(false);
      return;
    }

    const userId = session.user?.id ?? "";
    const isAdmin = session.user?.role === "admin";
    const generatedRefs =
      history.ok
        ? history.data
            .filter((item) => item.referenceImageUrl)
            .map((item) => ({
              generationId: item.generationId,
              kind: item.kind,
              createdAt: item.createdAt,
              promptSummary: item.promptSummary,
              referenceImageUrl: item.referenceImageUrl!,
              referenceStorageKey: item.referenceStorageKey,
              thumbnailUrl: item.thumbnailUrl,
              sourceAssetName: item.sourceAssetName,
              sourceAssetId: item.sourceAssetId,
              origin: item.origin,
              ownerId: userId,
              hideFromLibrary: item.hideFromLibrary,
              hiddenAt: item.hiddenAt,
              archivedAt: item.archivedAt,
              deletedAt: item.deletedAt,
              lifecycleStatus: item.lifecycleStatus,
            }))
        : [];

    const registry = assembleUserStudioAssetRegistry({
      userId,
      characters: chars.data.characters,
      locations: locs.data.locations,
      props: props.data.props,
      worlds: worlds.data.worlds,
      generatedReferences: generatedRefs,
      userUploads: uploads.ok ? uploads.uploads : [],
      userAudioAssets: audioLib.ok ? audioLib.data.assets : [],
      userVoiceClones: voiceLib.ok ? voiceLib.voices : [],
      isAdmin,
      showSystemAssets: showSystemAssets && isAdmin,
    });
    const favs = prefs.ok ? prefs.data.favorites : [];
    const recents = prefs.ok ? prefs.data.recentAssetIds : [];
    setFavoriteIds(favs);
    setRecentIds(recents);
    setUserRegistry(
      applyAssetLibraryPreferences(registry, {
        favoriteIds: favs,
        recentAssetIds: recents,
      })
    );
    setLoading(false);
  }, [storyboardAssets, t, session.user?.id, session.user?.role, showSystemAssets]);

  useEffect(() => {
    if (storyboardAssets || !session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load, storyboardAssets]);

  const registry = storyboardAssets ?? userRegistry;
  const userId = session.user?.id ?? "";

  const filtered = useMemo(() => {
    return applyAssetLibraryFilters(registry, {
      tab,
      collectionId,
      originFilter,
      query: debouncedQuery,
      sort,
      favoriteIds,
      recentAssetIds: recentIds,
    });
  }, [registry, tab, collectionId, originFilter, debouncedQuery, sort, favoriteIds, recentIds]);

  const tabCounts = useMemo(() => {
    if (!userId) {
      return null;
    }
    return computeStudioAssetLibraryCounts(registry, {
      userId,
      favoriteIds,
      recentAssetIds: recentIds,
    }).byTab;
  }, [registry, userId, favoriteIds, recentIds]);

  const selected =
    filtered.find((a) => a.id === selectedId) ?? registry.find((a) => a.id === selectedId) ?? null;

  const handleFavoriteChange = (assetId: string, favorite: boolean) => {
    setFavoriteIds((prev) => {
      const set = new Set(prev);
      if (favorite) {
        set.add(assetId);
      } else {
        set.delete(assetId);
      }
      return [...set];
    });
    setUserRegistry((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, isFavorite: favorite } : a))
    );
  };

  const inner = (
    <div className={layout === "page" ? "" : "rounded-xl border border-slate-200 bg-slate-50/50 p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {hubMode ? t("studio.assetsHub.browseSection") : t("studio.mediaAsset.title")}
          </h2>
          {!hubMode ?
            <p className="mt-1 text-sm text-slate-600">{t("studio.mediaAsset.hintPersonal")}</p>
          : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ?
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showSystemAssets}
                onChange={(e) => setShowSystemAssets(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {t("studio.mediaAsset.showSystemAssets")}
            </label>
          : null}
          {layout === "page" && !hubMode ?
            <Link href="/studio/assets" className="min-h-[44px] text-sm font-medium text-[#006D52] hover:underline">
              ← {t("studio.assetsHub.backToHub")}
            </Link>
          : null}
          {layout === "page" && hubMode ?
            <Link href="/studio/assets/browse" className="min-h-[44px] text-sm font-medium text-[#006D52] hover:underline">
              {t("studio.assetsHub.browseAll")}
            </Link>
          : null}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium min-h-[44px] ${
              tab === id ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {t(`studio.mediaAsset.tab.${id}` as never)}
            {tabCounts && tabCounts[id] > 0 ? ` (${tabCounts[id]})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("studio.mediaAsset.search")}
          className="min-h-[44px] min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 lg:hidden"
        >
          {t("studio.mediaAsset.filters")}
        </button>
        <div className={`${filtersOpen ? "flex" : "hidden"} w-full flex-wrap gap-2 lg:flex`}>
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">{t("studio.mediaAsset.filterCollectionAll")}</option>
            <optgroup label={t("studio.mediaAsset.filterGroup.personal")}>
              {ASSET_LIBRARY_USER_COLLECTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.labelKey as never)}
                </option>
              ))}
            </optgroup>
            {STUDIO_ASSET_COLLECTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.labelKey as never)}
              </option>
            ))}
          </select>
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as AssetLibraryOriginFilter)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">{t("studio.mediaAsset.filterOriginAll")}</option>
            <option value="generated">{t("studio.mediaAsset.filterOriginGenerated")}</option>
            <option value="uploaded">{t("studio.mediaAsset.filterOriginUploaded")}</option>
            <option value="derived">{t("studio.mediaAsset.filterOriginDerived")}</option>
            <option value="manual">{t("studio.mediaAsset.filterOriginManual")}</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as AssetLibrarySort)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="updated_desc">{t("studio.mediaAsset.sort.updatedDesc")}</option>
            <option value="updated_asc">{t("studio.mediaAsset.sort.updatedAsc")}</option>
            <option value="name_asc">{t("studio.mediaAsset.sort.nameAsc")}</option>
            <option value="name_desc">{t("studio.mediaAsset.sort.nameDesc")}</option>
            <option value="recent">{t("studio.mediaAsset.sort.recent")}</option>
          </select>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium ${viewMode === "grid" ? "bg-slate-100" : ""}`}
            >
              {t("studio.mediaAsset.viewGrid")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium ${viewMode === "list" ? "bg-slate-100" : ""}`}
            >
              {t("studio.mediaAsset.viewList")}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t("studio.mediaAsset.resultCount", { count: String(filtered.length) })}
      </p>

      {loading ?
        <p className="mt-4 text-sm text-slate-600">{t("button.loading")}</p>
      : error ?
        <p className="mt-4 text-sm text-red-700">{error}</p>
      : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          {viewMode === "grid" ?
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ?
                <p className="col-span-full px-2 py-8 text-sm text-slate-500">{t("studio.mediaAsset.empty")}</p>
              : filtered.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={`flex min-h-[120px] flex-col rounded-2xl border p-3 text-left transition-colors ${
                      selectedId === asset.id ? "border-[#006D52] bg-[#006D52]/5" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {asset.previewUrl ?
                      <img src={asset.previewUrl} alt="" className="mb-2 h-20 w-full rounded-lg object-cover" />
                    : (
                      <span className="mb-2 flex h-20 items-center justify-center rounded-lg bg-slate-100 text-xs uppercase text-slate-500">
                        {asset.category.slice(0, 3)}
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold text-slate-900">{asset.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      {asset.semanticContinuity?.identityAssetType === "canonical_character_base" ?
                        <StudioCanonicalBaseBadge />
                      : null}
                      {typeof asset.semanticContinuity?.identityScore === "number" ?
                        <StudioIdentityScoreBadge
                          score={asset.semanticContinuity.identityScore}
                          profileLevel={asset.semanticContinuity.identityProfile}
                        />
                      : null}
                      <span className="truncate text-xs text-slate-500">
                        {asset.isFavorite ? "★ " : ""}
                        {t(`studio.mediaAsset.source.${asset.source}` as never)}
                      </span>
                    </span>
                  </button>
                ))
              }
            </div>
          : (
            <ul className="max-h-[520px] space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2">
              {filtered.length === 0 ?
                <li className="px-2 py-8 text-sm text-slate-500">{t("studio.mediaAsset.empty")}</li>
              : filtered.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={`flex w-full min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        selectedId === asset.id ? "bg-slate-100" : ""
                      }`}
                    >
                      {asset.previewUrl ?
                        <img src={asset.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] uppercase text-slate-500">
                          {asset.category.slice(0, 3)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          {asset.isFavorite ? "★ " : ""}
                          {asset.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {asset.origin ? t(`studio.mediaAsset.origin.${asset.origin}` as never) : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              }
            </ul>
          )}
          {selected ?
            <StudioAssetDetailView
              asset={selected}
              allAssets={filtered}
              onSelectAsset={setSelectedId}
              isAdmin={isAdmin}
              userId={userId}
              onClose={() => setSelectedId(null)}
              onFavoriteChange={handleFavoriteChange}
              onLifecycleChange={() => {
                void load();
                onRegistryChange?.();
              }}
            />
          : (
            <p className="hidden text-sm text-slate-500 lg:block">{t("studio.mediaAsset.selectHint")}</p>
          )}
        </div>
      )}
    </div>
  );

  if (layout === "embedded" || hubMode) {
    return inner;
  }

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{inner}</section>
      </main>
    </StudioAuthGate>
  );
}
