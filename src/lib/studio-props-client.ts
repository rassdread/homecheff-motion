import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { StudioPropDetailResponse, StudioPropListResponse } from "@/types/studio-api";
import type { StudioPropCreateInput, StudioPropUpdateInput } from "@/lib/studio-prop-validation";

export async function fetchStudioProps() {
  return fetchSameOriginJson<StudioPropListResponse>(sameOriginApiPath("/api/studio/props"));
}

export async function fetchStudioProp(id: string) {
  return fetchSameOriginJson<StudioPropDetailResponse>(
    sameOriginApiPath(`/api/studio/props/${encodeURIComponent(id)}`)
  );
}

export async function createStudioPropApi(body: StudioPropCreateInput) {
  return fetchSameOriginJson<StudioPropDetailResponse>(sameOriginApiPath("/api/studio/props"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateStudioPropApi(id: string, body: StudioPropUpdateInput) {
  return fetchSameOriginJson<StudioPropDetailResponse>(
    sameOriginApiPath(`/api/studio/props/${encodeURIComponent(id)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioPropApi(id: string) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(`/api/studio/props/${encodeURIComponent(id)}`),
    { method: "DELETE" }
  );
}
