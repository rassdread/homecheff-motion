import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  StudioBulkSceneImageResponse,
  StudioSceneDetailResponse,
  StudioSceneImageDetailResponse,
  StudioSceneImageListResponse,
} from "@/types/studio-api";
import type {
  StudioSceneConsistencyAnalyzeResponse,
  StudioStoryboardConsistencyAnalyzeResponse,
} from "@/types/studio-consistency";
import type {
  RegenerateWithCorrectionsResponse,
  SceneCorrectionPreviewResponse,
  StoryboardGenerateCorrectionsResponse,
} from "@/types/studio-correction";
import type {
  StudioSceneVisionAnalyzeResponse,
  StudioStoryboardVisionAnalyzeResponse,
} from "@/types/studio-vision-consistency";

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

export async function analyzeStudioSceneImageConsistencyApi(
  storyboardId: string,
  sceneId: string,
  imageId: string
) {
  return fetchSameOriginJson<StudioSceneConsistencyAnalyzeResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(imageId)}/analyze-consistency`
    ),
    { method: "POST" }
  );
}

export async function analyzeStudioStoryboardConsistencyApi(storyboardId: string) {
  return fetchSameOriginJson<StudioStoryboardConsistencyAnalyzeResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/analyze-consistency`
    ),
    { method: "POST" }
  );
}

export async function previewStudioSceneCorrectionsApi(
  storyboardId: string,
  sceneId: string,
  sourceImageId?: string
) {
  const qs = sourceImageId
    ? `?sourceImageId=${encodeURIComponent(sourceImageId)}`
    : "";
  return fetchSameOriginJson<{ preview: SceneCorrectionPreviewResponse }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/corrections-preview${qs}`
    )
  );
}

export async function regenerateStudioSceneImageWithCorrectionsApi(
  storyboardId: string,
  sceneId: string,
  sourceImageId: string
) {
  return fetchSameOriginJson<RegenerateWithCorrectionsResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(sourceImageId)}/regenerate-with-corrections`
    ),
    { method: "POST" }
  );
}

export async function generateStoryboardCorrectionsApi(storyboardId: string) {
  return fetchSameOriginJson<StoryboardGenerateCorrectionsResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/generate-corrections`
    ),
    { method: "POST" }
  );
}

export async function analyzeStudioSceneImageVisionApi(
  storyboardId: string,
  sceneId: string,
  imageId: string
) {
  return fetchSameOriginJson<StudioSceneVisionAnalyzeResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/scenes/${encodeURIComponent(sceneId)}/images/${encodeURIComponent(imageId)}/analyze-vision`
    ),
    { method: "POST" }
  );
}

export async function analyzeStudioStoryboardVisionApi(storyboardId: string) {
  return fetchSameOriginJson<StudioStoryboardVisionAnalyzeResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/analyze-vision`
    ),
    { method: "POST" }
  );
}
