/**
 * Client-side voice library fetch with module-level cache (load once per session).
 */

import type { VoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import type { VoicePersonaResolvedPreset } from "@/lib/studio-voice-persona-presets";

export type VoiceLibraryPayload = {
  catalog: VoiceLibraryCatalog;
  filterOptions: VoiceLibraryFilterOptions;
  personaPresets: VoicePersonaResolvedPreset[];
};

type CacheEntry = {
  payload: VoiceLibraryPayload;
  fetchedAt: number;
};

type VoiceLibraryStoreSnapshot = {
  payload: VoiceLibraryPayload | null;
  loading: boolean;
  error: string;
};

let cached: CacheEntry | null = null;
let inflight: Promise<VoiceLibraryPayload> | null = null;
let storeSnapshot: VoiceLibraryStoreSnapshot = {
  payload: null,
  loading: false,
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
    setStoreSnapshot({ payload: cached.payload, loading: false, error: "" });
    return cached.payload;
  }

  if (!options?.forceRefresh && inflight) {
    setStoreSnapshot({ payload: storeSnapshot.payload, loading: true, error: "" });
    return inflight;
  }

  setStoreSnapshot({ payload: storeSnapshot.payload, loading: true, error: "" });

  inflight = (async () => {
    try {
      const res = await fetch("/api/studio/voice-library");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Voice library fetch failed.");
      }
      const payload = (await res.json()) as VoiceLibraryPayload;
      cached = { payload, fetchedAt: Date.now() };
      setStoreSnapshot({ payload, loading: false, error: "" });
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice library fetch failed.";
      setStoreSnapshot({ payload: storeSnapshot.payload, loading: false, error: message });
      throw err;
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function clearVoiceLibraryClientCacheForTests(): void {
  cached = null;
  inflight = null;
  storeSnapshot = { payload: null, loading: false, error: "" };
}

export function findVoiceInClientCatalog(voiceId: string): VoiceLibraryCatalog["voices"][number] | undefined {
  return cached?.payload.catalog.voices.find((v) => v.id === voiceId);
}
