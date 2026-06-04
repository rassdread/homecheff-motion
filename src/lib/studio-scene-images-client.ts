import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioBulkSceneImageResponse,
  StudioSceneDetailResponse,
  StudioSceneImageDetailResponse,
  StudioSceneImageListResponse,
} from "@/types/studio-api";

export async function fetchStudioSceneImages(storyboardId: string, sceneId: string) {
  return fetchSameOriginJson<StudioSceneImageListResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images`
    )
  );
}

export async function generateStudioSceneImageApi(storyboardId: string, sceneId: string) {
  return fetchSameOriginJson<StudioSceneImageDetailResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images`
    ),
    { method: "POST" }
  );
}

export async function deleteStudioSceneImageApi(
  storyboardId: string,
  sceneId: string,
  imageId: string
) {
  return fetchSameOriginJson<{ ok: boolean; error?: string; code?: string }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(imageId)}`
    ),
    { method: "DELETE" }
  );
}

export async function selectStudioSceneImageApi(
  storyboardId: string,
  sceneId: string,
  imageId: string
) {
  return fetchSameOriginJson<StudioSceneDetailResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(imageId)}/select`
    ),
    { method: "POST" }
  );
}

export async function bulkGenerateStudioSceneImagesApi(storyboardId: string) {
  return fetchSameOriginJson<StudioBulkSceneImageResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/generate-scene-images`
    ),
    { method: "POST" }
  );
}
