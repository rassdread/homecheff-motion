import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioJobCancelResponse,
  StudioJobCreateInput,
  StudioJobCreateResponse,
  StudioJobDetailResponse,
  StudioJobListResponse,
  StudioJobType,
} from "@/types/studio-job";

export async function createStudioJobApi(
  storyboardId: string,
  type: StudioJobType,
  input?: StudioJobCreateInput
) {
  return fetchSameOriginJson<StudioJobCreateResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/jobs`),
    {
      method: "POST",
      body: JSON.stringify({
        type,
        sceneIds: input?.sceneIds,
        imageIds: input?.imageIds,
        options: input?.options,
      }),
    }
  );
}

export async function listStudioJobsApi(storyboardId: string) {
  return fetchSameOriginJson<StudioJobListResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/jobs`)
  );
}

export async function fetchStudioJobApi(storyboardId: string, jobId: string) {
  return fetchSameOriginJson<StudioJobDetailResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/jobs/${encodeURIComponent(jobId)}`
    )
  );
}

export async function cancelStudioJobApi(storyboardId: string, jobId: string) {
  return fetchSameOriginJson<StudioJobCancelResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/jobs/${encodeURIComponent(jobId)}/cancel`
    ),
    { method: "POST" }
  );
}

export function isStudioJobActive(status: string): boolean {
  return status === "queued" || status === "running";
}
