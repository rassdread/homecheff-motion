"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioLibraryCard } from "@/components/studio/studio-library-card";
import { StudioLibraryConsistencyRelationBadges } from "@/components/studio/studio-library-consistency-relation-badges";
import { useActiveTranslator } from "@/i18n/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { brand } from "@/lib/brand";
import { libraryBrowseHrefForCategory } from "@/lib/library-consistency";
import {
  clearLibraryBrowseFilters,
  defaultLibraryBrowseFilters,
  hasActiveLibraryBrowseFilters,
  isLibraryBrowseEmpty,
  LIBRARY_BROWSE_SOURCE_MODULES,
  type LibraryBrowseFilterState,
} from "@/lib/library-consistency-browse";
import { queryLibraryConsistency } from "@/lib/library-consistency-client";
import { subscribeStudioLibraryRefresh } from "@/lib/studio-library-refresh";
import {
  LIBRARY_CONSISTENCY_FILTER_TABS,
  type LibraryConsistencyFilterTab,
} from "@/lib/library-asset-index";
import type { LibraryAssetIndexEntry } from "@/lib/library-asset-index";
import type { LibrarySourceModule } from "@/types/library-consistency";

type Props = {
  initialTab?: LibraryConsistencyFilterTab;
  initialProjectId?: string;
};

function parseTab(value: string | undefined): LibraryConsistencyFilterTab {
  if (value && LIBRARY_CONSISTENCY_FILTER_TABS.includes(value as LibraryConsistencyFilterTab)) {
    return value as LibraryConsistencyFilterTab;
  }
  return "recent";
}

export function StudioLibraryConsistencyBrowse({ initialTab, initialProjectId }: Props) {
  const t = useActiveTranslator();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<LibraryBrowseFilterState>(() =>
    defaultLibraryBrowseFilters({
      tab: initialTab ?? "recent",
      projectId: initialProjectId,
    })
  );
  const [textSearch, setTextSearch] = useState("");
  const debouncedSearch = useDebouncedValue(textSearch, 300);
  const [results, setResults] = useState<LibraryAssetIndexEntry[]>([]);
  const [tabCounts, setTabCounts] = useState<Partial<Record<LibraryConsistencyFilterTab, number>>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await queryLibraryConsistency({
      tab: filters.tab,
      textSearch: debouncedSearch || undefined,
      motionReady: filters.motionReady,
      characterType: filters.characterType || undefined,
      fusionArchetype: filters.fusionArchetype || undefined,
      sourceModule: filters.sourceModule,
      workflow: filters.workflow || undefined,
      projectId: filters.projectId || undefined,
      limit: 500,
    });
    if (!response.ok) {
      setError(response.error ?? t("studio.mediaAsset.error.loadFailed"));
      setResults([]);
      setLoading(false);
      return;
    }
    setResults(response.results ?? []);
    setTabCounts(response.tabCounts ?? {});
    setLoading(false);
  }, [filters, debouncedSearch, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeStudioLibraryRefresh(() => void load()), [load]);

  const empty = isLibraryBrowseEmpty(filters, results.length);
  const showEmptyState = !loading && !error && empty;
  const activeFilters = hasActiveLibraryBrowseFilters({ ...filters, textSearch: debouncedSearch });

  const workflowOptions = useMemo(() => {
    const values = new Set<string>();
    for (const record of results) {
      if (record.workflow?.trim()) {
        values.add(record.workflow.trim());
      }
    }
    return [...values].sort();
  }, [results]);

  const inner = (
    <div data-testid="library-consistency-browse">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {t("library.consistency.browse.title" as never)}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t("library.consistency.browse.lead" as never)}</p>
        </div>
        <Link href="/studio/assets" className="min-h-[44px] text-sm font-medium text-[#006D52] hover:underline">
          ← {t("studio.assetsHub.backToHub")}
        </Link>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="library-browse-tabs">
        {LIBRARY_CONSISTENCY_FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, tab }))}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium min-h-[44px] ${
              filters.tab === tab ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
            data-testid={`library-browse-tab-${tab}`}
          >
            {t(`library.consistency.browse.tab.${tab}` as never)}
            {tabCounts[tab] && tabCounts[tab]! > 0 ? ` (${tabCounts[tab]})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="search"
          value={textSearch}
          onChange={(e) => setTextSearch(e.target.value)}
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
            value={filters.motionReady === undefined ? "" : filters.motionReady ? "true" : "false"}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                motionReady: e.target.value === "" ? undefined : e.target.value === "true",
              }))
            }
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-motion-ready"
          >
            <option value="">{t("library.consistency.browse.filter.motionReadyAll" as never)}</option>
            <option value="true">{t("library.consistency.browse.filter.motionReadyYes" as never)}</option>
            <option value="false">{t("library.consistency.browse.filter.motionReadyNo" as never)}</option>
          </select>
          <input
            type="text"
            value={filters.characterType ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, characterType: e.target.value || undefined }))}
            placeholder={t("library.consistency.browse.filter.characterType" as never)}
            className="min-h-[44px] min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-character-type"
          />
          <input
            type="text"
            value={filters.fusionArchetype ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, fusionArchetype: e.target.value || undefined }))}
            placeholder={t("library.consistency.browse.filter.fusionArchetype" as never)}
            className="min-h-[44px] min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-fusion-archetype"
          />
          <select
            value={filters.sourceModule ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                sourceModule: (e.target.value || undefined) as LibrarySourceModule | undefined,
              }))
            }
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-source-module"
          >
            <option value="">{t("library.consistency.browse.filter.sourceModuleAll" as never)}</option>
            {LIBRARY_BROWSE_SOURCE_MODULES.map((module) => (
              <option key={module} value={module}>
                {t(`library.consistency.browse.sourceModule.${module}` as never)}
              </option>
            ))}
          </select>
          <select
            value={filters.workflow ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, workflow: e.target.value || undefined }))}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-workflow"
          >
            <option value="">{t("library.consistency.browse.filter.workflowAll" as never)}</option>
            {workflowOptions.map((workflow) => (
              <option key={workflow} value={workflow}>
                {workflow}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={filters.projectId ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value || undefined }))}
            placeholder={t("library.consistency.browse.filter.projectId" as never)}
            className="min-h-[44px] min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            data-testid="library-filter-project-id"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t("studio.mediaAsset.resultCount", { count: String(results.length) })}
      </p>

      {loading ?
        <p className="mt-4 text-sm text-slate-600">{t("button.loading")}</p>
      : error ?
        <p className="mt-4 text-sm text-red-700">{error}</p>
      : showEmptyState ?
        <div
          className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"
          data-testid="library-browse-empty-state"
        >
          <p className="text-sm font-medium text-slate-800">
            {t("library.consistency.browse.empty" as never)}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {activeFilters ?
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                onClick={() => {
                  setTextSearch("");
                  setFilters(clearLibraryBrowseFilters({ projectId: initialProjectId }));
                }}
                data-testid="library-browse-clear-filters"
              >
                {t("library.consistency.browse.clearFilters" as never)}
              </button>
            : null}
            <Link
              href="/studio/characters/new"
              className="rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
              data-testid="library-browse-new-asset"
            >
              {t("library.consistency.browse.newAsset" as never)}
            </Link>
            <Link
              href="/studio/assets/library/uploads"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
              data-testid="library-browse-upload"
            >
              {t("library.consistency.browse.upload" as never)}
            </Link>
          </div>
        </div>
      : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((record) => (
            <div key={record.id} className="space-y-2" data-testid={`library-browse-card-${record.id}`}>
              <Link href={libraryBrowseHrefForCategory(record.category)}>
                <StudioLibraryCard
                  as="div"
                  title={record.assetName}
                  typeLabel={t(`library.consistency.category.${record.category}` as never)}
                  modifiedLabel={new Date(record.updatedAt ?? record.createdAt).toLocaleString()}
                  thumbnailUrl={record.thumbnailUrl}
                />
              </Link>
              <StudioLibraryConsistencyRelationBadges record={record} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{inner}</section>
      </main>
    </StudioAuthGate>
  );
}

export { parseTab };
