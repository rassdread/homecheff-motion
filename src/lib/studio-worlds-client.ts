import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioWorldProfileDetailResponse,
  StudioWorldProfileListResponse,
} from "@/types/studio-api";
import type {
  StudioWorldProfileCreateInput,
  StudioWorldProfileUpdateInput,
} from "@/lib/studio-world-profile-validation";

export async function fetchStudioWorlds() {
  return fetchSameOriginJson<StudioWorldProfileListResponse>(
    sameOriginApiPath("/api/studio/worlds")
  );
}

export async function fetchStudioWorld(id: string) {
  return fetchSameOriginJson<StudioWorldProfileDetailResponse>(
    sameOriginApiPath(`/api/studio/worlds/${encodeURIComponent(id)}`)
  );
}

export async function createStudioWorldApi(body: StudioWorldProfileCreateInput) {
  return fetchSameOriginJson<StudioWorldProfileDetailResponse>(
    sameOriginApiPath("/api/studio/worlds"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateStudioWorldApi(id: string, body: StudioWorldProfileUpdateInput) {
  return fetchSameOriginJson<StudioWorldProfileDetailResponse>(
    sameOriginApiPath(`/api/studio/worlds/${encodeURIComponent(id)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioWorldApi(id: string) {
  return fetchSameOriginJson<{ ok: true }>(
    sameOriginApiPath(`/api/studio/worlds/${encodeURIComponent(id)}`),
    { method: "DELETE" }
  );
}
