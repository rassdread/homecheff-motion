import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildScenePrompt } from "@/lib/studio-prompt-builder";
import {
  buildSceneImageGenerationPrompt,
  buildSceneImageReferenceAssets,
} from "@/lib/studio-scene-image-prompt";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { getSceneImageProvider, getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import { uploadStudioSceneImageBuffers } from "@/server/studio/studio-scene-image-blob";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import {
  mapStudioSceneToDetail,
  toSceneSnapshot,
  type ServiceError,
} from "@/server/studio/studio-storyboard-service";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";
import type { SessionUser } from "@/server/auth/session";
import type {
  StudioSceneImageGenerationSettings,
  StudioSceneImageListItem,
} from "@/types/studio-scene-image";
import { PROMPT_BUILDER_VERSION } from "@/types/studio-prompt-builder";
import { deleteStudioReferenceBlob } from "@/server/studio/studio-reference-blob";

const SCENE_FOR_IMAGE_INCLUDE = {
  storyboard: true,
  location: true,
  characters: { include: { character: true } },
  props: { include: { prop: true } },
  sceneImages: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.StudioSceneInclude;

type SceneForImageRow = Prisma.StudioSceneGetPayload<{ include: typeof SCENE_FOR_IMAGE_INCLUDE }>;

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

async function loadSceneForImage(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ scene: SceneForImageRow } | { error: ServiceError }> {
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: SCENE_FOR_IMAGE_INCLUDE,
  });
  if (!scene) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, scene.storyboard)) {
    return { error: serviceError("FORBIDDEN", "You cannot modify this storyboard.", 403) };
  }
  return { scene };
}

async function nextGenerationVersion(sceneId: string): Promise<number> {
  const max = await prisma.studioSceneImage.aggregate({
    where: { sceneId },
    _max: { generationVersion: true },
  });
  return (max._max.generationVersion ?? 0) + 1;
}

async function runSceneImageGeneration(params: {
  imageRowId: string;
  scene: SceneForImageRow;
}): Promise<{ image: StudioSceneImageListItem } | { error: ServiceError }> {
  const styleProfile = normalizeStudioPromptStyleProfile(params.scene.storyboard.promptStyleProfile);
  const snapshot = toSceneSnapshot(params.scene);
  const promptOutput = buildScenePrompt(snapshot, styleProfile);
  const fullPrompt = buildSceneImageGenerationPrompt(snapshot, promptOutput);
  const generationVersion = await nextGenerationVersion(params.scene.id);

  const settings: StudioSceneImageGenerationSettings = {
    styleProfile,
    promptVersion: PROMPT_BUILDER_VERSION,
    generationVersion,
    referenceAssets: buildSceneImageReferenceAssets(snapshot),
  };

  await prisma.studioSceneImage.update({
    where: { id: params.imageRowId },
    data: {
      status: "generating",
      generatedPrompt: fullPrompt,
      promptVersion: PROMPT_BUILDER_VERSION,
      generationVersion,
      generationSettings: settings as unknown as Prisma.InputJsonValue,
      provider: getSelectedSceneImageProviderId(),
    },
  });

  try {
    const provider = getSceneImageProvider();
    const result = await provider.generate({
      prompt: fullPrompt,
      sceneId: params.scene.id,
      imageRecordId: params.imageRowId,
      ownerId: params.scene.storyboard.ownerId,
    });

    const thumbContentType = result.thumbnailBuffer === result.imageBuffer
      ? result.contentType
      : "image/jpeg";

    const uploaded = await uploadStudioSceneImageBuffers({
      ownerId: params.scene.storyboard.ownerId,
      storyboardId: params.scene.storyboardId,
      sceneId: params.scene.id,
      imageId: params.imageRowId,
      imageBuffer: result.imageBuffer,
      thumbnailBuffer: result.thumbnailBuffer,
      imageContentType: result.contentType,
      thumbContentType,
    });

    const completed = await prisma.studioSceneImage.update({
      where: { id: params.imageRowId },
      data: {
        status: "completed",
        imageUrl: uploaded.imageUrl,
        storageKey: uploaded.storageKey,
        thumbnailUrl: uploaded.thumbnailUrl,
        provider: result.provider,
        seed: result.seed,
        generationSettings: {
          ...settings,
          model: result.model,
          size: result.size,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { image: mapStudioSceneImageToListItem(completed) };
  } catch (err) {
    await prisma.studioSceneImage.update({
      where: { id: params.imageRowId },
      data: { status: "failed" },
    });
    const message = err instanceof Error ? err.message : "Scene image generation failed.";
    return {
      error: serviceError("GENERATION_FAILED", message.slice(0, 500), 502),
    };
  }
}

export async function generateStudioSceneImage(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ image: StudioSceneImageListItem } | { error: ServiceError }> {
  const loaded = await loadSceneForImage(storyboardId, sceneId, viewer);
  if ("error" in loaded) {
    return loaded;
  }

  const queued = await prisma.studioSceneImage.create({
    data: {
      sceneId,
      status: "queued",
      promptVersion: PROMPT_BUILDER_VERSION,
      generationVersion: 0,
      generatedPrompt: "",
      provider: getSelectedSceneImageProviderId(),
    },
  });

  return runSceneImageGeneration({ imageRowId: queued.id, scene: loaded.scene });
}

export async function regenerateStudioSceneImage(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ image: StudioSceneImageListItem } | { error: ServiceError }> {
  return generateStudioSceneImage(storyboardId, sceneId, viewer);
}

export async function listStudioSceneImages(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ images: StudioSceneImageListItem[] } | { error: ServiceError }> {
  const loaded = await loadSceneForImage(storyboardId, sceneId, viewer);
  if ("error" in loaded) {
    return loaded;
  }

  const rows = await prisma.studioSceneImage.findMany({
    where: { sceneId },
    orderBy: { createdAt: "desc" },
  });

  return { images: rows.map(mapStudioSceneImageToListItem) };
}

export async function deleteStudioSceneImage(
  storyboardId: string,
  sceneId: string,
  imageId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const loaded = await loadSceneForImage(storyboardId, sceneId, viewer);
  if ("error" in loaded) {
    return loaded;
  }

  const row = await prisma.studioSceneImage.findFirst({
    where: { id: imageId, sceneId },
  });
  if (!row) {
    return { error: serviceError("NOT_FOUND", "Scene image not found.", 404) };
  }

  if (loaded.scene.selectedSceneImageId === imageId) {
    await prisma.studioScene.update({
      where: { id: sceneId },
      data: { selectedSceneImageId: null },
    });
  }

  await prisma.studioSceneImage.delete({ where: { id: imageId } });

  if (row.imageUrl) {
    await deleteStudioReferenceBlob(row.imageUrl);
  }
  if (row.thumbnailUrl && row.thumbnailUrl !== row.imageUrl) {
    await deleteStudioReferenceBlob(row.thumbnailUrl);
  }

  return { ok: true };
}

export async function setPreferredStudioSceneImage(
  storyboardId: string,
  sceneId: string,
  imageId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ scene: ReturnType<typeof mapStudioSceneToDetail> } | { error: ServiceError }> {
  const loaded = await loadSceneForImage(storyboardId, sceneId, viewer);
  if ("error" in loaded) {
    return loaded;
  }

  const image = await prisma.studioSceneImage.findFirst({
    where: { id: imageId, sceneId, status: "completed" },
  });
  if (!image) {
    return {
      error: serviceError(
        "INVALID_IMAGE",
        "Select a completed scene image.",
        400
      ),
    };
  }

  const updated = await prisma.studioScene.update({
    where: { id: sceneId },
    data: { selectedSceneImageId: imageId },
    include: {
      location: true,
      characters: { include: { character: true } },
      props: { include: { prop: true } },
      sceneImages: { orderBy: { createdAt: "desc" } },
    },
  });

  return { scene: mapStudioSceneToDetail(updated) };
}

export type BulkSceneImageResult = {
  sceneId: string;
  ok: boolean;
  imageId?: string;
  error?: string;
};

export async function bulkGenerateStudioStoryboardSceneImages(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ results: BulkSceneImageResult[] } | { error: ServiceError }> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    include: {
      scenes: {
        orderBy: { order: "asc" },
        include: SCENE_FOR_IMAGE_INCLUDE,
      },
    },
  });

  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "You cannot modify this storyboard.", 403) };
  }

  const results: BulkSceneImageResult[] = [];

  for (const scene of storyboard.scenes) {
    const queued = await prisma.studioSceneImage.create({
      data: {
        sceneId: scene.id,
        status: "queued",
        promptVersion: PROMPT_BUILDER_VERSION,
        generationVersion: 0,
        generatedPrompt: "",
        provider: getSelectedSceneImageProviderId(),
      },
    });

    const gen = await runSceneImageGeneration({ imageRowId: queued.id, scene });
    if ("error" in gen) {
      results.push({
        sceneId: scene.id,
        ok: false,
        error: gen.error.message,
      });
    } else {
      results.push({
        sceneId: scene.id,
        ok: true,
        imageId: gen.image.id,
      });
    }
  }

  return { results };
}
