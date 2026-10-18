/**
 * Client-side voice library fetch.
 * The first request is the summary only. Voice rows load later, one page at a time.
 */

import type { VoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import type {
  VoiceAccentCoverageRow,
  VoiceLibraryStats,
} from "@/lib/studio-voice-accent-coverage";
import type { VoicePersonaResolvedPreset } from "@/lib/studio-voice-persona-presets";

export type VoiceLibraryPayload = {
  catalog: VoiceLibraryCatalog;
  filterOptions: VoiceLibraryFilterOptions;
  personaPresets: VoicePersonaResolvedPreset[];
  stats: VoiceLibraryStats;
  accentCoverage: VoiceAccentCoverageRow[];
  voicesDeferred?: boolean;
};

export type VoiceLibraryPageVoice = {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  language: string;
  description: string;
  previewUrl: string;
  category?: string;
};

export type VoiceLibraryPageResult = {
  voices: VoiceLibraryPageVoice[];
  total: number;
  page: number;
  pageSize: number;
  languageCounts?: Array<{ value: string; voiceCount: number }>;
  accentCounts?: Array<{ value: string; labelKey: string; voiceCount: number; label?: string }>;
  localeCounts?: Array<{ value: string; label: string; voiceCount: number }>;
  suppressedAccentIds?: string[];
  genderCounts?: Array<{ value: string; labelKey: string; voiceCount: number }>;
  ageCounts?: Array<{ value: string; labelKey: string; voiceCount: number }>;
  categoryCounts?: Array<{ value: string; labelKey: string; voiceCount: number }>;
  useCaseCounts?: Array<{ value: string; voiceCount: number }>;
  descriptiveCounts?: Array<{ value: string; voiceCount: number }>;
  conceptCounts?: Array<{ concept: string; exact: number; related: number }>;
  relaxed?: boolean;
};

type CacheEntry = {
  payload: VoiceLibraryPayload;
  fetchedAt: number;
};

const pageCache = new Map<string, VoiceLibraryPageResult>();

type VoiceLibraryStoreSnapshot = {
  payload: VoiceLibraryPayload | null;
  loading: boolean;
  loadingVoices: boolean;
  voicesReady: boolean;
  error: string;
};

let cached: CacheEntry | null = null;
let summaryInflight: Promise<VoiceLibraryPayload> | null = null;
let storeSnapshot: VoiceLibraryStoreSnapshot = {
  payload: null,
  loading: false,
  loadingVoices: false,
  voicesReady: false,
  error: "",
};
const listeners = new Set<() => void>();

const CLIENT_CACHE_TTL_MS = 60 * 60 * 1000;

function emitStoreChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setStoreSnapshot(next: VoiceLibraryStoreSnapshot): void {
  storeSnapshot = next;
  emitStoreChange();
}

async function fetchVoiceLibraryFromApi(): Promise<VoiceLibraryPayload> {
  const res = await fetch("/api/studio/voice-library?summary=1");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Voice library fetch failed.");
  }
  return (await res.json()) as VoiceLibraryPayload;
}

export async function searchVoiceLibraryPage(params: {
  query?: string;
  language?: string;
  accent?: string;
  gender?: string;
  age?: string;
  sample?: "yes" | "no" | "";
  category?: string;
  locale?: string;
  useCase?: string;
  descriptive?: string;
  concepts?: string[];
  matchMode?: "strict" | "related";
  recommend?: boolean;
  favorites?: boolean;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<VoiceLibraryPageResult> {
  const search = new URLSearchParams({
    page: String(params.page ?? 0),
    pageSize: String(params.pageSize ?? 24),
  });
  if (params.recommend) {
    search.set("recommend", "1");
  }
  if (params.query?.trim()) {
    search.set("q", params.query.trim());
  }
  if (params.language?.trim()) {
    search.set("language", params.language.trim());
  }
  if (params.accent?.trim()) {
    search.set("accent", params.accent.trim());
  }
  if (params.gender?.trim()) {
    search.set("gender", params.gender.trim());
  }
  if (params.age?.trim()) {
    search.set("age", params.age.trim());
  }
  if (params.category?.trim()) {
    search.set("category", params.category.trim());
  }
  if (params.locale?.trim()) {
    search.set("locale", params.locale.trim());
  }
  if (params.useCase?.trim()) {
    search.set("useCase", params.useCase.trim());
  }
  if (params.descriptive?.trim()) {
    search.set("descriptive", params.descriptive.trim());
  }
  if (params.concepts?.length) {
    search.set("concepts", params.concepts.join(","));
  }
  if (params.matchMode === "related") {
    search.set("matchMode", "related");
  }
  if (params.sample === "yes" || params.sample === "no") {
    search.set("sample", params.sample);
  }
  const key = search.toString();
  if (params.favorites) {
    const res = await fetch(`/api/studio/voice-favorites?${key}`, { signal: params.signal });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Favorieten laden mislukt.");
    }
    return (await res.json()) as VoiceLibraryPageResult;
  }
  const cachedPage = pageCache.get(key);
  if (cachedPage) {
    return cachedPage;
  }
  const res = await fetch(`/api/studio/voice-library?${key}`, { signal: params.signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Voice library search failed.");
  }
  const page = (await res.json()) as VoiceLibraryPageResult;
  pageCache.set(key, page);
  return page;
}

export function subscribeVoiceLibraryStore(listener: () => void): () => void {
  listeners.add(listener);
  if (!storeSnapshot.payload && !storeSnapshot.loading && !storeSnapshot.error) {
    void fetchVoiceLibrary();
  }
  return () => listeners.delete(listener);
}

export function getVoiceLibraryStoreSnapshot(): VoiceLibraryStoreSnapshot {
  return storeSnapshot;
}

export async function fetchVoiceLibrary(options?: {
  forceRefresh?: boolean;
}): Promise<VoiceLibraryPayload> {
  const now = Date.now();
  if (!options?.forceRefresh && cached && now - cached.fetchedAt < CLIENT_CACHE_TTL_MS) {
    setStoreSnapshot({
      payload: cached.payload,
      loading: false,
      loadingVoices: false,
      voicesReady: true,
      error: "",
    });
    return cached.payload;
  }

  if (!options?.forceRefresh && summaryInflight) {
    setStoreSnapshot({
      payload: storeSnapshot.payload,
      loading: true,
      loadingVoices: false,
      voicesReady: storeSnapshot.voicesReady,
      error: "",
    });
    return summaryInflight;
  }

  if (options?.forceRefresh) {
    cached = null;
    summaryInflight = null;
    pageCache.clear();
  }

  setStoreSnapshot({
    payload: storeSnapshot.payload,
    loading: true,
    loadingVoices: false,
    voicesReady: false,
    error: "",
  });

  summaryInflight = (async () => {
    try {
      const summaryPayload = await fetchVoiceLibraryFromApi();
      cached = { payload: summaryPayload, fetchedAt: Date.now() };
      setStoreSnapshot({
        payload: summaryPayload,
        loading: false,
        loadingVoices: false,
        voicesReady: true,
        error: "",
      });
      return summaryPayload;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice library fetch failed.";
      setStoreSnapshot({
        payload: storeSnapshot.payload,
        loading: false,
        loadingVoices: false,
        voicesReady: false,
        error: message,
      });
      throw err;
    } finally {
      summaryInflight = null;
    }
  })();

  return summaryInflight;
}

export function clearVoiceLibraryClientCacheForTests(): void {
  cached = null;
  summaryInflight = null;
  pageCache.clear();
  storeSnapshot = {
    payload: null,
    loading: false,
    loadingVoices: false,
    voicesReady: false,
    error: "",
  };
}

export async function fetchVoiceFavoriteIds(voiceIds: string[], signal?: AbortSignal): Promise<string[]> {
  const ids = voiceIds.map((id) => id.trim()).filter(Boolean).slice(0, 48);
  if (ids.length === 0) return [];
  const res = await fetch(`/api/studio/voice-favorites?voiceIds=${encodeURIComponent(ids.join(","))}`, { signal });
  if (!res.ok) return [];
  const body = (await res.json()) as { favoriteIds?: string[] };
  return body.favoriteIds ?? [];
}

export async function setVoiceFavorite(providerVoiceId: string, favorite: boolean): Promise<boolean> {
  const res = await fetch("/api/studio/voice-favorites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ providerVoiceId, favorite }),
  });
  return res.ok;
}

export function findVoiceInClientCatalog(voiceId: string): VoiceLibraryCatalog["voices"][number] | undefined {
  return cached?.payload.catalog.voices.find((v) => v.id === voiceId);
}
