import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioLocationDetailResponse,
  StudioLocationListResponse,
} from "@/types/studio-api";
import type {
  StudioLocationCreateInput,
  StudioLocationUpdateInput,
} from "@/lib/studio-location-validation";

export async function fetchStudioLocations() {
  return fetchSameOriginJson<StudioLocationListResponse>(
    sameOriginApiPath("/api/studio/locations")
  );
}

export async function fetchStudioLocation(id: string) {
  return fetchSameOriginJson<StudioLocationDetailResponse>(
    sameOriginApiPath(`/api/studio/locations/${encodeURIComponent(id)}`)
  );
}

export async function createStudioLocationApi(body: StudioLocationCreateInput) {
  return fetchSameOriginJson<StudioLocationDetailResponse>(
    sameOriginApiPath("/api/studio/locations"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateStudioLocationApi(id: string, body: StudioLocationUpdateInput) {
  return fetchSameOriginJson<StudioLocationDetailResponse>(
    sameOriginApiPath(`/api/studio/locations/${encodeURIComponent(id)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioLocationApi(id: string) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(`/api/studio/locations/${encodeURIComponent(id)}`),
    { method: "DELETE" }
  );
}
