import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioCharacterDetailResponse,
  StudioCharacterListResponse,
} from "@/types/studio-api";
import type {
  StudioCharacterCreateInput,
  StudioCharacterUpdateInput,
} from "@/lib/studio-character-validation";

export async function fetchStudioCharacters() {
  return fetchSameOriginJson<StudioCharacterListResponse>(
    sameOriginApiPath("/api/studio/characters")
  );
}

export async function fetchStudioCharacter(id: string) {
  return fetchSameOriginJson<StudioCharacterDetailResponse>(
    sameOriginApiPath(`/api/studio/characters/${encodeURIComponent(id)}`)
  );
}

export async function createStudioCharacterApi(body: StudioCharacterCreateInput) {
  return fetchSameOriginJson<StudioCharacterDetailResponse>(
    sameOriginApiPath("/api/studio/characters"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateStudioCharacterApi(
  id: string,
  body: StudioCharacterUpdateInput
) {
  return fetchSameOriginJson<StudioCharacterDetailResponse>(
    sameOriginApiPath(`/api/studio/characters/${encodeURIComponent(id)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioCharacterApi(id: string) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(`/api/studio/characters/${encodeURIComponent(id)}`),
    { method: "DELETE" }
  );
}

export type CharacterVoiceHistoryEntryClient = {
  id: string;
  eventType: string;
  createdAt: string;
  before: {
    voiceEnabled: boolean;
    voiceProfile: string;
    voiceDescription?: string;
    voiceLock: boolean;
  };
  after: {
    voiceEnabled: boolean;
    voiceProfile: string;
    voiceDescription?: string;
    voiceLock: boolean;
  };
};

export async function fetchCharacterVoiceHistory(characterId: string) {
  return fetchSameOriginJson<{ entries: CharacterVoiceHistoryEntryClient[] }>(
    sameOriginApiPath(
      `/api/studio/characters/${encodeURIComponent(characterId)}/voice-history`
    )
  );
}

export async function cloneCharacterVoiceApi(
  characterId: string,
  params: {
    sample: File;
    voiceName: string;
    consentConfirmed: boolean;
    voiceLock?: boolean;
    language?: string;
    mock?: boolean;
  }
) {
  const form = new FormData();
  form.append("sample", params.sample);
  form.append("voiceName", params.voiceName);
  form.append("consentConfirmed", params.consentConfirmed ? "true" : "false");
  if (params.voiceLock != null) {
    form.append("voiceLock", params.voiceLock ? "true" : "false");
  }
  if (params.language) {
    form.append("language", params.language);
  }
  if (params.mock) {
    form.append("mock", "true");
  }

  return fetchSameOriginJson<{
    ok: boolean;
    character: import("@/types/studio-api").StudioCharacterListItem;
    clonedVoiceName?: string;
    voiceProfileRef?: string;
    provider?: string;
    previewAudioUrl?: string | null;
    error?: string;
    code?: string;
  }>(sameOriginApiPath(`/api/studio/characters/${encodeURIComponent(characterId)}/voice-clone`), {
    method: "POST",
    body: form,
  });
}
