/**
 * Client-side voice library fetch with module-level cache (load once per session).
 * Initial load requests summary (no voice rows); full catalog loads in the background.
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

type CacheEntry = {
  payload: VoiceLibraryPayload;
  fetchedAt: number;
};

type VoiceLibraryStoreSnapshot = {
  payload: VoiceLibraryPayload | null;
  loading: boolean;
  loadingVoices: boolean;
  voicesReady: boolean;
  error: string;
};

let cached: CacheEntry | null = null;
let summaryInflight: Promise<VoiceLibraryPayload> | null = null;
let fullInflight: Promise<VoiceLibraryPayload> | null = null;
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

function isFullPayload(payload: VoiceLibraryPayload): boolean {
  return !payload.voicesDeferred && payload.catalog.voices.length > 0;
}

async function fetchVoiceLibraryFromApi(summary: boolean): Promise<VoiceLibraryPayload> {
  const url = summary ? "/api/studio/voice-library?summary=1" : "/api/studio/voice-library";
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Voice library fetch failed.");
  }
  return (await res.json()) as VoiceLibraryPayload;
}

function scheduleFullCatalogLoad(): void {
  if (fullInflight || (cached && isFullPayload(cached.payload))) {
    return;
  }

  setStoreSnapshot({
    ...storeSnapshot,
    loadingVoices: true,
  });

  fullInflight = (async () => {
    try {
      const payload = await fetchVoiceLibraryFromApi(false);
      cached = { payload, fetchedAt: Date.now() };
      setStoreSnapshot({
        payload,
        loading: false,
        loadingVoices: false,
        voicesReady: true,
        error: "",
      });
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice library fetch failed.";
      const keepSummary = Boolean(storeSnapshot.payload);
      setStoreSnapshot({
        payload: storeSnapshot.payload,
        loading: false,
        loadingVoices: false,
        voicesReady: keepSummary ? isFullPayload(storeSnapshot.payload!) : false,
        error: keepSummary ? "" : message,
      });
      throw err;
    } finally {
      fullInflight = null;
    }
  })();
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
    const voicesReady = isFullPayload(cached.payload);
    setStoreSnapshot({
      payload: cached.payload,
      loading: false,
      loadingVoices: !voicesReady,
      voicesReady,
      error: "",
    });
    if (!voicesReady) {
      scheduleFullCatalogLoad();
    }
    return cached.payload;
  }

  if (!options?.forceRefresh && summaryInflight) {
    setStoreSnapshot({
      payload: storeSnapshot.payload,
      loading: true,
      loadingVoices: storeSnapshot.loadingVoices,
      voicesReady: storeSnapshot.voicesReady,
      error: "",
    });
    const summary = await summaryInflight;
    scheduleFullCatalogLoad();
    return summary;
  }

  if (options?.forceRefresh) {
    cached = null;
    summaryInflight = null;
    fullInflight = null;
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
      const summaryPayload = await fetchVoiceLibraryFromApi(true);
      cached = { payload: summaryPayload, fetchedAt: Date.now() };
      setStoreSnapshot({
        payload: summaryPayload,
        loading: false,
        loadingVoices: true,
        voicesReady: false,
        error: "",
      });
      scheduleFullCatalogLoad();
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
  fullInflight = null;
  storeSnapshot = {
    payload: null,
    loading: false,
    loadingVoices: false,
    voicesReady: false,
    error: "",
  };
}

export function findVoiceInClientCatalog(voiceId: string): VoiceLibraryCatalog["voices"][number] | undefined {
  return cached?.payload.catalog.voices.find((v) => v.id === voiceId);
}
