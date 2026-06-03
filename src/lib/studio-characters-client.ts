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
