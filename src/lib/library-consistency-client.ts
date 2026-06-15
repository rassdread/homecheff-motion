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

export async function queryLibraryConsistency(
  input: LibraryConsistencyQueryInput = {}
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
