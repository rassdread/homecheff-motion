"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  fetchVoiceLibrary,
  getVoiceLibraryStoreSnapshot,
  subscribeVoiceLibraryStore,
  type VoiceLibraryPayload,
} from "@/lib/studio-voice-library-client";

type VoiceLibraryContextValue = {
  payload: VoiceLibraryPayload | null;
  loading: boolean;
  loadingVoices: boolean;
  voicesReady: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const VoiceLibraryContext = createContext<VoiceLibraryContextValue | null>(null);

function useVoiceLibraryStore(): VoiceLibraryContextValue {
  const snapshot = useSyncExternalStore(
    subscribeVoiceLibraryStore,
    getVoiceLibraryStoreSnapshot,
    getVoiceLibraryStoreSnapshot
  );

  const refresh = useCallback(async () => {
    await fetchVoiceLibrary({ forceRefresh: true });
  }, []);

  return useMemo(
    () => ({
      payload: snapshot.payload,
      loading: snapshot.loading,
      loadingVoices: snapshot.loadingVoices,
      voicesReady: snapshot.voicesReady,
      error: snapshot.error,
      refresh,
    }),
    [
      snapshot.error,
      snapshot.loading,
      snapshot.loadingVoices,
      snapshot.payload,
      snapshot.voicesReady,
      refresh,
    ]
  );
}

export function VoiceLibraryProvider({ children }: { children: ReactNode }) {
  const value = useVoiceLibraryStore();

  return (
    <VoiceLibraryContext.Provider value={value}>{children}</VoiceLibraryContext.Provider>
  );
}

export function useVoiceLibrary(): VoiceLibraryContextValue {
  const ctx = useContext(VoiceLibraryContext);
  if (!ctx) {
    throw new Error("useVoiceLibrary must be used within VoiceLibraryProvider");
  }
  return ctx;
}

export function useOptionalVoiceLibrary(): VoiceLibraryContextValue | null {
  return useContext(VoiceLibraryContext);
}
