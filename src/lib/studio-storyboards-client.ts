import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioSceneDetailResponse,
  StudioStoryboardDetailResponse,
  StudioStoryboardListResponse,
  StudioMotionProjectsResponse,
} from "@/types/studio-api";
import type { StudioStoryboardCreateInput, StudioStoryboardUpdateInput } from "@/lib/studio-storyboard-validation";
import type { StudioSceneCreateInput, StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

export async function fetchStudioStoryboards() {
  return fetchSameOriginJson<StudioStoryboardListResponse>(
    sameOriginApiPath("/api/studio/storyboards")
  );
}

export async function fetchStudioStoryboard(id: string) {
  return fetchSameOriginJson<StudioStoryboardDetailResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(id)}`)
  );
}

export async function createStudioStoryboardApi(body: StudioStoryboardCreateInput) {
  return fetchSameOriginJson<StudioStoryboardDetailResponse>(
    sameOriginApiPath("/api/studio/storyboards"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateStudioStoryboardApi(id: string, body: StudioStoryboardUpdateInput) {
  return fetchSameOriginJson<StudioStoryboardDetailResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(id)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioStoryboardApi(id: string) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(id)}`),
    { method: "DELETE" }
  );
}

export async function fetchStoryboardMotionProjects(storyboardId: string) {
  return fetchSameOriginJson<StudioMotionProjectsResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/motion-projects`
    )
  );
}

export async function createStudioSceneApi(storyboardId: string, body: StudioSceneCreateInput) {
  return fetchSameOriginJson<StudioSceneDetailResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateStudioSceneApi(
  storyboardId: string,
  sceneId: string,
  body: StudioSceneUpdateInput
) {
  return fetchSameOriginJson<StudioSceneDetailResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}`
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteStudioSceneApi(storyboardId: string, sceneId: string) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}`
    ),
    { method: "DELETE" }
  );
}

export async function duplicateStudioSceneApi(storyboardId: string, sceneId: string) {
  return fetchSameOriginJson<StudioSceneDetailResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/duplicate`
    ),
    { method: "POST" }
  );
}

export async function reorderStudioScenesApi(storyboardId: string, sceneIds: string[]) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/reorder`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds }),
    }
  );
}
