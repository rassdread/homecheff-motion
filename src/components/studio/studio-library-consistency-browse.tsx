"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioLibraryCard } from "@/components/studio/studio-library-card";
import { StudioLibraryConsistencyRelationBadges } from "@/components/studio/studio-library-consistency-relation-badges";
import { useActiveTranslator } from "@/i18n/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { studioLibraryVisual, libraryFilterChipClasses } from "@/lib/studio-library-visual";
import { StudioLibraryPageHero } from "@/components/studio/studio-library-page-hero";
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
    queueMicrotask(() => {
      void load();
    });
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
      <StudioLibraryPageHero
        backHref="/studio/assets"
        backLabel={t("studio.assetsHub.backToHub")}
        title={t("library.consistency.browse.title" as never)}
        description={t("library.consistency.browse.lead" as never)}
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="library-browse-tabs">
        {LIBRARY_CONSISTENCY_FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, tab }))}
            className={libraryFilterChipClasses(filters.tab === tab)}
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
          className={studioLibraryVisual.formControlWide}
        />
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={studioLibraryVisual.filterToggle}
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
            className={studioLibraryVisual.formControl}
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
            className={`${studioLibraryVisual.formControl} min-w-[140px]`}
            data-testid="library-filter-character-type"
          />
          <input
            type="text"
            value={filters.fusionArchetype ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, fusionArchetype: e.target.value || undefined }))}
            placeholder={t("library.consistency.browse.filter.fusionArchetype" as never)}
            className={`${studioLibraryVisual.formControl} min-w-[140px]`}
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
            className={studioLibraryVisual.formControl}
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
            className={studioLibraryVisual.formControl}
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
            className={`${studioLibraryVisual.formControl} min-w-[160px]`}
            data-testid="library-filter-project-id"
          />
        </div>
      </div>

      <p className={`mt-2 ${studioLibraryVisual.metaMuted}`}>
        {t("studio.mediaAsset.resultCount", { count: String(results.length) })}
      </p>

      {loading ?
        <p className={`mt-4 ${studioLibraryVisual.loadingText}`}>{t("button.loading")}</p>
      : error ?
        <p className={`mt-4 ${studioLibraryVisual.errorText}`}>{error}</p>
      : showEmptyState ?
        <div
          className={`mt-6 rounded-2xl border border-dashed border-white/25 ${studioLibraryVisual.lightPanel} text-center`}
          data-testid="library-browse-empty-state"
        >
          <p className={studioLibraryVisual.lightPanelBody}>
            {t("library.consistency.browse.empty" as never)}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {activeFilters ?
              <button
                type="button"
                className={studioLibraryVisual.filterToggle}
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
              className={studioLibraryVisual.filterToggle}
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
      <main className={studioLibraryVisual.pageMain}>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{inner}</section>
      </main>
    </StudioAuthGate>
  );
}

export { parseTab };
