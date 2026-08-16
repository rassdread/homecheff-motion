import { notifyStudioLibraryRefresh } from "@/lib/studio-library-refresh";
import type {
  LibraryConsistencyRecord,
  LibraryFusionMetadata,
  LibraryGenerationType,
  LibraryMotionMetadata,
  LibraryPublishMetadata,
  LibrarySourceModule,
} from "@/types/library-consistency";

export type RegisterLibraryConsistencyClientInput = {
  generationType: LibraryGenerationType;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  assetName?: string;
  promptSummary?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceModule?: LibrarySourceModule;
  backingId?: string;
  isMascot?: boolean;
  isLogo?: boolean;
  sourceRoute?: string | null;
  characterCompleteness?: string | null;
  motionReadinessScore?: number | null;
  motionReady?: boolean | null;
  missingParts?: string[] | null;
  characterType?: string | null;
  assetType?: string | null;
  workflow?: string | null;
  storyboardId?: string | null;
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
  motionMetadata?: LibraryMotionMetadata | null;
  publishMetadata?: LibraryPublishMetadata | null;
  usedInModules?: LibrarySourceModule[];
};

export async function registerCompletedGenerationInLibraryClient(
  input: RegisterLibraryConsistencyClientInput
): Promise<{ ok: true; record: LibraryConsistencyRecord } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/studio/library-consistency/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      record?: LibraryConsistencyRecord;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.record) {
      return { ok: false, error: data.error ?? `Register failed (${res.status})` };
    }
    invalidateLibraryConsistencyQueryCache();
    notifyStudioLibraryRefresh();
    return { ok: true, record: data.record };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Library registration failed.",
    };
  }
}

export async function fetchRecentLibraryAdditions(limit = 12): Promise<LibraryConsistencyRecord[]> {
  try {
    const res = await fetch(`/api/studio/library-consistency/recent?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { records?: LibraryConsistencyRecord[] };
    return data.records ?? [];
  } catch {
    return [];
  }
}

export type LibraryConsistencyQueryInput = {
  tab?: string;
  textSearch?: string;
  motionReady?: boolean;
  characterType?: string;
  fusionArchetype?: string;
  sourceModule?: LibrarySourceModule;
  workflow?: string;
  projectId?: string;
  limit?: number;
};

export type LibraryConsistencyQueryResponse = {
  ok: boolean;
  stats?: import("@/lib/library-asset-index").LibraryAssetIndexStats;
  tabCounts?: Partial<Record<import("@/lib/library-asset-index").LibraryConsistencyFilterTab, number>>;
  projectStats?: Record<string, import("@/lib/library-asset-index").LibraryProjectAssetStats>;
  results?: import("@/lib/library-asset-index").LibraryAssetIndexEntry[];
  error?: string;
};

const QUERY_CACHE_MS = 5000;
const queryInflight = new Map<string, Promise<LibraryConsistencyQueryResponse>>();
const queryCache = new Map<string, { at: number; data: LibraryConsistencyQueryResponse }>();

/** Unfiltered list bootstrap — browse/hub still coalesce concurrent unfiltered queries. */
const BOOTSTRAP_LIMIT = 500;
let bootstrapInflight: Promise<LibraryConsistencyQueryResponse> | null = null;
let bootstrapCache: { at: number; data: LibraryConsistencyQueryResponse } | null = null;

export function invalidateLibraryConsistencyQueryCache(): void {
  queryInflight.clear();
  queryCache.clear();
  bootstrapInflight = null;
  bootstrapCache = null;
}

function isBootstrapCompatible(input: LibraryConsistencyQueryInput): boolean {
  return (
    !input.tab &&
    !input.textSearch &&
    input.motionReady === undefined &&
    !input.characterType &&
    !input.fusionArchetype &&
    !input.sourceModule &&
    !input.workflow &&
    !input.projectId
  );
}

function queryKey(input: LibraryConsistencyQueryInput): string {
  return JSON.stringify({
    tab: input.tab ?? null,
    textSearch: input.textSearch ?? null,
    motionReady: input.motionReady ?? null,
    characterType: input.characterType ?? null,
    fusionArchetype: input.fusionArchetype ?? null,
    sourceModule: input.sourceModule ?? null,
    workflow: input.workflow ?? null,
    projectId: input.projectId ?? null,
    limit: input.limit ?? 500,
  });
}

async function postLibraryQuery(
  input: LibraryConsistencyQueryInput
): Promise<LibraryConsistencyQueryResponse> {
  try {
    const res = await fetch("/api/studio/library-consistency/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const data = (await res.json()) as LibraryConsistencyQueryResponse;
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Query failed (${res.status})` };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Library query failed.",
    };
  }
}

async function fetchLibraryBootstrap(): Promise<LibraryConsistencyQueryResponse> {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCache.at < QUERY_CACHE_MS) {
    return bootstrapCache.data;
  }
  if (bootstrapInflight) {
    return bootstrapInflight;
  }
  bootstrapInflight = (async () => {
    const data = await postLibraryQuery({ limit: BOOTSTRAP_LIMIT });
    if (data.ok) {
      bootstrapCache = { at: Date.now(), data };
    }
    return data;
  })();
  try {
    return await bootstrapInflight;
  } finally {
    bootstrapInflight = null;
  }
}

function sliceBootstrapResults(
  data: LibraryConsistencyQueryResponse,
  limit: number
): LibraryConsistencyQueryResponse {
  if (!data.ok || !data.results || data.results.length <= limit) {
    return data;
  }
  return { ...data, results: data.results.slice(0, limit) };
}

export async function queryLibraryConsistency(
  input: LibraryConsistencyQueryInput = {}
): Promise<LibraryConsistencyQueryResponse> {
  const limit = Math.min(input.limit ?? 500, 500);

  // Browse/hub unfiltered queries share one bootstrap fetch (SP.2D-C1).
  // Home/assistant use /recent instead (SP.2D-F) and do not enter this path.
  if (isBootstrapCompatible(input)) {
    const boot = await fetchLibraryBootstrap();
    return sliceBootstrapResults(boot, limit);
  }

  const key = queryKey({ ...input, limit });
  const now = Date.now();
  const cached = queryCache.get(key);
  if (cached && now - cached.at < QUERY_CACHE_MS) {
    return cached.data;
  }
  const existing = queryInflight.get(key);
  if (existing) {
    return existing;
  }
  const promise = (async () => {
    const data = await postLibraryQuery({ ...input, limit });
    if (data.ok) {
      queryCache.set(key, { at: Date.now(), data });
    }
    return data;
  })();
  queryInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    queryInflight.delete(key);
  }
}
