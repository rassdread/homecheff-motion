/**
 * Client-side user voice clone library (module cache, load once per session).
 */

import type { UserVoiceLibrary } from "@/types/studio-user-voice-library";

type StoreSnapshot = {
  library: UserVoiceLibrary | null;
  loading: boolean;
  error: string;
};

let storeSnapshot: StoreSnapshot = {
  library: null,
  loading: false,
  error: "",
};
let inflight: Promise<UserVoiceLibrary> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(next: Partial<StoreSnapshot>): void {
  storeSnapshot = { ...storeSnapshot, ...next };
  emit();
}

export function subscribeUserVoiceLibraryStore(listener: () => void): () => void {
  listeners.add(listener);
  if (!storeSnapshot.library && !storeSnapshot.loading && !storeSnapshot.error) {
    void fetchUserVoiceLibrary();
  }
  return () => listeners.delete(listener);
}

export function getUserVoiceLibraryStoreSnapshot(): StoreSnapshot {
  return storeSnapshot;
}

export async function fetchUserVoiceLibrary(options?: {
  forceRefresh?: boolean;
}): Promise<UserVoiceLibrary> {
  if (!options?.forceRefresh && storeSnapshot.library) {
    return storeSnapshot.library;
  }
  if (!options?.forceRefresh && inflight) {
    return inflight;
  }

  setSnapshot({ loading: true, error: "" });
  inflight = (async () => {
    const res = await fetch("/api/studio/user-voice-library");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "User voice library fetch failed.");
    }
    const payload = (await res.json()) as { library: UserVoiceLibrary };
    setSnapshot({ library: payload.library, loading: false, error: "" });
    return payload.library;
  })();

  try {
    return await inflight;
  } catch (err) {
    const message = err instanceof Error ? err.message : "User voice library unavailable.";
    setSnapshot({ loading: false, error: message });
    throw err;
  } finally {
    inflight = null;
  }
}

export async function createUserVoiceCloneApi(params: {
  sample: File;
  voiceName: string;
  consentConfirmed: boolean;
  language?: string;
  linkCharacterId?: string;
  voiceLock?: boolean;
}): Promise<{
  ok: boolean;
  cloneId?: string;
  voiceProfileRef?: string;
  clonedVoiceName?: string;
  previewAudioUrl?: string | null;
  character?: import("@/types/studio-api").StudioCharacterListItem;
  error?: string;
}> {
  const form = new FormData();
  form.append("sample", params.sample);
  form.append("voiceName", params.voiceName);
  form.append("consentConfirmed", params.consentConfirmed ? "true" : "false");
  if (params.language) {
    form.append("language", params.language);
  }
  if (params.linkCharacterId) {
    form.append("linkCharacterId", params.linkCharacterId);
  }
  if (params.voiceLock != null) {
    form.append("voiceLock", params.voiceLock ? "true" : "false");
  }

  const res = await fetch("/api/studio/voice-clones", { method: "POST", body: form });
  const data = (await res.json()) as {
    ok?: boolean;
    cloneId?: string;
    voiceProfileRef?: string;
    clonedVoiceName?: string;
    previewAudioUrl?: string | null;
    linkedCharacter?: import("@/types/studio-api").StudioCharacterListItem;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error ?? "Voice clone failed." };
  }
  await fetchUserVoiceLibrary({ forceRefresh: true });
  return {
    ok: true,
    cloneId: data.cloneId,
    voiceProfileRef: data.voiceProfileRef,
    clonedVoiceName: data.clonedVoiceName,
    previewAudioUrl: data.previewAudioUrl,
    character: data.linkedCharacter,
  };
}

export async function renameUserVoiceCloneApi(cloneId: string, name: string): Promise<boolean> {
  const res = await fetch(`/api/studio/voice-clones/${encodeURIComponent(cloneId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    return false;
  }
  await fetchUserVoiceLibrary({ forceRefresh: true });
  return true;
}

export function clearUserVoiceLibraryClientCacheForTests(): void {
  storeSnapshot = { library: null, loading: false, error: "" };
  inflight = null;
}
