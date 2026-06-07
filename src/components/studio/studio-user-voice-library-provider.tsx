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
  fetchUserVoiceLibrary,
  getUserVoiceLibraryStoreSnapshot,
  subscribeUserVoiceLibraryStore,
} from "@/lib/studio-user-voice-library-client";
import type { UserVoiceLibrary } from "@/types/studio-user-voice-library";

type UserVoiceLibraryContextValue = {
  library: UserVoiceLibrary | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const UserVoiceLibraryContext = createContext<UserVoiceLibraryContextValue | null>(null);

function useUserVoiceLibraryStore(): UserVoiceLibraryContextValue {
  const snapshot = useSyncExternalStore(
    subscribeUserVoiceLibraryStore,
    getUserVoiceLibraryStoreSnapshot,
    getUserVoiceLibraryStoreSnapshot
  );

  const refresh = useCallback(async () => {
    await fetchUserVoiceLibrary({ forceRefresh: true });
  }, []);

  return useMemo(
    () => ({
      library: snapshot.library,
      loading: snapshot.loading,
      error: snapshot.error,
      refresh,
    }),
    [snapshot.error, snapshot.library, snapshot.loading, refresh]
  );
}

export function UserVoiceLibraryProvider({ children }: { children: ReactNode }) {
  const value = useUserVoiceLibraryStore();
  return (
    <UserVoiceLibraryContext.Provider value={value}>{children}</UserVoiceLibraryContext.Provider>
  );
}

export function useUserVoiceLibrary(): UserVoiceLibraryContextValue {
  const ctx = useContext(UserVoiceLibraryContext);
  if (!ctx) {
    throw new Error("useUserVoiceLibrary must be used within UserVoiceLibraryProvider");
  }
  return ctx;
}

export function useOptionalUserVoiceLibrary(): UserVoiceLibraryContextValue | null {
  return useContext(UserVoiceLibraryContext);
}
