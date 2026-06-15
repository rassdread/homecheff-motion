import {
  filterLibraryRecordsByTab,
  queryLibraryAssetIndex,
  type LibraryAssetIndexQuery,
  type LibraryConsistencyFilterTab,
} from "@/lib/library-asset-index";
import type { LibraryConsistencyRecord, LibrarySourceModule } from "@/types/library-consistency";

export type LibraryBrowseFilterState = {
  tab: LibraryConsistencyFilterTab;
  textSearch?: string;
  motionReady?: boolean;
  characterType?: string;
  fusionArchetype?: string;
  sourceModule?: LibrarySourceModule;
  workflow?: string;
  projectId?: string;
};

export type LibraryRelationBadge = {
  id: string;
  labelKey: string;
  href?: string | null;
};

export const LIBRARY_BROWSE_SOURCE_MODULES: LibrarySourceModule[] = [
  "studio",
  "editor",
  "motion",
  "publish",
  "wizard",
  "extraction",
];

const USED_IN_MODULE_LABELS: Partial<Record<LibrarySourceModule, string>> = {
  studio: "library.consistency.badge.usedInStudio",
  motion: "library.consistency.badge.usedInMotion",
  publish: "library.consistency.badge.usedInPublish",
  editor: "library.consistency.badge.usedInEditor",
};

export function buildLibraryRelationBadges(record: LibraryConsistencyRecord): LibraryRelationBadge[] {
  const badges: LibraryRelationBadge[] = [];
  if (record.projectTitle) {
    badges.push({
      id: "from-project",
      labelKey: "library.consistency.badge.fromProject",
    });
  }
  const modules = record.usedInModules ?? (record.sourceModule ? [record.sourceModule] : []);
  for (const module of modules) {
    const labelKey = USED_IN_MODULE_LABELS[module];
    if (labelKey && !badges.some((b) => b.id === `used-${module}`)) {
      badges.push({ id: `used-${module}`, labelKey });
    }
  }
  return badges;
}

export function applyLibraryBrowseFilters(
  records: LibraryConsistencyRecord[],
  filters: LibraryBrowseFilterState
): LibraryConsistencyRecord[] {
  const tabbed = filterLibraryRecordsByTab(records, filters.tab, filters.projectId);
  const query: LibraryAssetIndexQuery = {
    textSearch: filters.textSearch,
    motionReady: filters.motionReady,
    characterType: filters.characterType || undefined,
    fusionArchetype: filters.fusionArchetype || undefined,
    sourceModule: filters.sourceModule,
    workflow: filters.workflow || undefined,
    projectId: filters.tab === "project" ? filters.projectId : filters.projectId || undefined,
  };
  return queryLibraryAssetIndex(tabbed, query);
}

export function isLibraryBrowseEmpty(_filters: LibraryBrowseFilterState, resultCount: number): boolean {
  return resultCount === 0;
}

export function hasActiveLibraryBrowseFilters(filters: LibraryBrowseFilterState): boolean {
  return Boolean(
    filters.textSearch?.trim() ||
      filters.motionReady !== undefined ||
      filters.characterType ||
      filters.fusionArchetype ||
      filters.sourceModule ||
      filters.workflow ||
      filters.projectId ||
      filters.tab !== "recent"
  );
}

export function defaultLibraryBrowseFilters(
  overrides?: Partial<LibraryBrowseFilterState>
): LibraryBrowseFilterState {
  return {
    tab: "recent",
    ...overrides,
  };
}

export function clearLibraryBrowseFilters(
  keep?: Partial<LibraryBrowseFilterState>
): LibraryBrowseFilterState {
  return defaultLibraryBrowseFilters({ tab: keep?.tab ?? "recent", projectId: keep?.projectId });
}
