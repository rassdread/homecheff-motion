import type {
  LibraryConsistencyCategory,
  LibraryConsistencyRecord,
  LibraryGenerationType,
  LibrarySourceModule,
} from "@/types/library-consistency";

export type LibraryAssetIndexEntry = LibraryConsistencyRecord & {
  assetId: string;
};

export type LibraryAssetIndexQuery = {
  projectId?: string;
  generationType?: LibraryGenerationType;
  category?: LibraryConsistencyCategory;
  sourceModule?: LibrarySourceModule;
  workflow?: string;
  motionReady?: boolean;
  characterType?: string;
  fusionArchetype?: string;
  fusionIntent?: string;
  textSearch?: string;
  limit?: number;
};

export type LibraryAssetIndexStats = {
  total: number;
  byCategory: Record<string, number>;
  bySourceModule: Record<string, number>;
  videoCount: number;
  characterCount: number;
  exportCount: number;
};

export type LibraryProjectAssetStats = {
  assetCount: number;
  videoCount: number;
  exportCount: number;
  characterCount: number;
  lastAssetActivityAt: string | null;
};

export function toLibraryAssetIndexEntry(record: LibraryConsistencyRecord): LibraryAssetIndexEntry {
  return {
    ...record,
    assetId: record.registryAssetId,
  };
}

export function buildLibraryAssetIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexEntry[] {
  return records.map(toLibraryAssetIndexEntry);
}

export function queryLibraryAssetIndex(
  records: LibraryConsistencyRecord[],
  query: LibraryAssetIndexQuery = {}
): LibraryAssetIndexEntry[] {
  let results = buildLibraryAssetIndex(records);

  if (query.projectId) {
    results = results.filter((r) => r.projectId === query.projectId);
  }
  if (query.generationType) {
    results = results.filter((r) => r.generationType === query.generationType);
  }
  if (query.category) {
    results = results.filter((r) => r.category === query.category);
  }
  if (query.sourceModule) {
    results = results.filter((r) => r.sourceModule === query.sourceModule);
  }
  if (query.workflow) {
    results = results.filter((r) => r.workflow === query.workflow);
  }
  if (query.motionReady !== undefined) {
    results = results.filter((r) => r.motionReady === query.motionReady);
  }
  if (query.characterType) {
    results = results.filter((r) => r.characterType === query.characterType);
  }
  if (query.fusionArchetype) {
    results = results.filter((r) => r.fusionArchetype === query.fusionArchetype);
  }
  if (query.fusionIntent) {
    results = results.filter((r) => r.fusionIntent === query.fusionIntent);
  }
  if (query.textSearch?.trim()) {
    const hay = query.textSearch.trim().toLowerCase();
    results = results.filter(
      (r) =>
        r.assetName.toLowerCase().includes(hay) ||
        (r.projectTitle?.toLowerCase().includes(hay) ?? false) ||
        (r.promptSummary?.toLowerCase().includes(hay) ?? false)
    );
  }

  const limit = query.limit ?? results.length;
  return results.slice(0, limit);
}

export function listCharactersInLibraryIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexEntry[] {
  return queryLibraryAssetIndex(records, {
    category: "characters",
    limit: 200,
  }).concat(
    queryLibraryAssetIndex(records, { category: "mascots", limit: 200 })
  );
}

export function listMotionVideosInLibraryIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexEntry[] {
  return queryLibraryAssetIndex(records, { generationType: "motion_output", limit: 200 });
}

export function listFusionOutputsInLibraryIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexEntry[] {
  return records
    .filter((r) => r.fusionArchetype || r.fusionIntent || r.generationType === "editor_variant")
    .map(toLibraryAssetIndexEntry)
    .slice(0, 200);
}

export function listPublishExportsInLibraryIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexEntry[] {
  return queryLibraryAssetIndex(records, { generationType: "publish_export", limit: 200 });
}

export function listAssetsForProjectIndex(
  records: LibraryConsistencyRecord[],
  projectId: string
): LibraryAssetIndexEntry[] {
  return queryLibraryAssetIndex(records, { projectId, limit: 500 });
}

export function summarizeLibraryAssetIndex(records: LibraryConsistencyRecord[]): LibraryAssetIndexStats {
  const byCategory: Record<string, number> = {};
  const bySourceModule: Record<string, number> = {};
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
    bySourceModule[record.sourceModule] = (bySourceModule[record.sourceModule] ?? 0) + 1;
  }
  return {
    total: records.length,
    byCategory,
    bySourceModule,
    videoCount: records.filter((r) => r.generationType === "motion_output").length,
    characterCount: records.filter(
      (r) => r.generationType === "character" || r.generationType === "character_extraction" || r.generationType === "mascot"
    ).length,
    exportCount: records.filter((r) => r.generationType === "publish_export").length,
  };
}

export function summarizeLibraryAssetsForProject(
  records: LibraryConsistencyRecord[],
  projectId: string
): LibraryProjectAssetStats {
  const projectRecords = records.filter((r) => r.projectId === projectId);
  let lastAssetActivityAt: string | null = null;
  for (const record of projectRecords) {
    const at = record.updatedAt ?? record.createdAt;
    if (!lastAssetActivityAt || at > lastAssetActivityAt) {
      lastAssetActivityAt = at;
    }
  }
  return {
    assetCount: projectRecords.length,
    videoCount: projectRecords.filter((r) => r.generationType === "motion_output").length,
    exportCount: projectRecords.filter((r) => r.generationType === "publish_export").length,
    characterCount: projectRecords.filter(
      (r) =>
        r.generationType === "character" ||
        r.generationType === "character_extraction" ||
        r.generationType === "mascot"
    ).length,
    lastAssetActivityAt,
  };
}

export function buildLibraryProjectStatsMap(
  records: LibraryConsistencyRecord[]
): Record<string, LibraryProjectAssetStats> {
  const projectIds = new Set(
    records.map((r) => r.projectId).filter((id): id is string => Boolean(id?.trim()))
  );
  const map: Record<string, LibraryProjectAssetStats> = {};
  for (const projectId of projectIds) {
    map[projectId] = summarizeLibraryAssetsForProject(records, projectId);
  }
  return map;
}

export function sortLibraryRecordsRecent(records: LibraryConsistencyRecord[]): LibraryConsistencyRecord[] {
  return [...records].sort((a, b) => {
    const aAt = a.updatedAt ?? a.createdAt;
    const bAt = b.updatedAt ?? b.createdAt;
    return bAt.localeCompare(aAt);
  });
}

export function countLibraryRecordsByTab(
  records: LibraryConsistencyRecord[],
  projectId?: string
): Record<LibraryConsistencyFilterTab, number> {
  const counts = {} as Record<LibraryConsistencyFilterTab, number>;
  for (const tab of LIBRARY_CONSISTENCY_FILTER_TABS) {
    counts[tab] = filterLibraryRecordsByTab(records, tab, projectId).length;
  }
  return counts;
}

export const LIBRARY_CONSISTENCY_FILTER_TABS = [
  "characters",
  "mascots",
  "fusion",
  "motion",
  "publish",
  "voice",
  "music",
  "sfx",
  "references",
  "uploads",
  "recent",
  "project",
] as const;

export type LibraryConsistencyFilterTab = (typeof LIBRARY_CONSISTENCY_FILTER_TABS)[number];

export function filterLibraryRecordsByTab(
  records: LibraryConsistencyRecord[],
  tab: LibraryConsistencyFilterTab,
  projectId?: string
): LibraryConsistencyRecord[] {
  switch (tab) {
    case "characters":
      return records.filter((r) => r.category === "characters");
    case "mascots":
      return records.filter((r) => r.category === "mascots");
    case "fusion":
      return records.filter((r) => r.fusionArchetype || r.fusionIntent || r.generationType === "editor_variant");
    case "motion":
      return records.filter((r) => r.generationType === "motion_output");
    case "publish":
      return records.filter((r) => r.generationType === "publish_export");
    case "voice":
      return records.filter((r) => r.category === "voices");
    case "music":
      return records.filter((r) => r.category === "music");
    case "sfx":
      return records.filter((r) => r.category === "sfx");
    case "references":
      return records.filter((r) => r.backingStore === "generated_reference");
    case "uploads":
      return records.filter((r) => r.backingStore === "user_upload" && r.generationType !== "motion_output");
    case "project":
      return projectId ? records.filter((r) => r.projectId === projectId) : records;
    case "recent":
      return sortLibraryRecordsRecent(records);
    default:
      return records;
  }
}
