import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  prismaProductionHeartbeat,
  withPrismaProductionRetry,
} from "@/lib/prisma-production-retry";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { buildScenePromptFromSceneRow, buildUpcFromStoryboardDetail, buildProductionInstructionsForScene } from "@/server/studio/studio-prompt-builder-service";
import {
  buildSceneImageGenerationPrompt,
  buildSceneImageReferenceAssets,
} from "@/lib/studio-scene-image-prompt";
import { pickReferenceUrlsForStillAdapter } from "@/lib/studio-production-prompt-orchestrator";
import { isSceneContextStale } from "@/lib/studio-unified-production-context";
import { buildProductionSpineTrace, redactProductionTraceForLog } from "@/lib/studio-production-spine-trace";
import { collectWorldsFromWorldProfilePicks, type WorldProfilePick } from "@/lib/studio-prompt-source-entities";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { getSceneImageProvider, getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import { uploadStudioSceneImageBuffers } from "@/server/studio/studio-scene-image-blob";
import { buildSceneCorrectionBundle } from "@/lib/build-scene-correction-bundle";
import { buildCharacterIdentityDriftLinesForStoryboard } from "@/lib/studio-character-timeline";
import { parseSceneConsistencyReport } from "@/lib/studio-consistency-report-parse";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import {
  computeCombinedImprovementScore,
} from "@/lib/studio-improvement-score";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import {
  assessSceneRerenderQa,
  buildSceneRerenderExecutionPrompt,
  buildSceneTransformationExecutionRecord,
  resolveApprovedSceneStillBase,
  resolveSceneRerenderRoute,
  shouldUseApprovedBaseEdit,
} from "@/lib/studio-scene-rerender-runtime";
import type { ImageChangeTarget } from "@/types/studio-image-transformation";
import type { ClothingMaskStatus } from "@/types/studio-image-transformation";
import {
  analyzeAndPersistSceneImage,
  analyzeSceneImageConsistency,
  persistSceneImageConsistency,
} from "@/server/studio/studio-consistency-service";
import {
  analyzeSceneImageVision,
  persistSceneImageVision,
} from "@/server/studio/studio-vision-service";
import type { SceneCorrectionBundle } from "@/types/studio-correction";
import type { RegenerateWithCorrectionsResponse } from "@/types/studio-correction";
import {
  mapStudioSceneToDetail,
  mapStudioStoryboardToDetail,
  STUDIO_SCENE_DETAIL_INCLUDE,
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
import {
  meterOpenAiSceneImage,
  type StudioCostFeature,
} from "@/server/provider-cost/studio-cost-metering";

const SCENE_FOR_IMAGE_INCLUDE = {
  storyboard: true,
  location: { include: { worldProfile: { select: { id: true, name: true, description: true, visualStyle: true, tone: true, continuityRules: true, continuityStrength: true } } } },
  characters: {
    include: {
      character: {
        include: {
          worldProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              visualStyle: true,
              tone: true,
              continuityRules: true,
              continuityStrength: true,
            },
          },
        },
      },
    },
  },
  props: {
    include: {
      prop: {
        include: {
          worldProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              visualStyle: true,
              tone: true,
              continuityRules: true,
              continuityStrength: true,
            },
          },
        },
      },
    },
  },
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

type SceneImageGenerationOverrides = {
  fullPrompt: string;
  correctedPrompt?: string;
  correction?: SceneCorrectionBundle;
  regeneratedFromImageId?: string;
  previousConsistencyScore?: number | null;
  previousVisionScore?: number | null;
  changeTargets?: ImageChangeTarget[];
  forceFullGeneration?: boolean;
};

async function runSceneImageGeneration(params: {
  imageRowId: string;
  scene: SceneForImageRow;
  overrides?: SceneImageGenerationOverrides;
  costFeature?: StudioCostFeature;
}): Promise<{ image: StudioSceneImageListItem } | { error: ServiceError }> {
  const styleProfile = normalizeStudioPromptStyleProfile(params.scene.storyboard.promptStyleProfile);
  const snapshot = toSceneSnapshot(params.scene);
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: params.scene.characters,
    location: params.scene.location,
    props: params.scene.props,
  });
  const boardRow = await prisma.studioStoryboard.findFirst({
    where: { id: params.scene.storyboardId },
    include: {
      scenes: { orderBy: { order: "asc" }, include: STUDIO_SCENE_DETAIL_INCLUDE },
    },
  });
  const boardDetail = boardRow ? mapStudioStoryboardToDetail(boardRow) : undefined;
  const worldPicks: WorldProfilePick[] = [];
  if (boardRow) {
    for (const scene of boardRow.scenes) {
      for (const link of scene.characters) {
        if (link.character.worldProfile) {
          worldPicks.push(link.character.worldProfile as WorldProfilePick);
        }
      }
      if (scene.location?.worldProfile) {
        worldPicks.push(scene.location.worldProfile as WorldProfilePick);
      }
      for (const link of scene.props) {
        if (link.prop.worldProfile) {
          worldPicks.push(link.prop.worldProfile as WorldProfilePick);
        }
      }
    }
  }
  const upc = boardDetail
    ? buildUpcFromStoryboardDetail(boardDetail, {
        source: "workspace",
        worlds: collectWorldsFromWorldProfilePicks(worldPicks),
      })
    : null;
  const promptOutput = buildScenePromptFromSceneRow(params.scene, styleProfile, undefined, {
    storyboard: boardDetail,
  });
  const identityDriftLines = boardDetail
    ? buildCharacterIdentityDriftLinesForStoryboard(boardDetail)
    : [];
  const sceneDetail = mapStudioSceneToDetail(params.scene);
  const production = upc
    ? buildProductionInstructionsForScene({
        upc,
        scene: sceneDetail,
        target: params.overrides?.regeneratedFromImageId ? "rerender" : "scene-image",
        identityDriftLines,
        storyboard: boardDetail,
      })
    : null;
  const defaultFullPrompt = production
    ? production.assembledPrompt
    : buildSceneImageGenerationPrompt(snapshot, promptOutput, {
        identityDriftLines,
        memoryBundle,
      });
  const fullPrompt = params.overrides?.fullPrompt ?? defaultFullPrompt;
  const generationVersion = await nextGenerationVersion(params.scene.id);
  const correction = params.overrides?.correction;
  const referenceImages = production ? pickReferenceUrlsForStillAdapter(production) : [];
  const stale = upc
    ? isSceneContextStale({
        storedUpcHash:
          typeof params.scene.sceneImages[0]?.generationSettings === "object" &&
          params.scene.sceneImages[0]?.generationSettings &&
          "upcHash" in (params.scene.sceneImages[0].generationSettings as object)
            ? String((params.scene.sceneImages[0].generationSettings as { upcHash?: string }).upcHash ?? "")
            : null,
        current: upc,
        sceneId: params.scene.id,
      })
    : false;

  const approvedStill = resolveApprovedSceneStillBase({
    selectedSceneImageId: params.scene.selectedSceneImageId,
    sceneImages: params.scene.sceneImages.map((img) => ({
      id: img.id,
      status: img.status,
      imageUrl: img.imageUrl,
      generationVersion: img.generationVersion,
      promptVersion: img.promptVersion,
    })),
  });
  // Prefer explicit regenerate lineage when provided (corrections / improve).
  const lineageBase =
    params.overrides?.regeneratedFromImageId
      ? params.scene.sceneImages.find(
          (img) =>
            img.id === params.overrides?.regeneratedFromImageId &&
            img.status === "completed" &&
            Boolean(img.imageUrl?.trim())
        )
      : null;
  const baseStill = lineageBase
    ? {
        id: lineageBase.id,
        url: lineageBase.imageUrl.trim(),
        generationVersion: lineageBase.generationVersion,
        promptVersion: lineageBase.promptVersion,
      }
    : approvedStill;

  const isNetNew =
    !baseStill &&
    !params.scene.sceneImages.some((img) => img.status === "completed" && img.imageUrl.trim());
  const useApprovedBase = shouldUseApprovedBaseEdit({
    approvedStill: baseStill,
    isNetNewSceneGeneration: isNetNew,
    forceFullGeneration: params.overrides?.forceFullGeneration,
  });

  let transformationExecution: StudioSceneImageGenerationSettings["transformationExecution"];
  let providerPrompt = fullPrompt;
  let sourceImageUrl: string | undefined;
  let generationIntent: "TRANSFORM_EXISTING_ASSET" | undefined;
  const maskStatus: ClothingMaskStatus = "MASK_UNAVAILABLE";

  if (useApprovedBase && baseStill) {
    const { intent, plan, trace } = resolveSceneRerenderRoute({
      approvedStill: baseStill,
      upc,
      sceneId: params.scene.id,
      changeTargets: params.overrides?.changeTargets,
      correctionText:
        params.overrides?.correctedPrompt ??
        correction?.correctedPrompt ??
        correction?.patches?.map((p) => `${p.type} ${p.text}`).join(" ") ??
        null,
      forceFullGeneration: params.overrides?.forceFullGeneration,
    });

    if (plan.actualRoute === "TEXT_TO_IMAGE" || !plan.actualRoute) {
      // Explicit last resort only when allowTextOnlyFallback; otherwise keep failing path without destroying BASE.
      if (intent.allowTextOnlyFallback) {
        transformationExecution = buildSceneTransformationExecutionRecord({
          intent,
          plan: {
            ...plan,
            actualRoute: "TEXT_TO_IMAGE",
            downgradeReason: plan.downgradeReason ?? "EDIT_ROUTE_UNAVAILABLE",
            protectionLost: [
              ...plan.protectionLost,
              "APPROVED_BASE_PIXEL_CONTINUITY",
            ],
          },
          trace,
          maskStatus,
          maskStorageKey: null,
          providerModel: null,
          providerCallCount: 1,
          segmentationCallCount: 0,
          qa: assessSceneRerenderQa({
            maskStatus,
            providerSucceeded: false,
            plan,
            usedApprovedBase: false,
          }),
          baseSceneImageId: baseStill.id,
        });
      } else {
        sourceImageUrl = baseStill.url;
        generationIntent = "TRANSFORM_EXISTING_ASSET";
        providerPrompt = buildSceneRerenderExecutionPrompt({
          intent,
          plan: {
            ...plan,
            actualRoute: plan.actualRoute ?? "BASE_IMAGE_EDIT",
          },
          productionPrompt: fullPrompt,
        });
        transformationExecution = buildSceneTransformationExecutionRecord({
          intent,
          plan: {
            ...plan,
            actualRoute: plan.actualRoute ?? "BASE_IMAGE_EDIT",
          },
          trace,
          maskStatus,
          maskStorageKey: null,
          providerModel: null,
          providerCallCount: 1,
          segmentationCallCount: 0,
          qa: assessSceneRerenderQa({
            maskStatus,
            providerSucceeded: true,
            plan: { ...plan, actualRoute: plan.actualRoute ?? "BASE_IMAGE_EDIT" },
            usedApprovedBase: true,
          }),
          baseSceneImageId: baseStill.id,
        });
      }
    } else {
      sourceImageUrl = baseStill.url;
      generationIntent = "TRANSFORM_EXISTING_ASSET";
      providerPrompt = buildSceneRerenderExecutionPrompt({
        intent,
        plan,
        productionPrompt: fullPrompt,
      });
      transformationExecution = buildSceneTransformationExecutionRecord({
        intent,
        plan,
        trace,
        maskStatus,
        maskStorageKey: null,
        providerModel: null,
        providerCallCount: 1,
        segmentationCallCount: 0,
        qa: assessSceneRerenderQa({
          maskStatus,
          providerSucceeded: true,
          plan,
          usedApprovedBase: true,
        }),
        baseSceneImageId: baseStill.id,
      });
    }
  }

  const settings: StudioSceneImageGenerationSettings = {
    styleProfile,
    promptVersion: PROMPT_BUILDER_VERSION,
    generationVersion,
    referenceAssets: buildSceneImageReferenceAssets(snapshot, memoryBundle),
    upcVersion: upc?.version,
    upcHash: upc?.upcHash,
    sceneContextHash: production?.sceneContextHash,
    characterIds: sceneDetail.characters.map((c) => c.id),
    locationId: sceneDetail.locationId,
    propIds: sceneDetail.props.map((p) => p.id),
    providerMode: production?.providerMode,
    referenceAccounting: production?.referenceAccounting.map((row) => ({
      entityId: row.entityId,
      accounting: row.accounting,
      reason: row.reason,
    })),
    contextStale: stale,
    transformationExecution,
    baseSceneImageId: baseStill?.id ?? null,
    generationMode: generationIntent === "TRANSFORM_EXISTING_ASSET" ? "image_edit" : undefined,
  };

  if (upc && production) {
    console.info(
      "[studio-production-spine]",
      JSON.stringify(
        redactProductionTraceForLog(
          buildProductionSpineTrace({
            upc,
            instructions: production,
            storedUpcHash: settings.upcHash,
          })
        )
      )
    );
  }

  await prisma.studioSceneImage.update({
    where: { id: params.imageRowId },
    data: {
      status: "generating",
      generatedPrompt: providerPrompt,
      correctedPrompt: params.overrides?.correctedPrompt ?? correction?.correctedPrompt ?? "",
      promptVersion: PROMPT_BUILDER_VERSION,
      generationVersion,
      generationSettings: settings as unknown as Prisma.InputJsonValue,
      provider: getSelectedSceneImageProviderId(),
      regeneratedFromImageId: params.overrides?.regeneratedFromImageId ?? null,
      previousConsistencyScore: params.overrides?.previousConsistencyScore ?? null,
      previousVisionScore: params.overrides?.previousVisionScore ?? null,
      correctionRecommendations: correction
        ? (correction.recommendations as unknown as Prisma.InputJsonValue)
        : undefined,
      promptPatches: correction
        ? (correction.patches as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  try {
    const provider = getSceneImageProvider();
    const costFeature = params.costFeature ?? "scene_image_generate";
    const meteringCtx = {
      userId: params.scene.storyboard.ownerId,
      storyboardId: params.scene.storyboardId,
      sceneId: params.scene.id,
      feature: costFeature,
      relatedJobId: params.imageRowId,
    };
    const result = await provider.generate({
      prompt: providerPrompt,
      sceneId: params.scene.id,
      imageRecordId: params.imageRowId,
      ownerId: params.scene.storyboard.ownerId,
      referenceImages,
      sourceImageUrl,
      generationIntent,
      identityLockLevel: generationIntent === "TRANSFORM_EXISTING_ASSET" ? 2 : undefined,
      logRoute: "/api/studio/storyboards/scenes/images",
    });

    meterOpenAiSceneImage({
      ctx: meteringCtx,
      status: "completed",
      imageCount: 1,
      model: result.model,
      size: result.size,
      imageRecordId: params.imageRowId,
      providerId: result.provider,
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

    const finalExecution = transformationExecution
      ? {
          ...transformationExecution,
          providerModel: result.model ?? transformationExecution.providerModel,
          qa: assessSceneRerenderQa({
            maskStatus,
            providerSucceeded: true,
            plan: {
              requestedRoute: transformationExecution.requestedRoute,
              actualRoute: transformationExecution.actualRoute,
              downgradeReason: transformationExecution.downgradeReason,
              protectionLost: transformationExecution.protectionLost,
            } as import("@/types/studio-image-transformation").TransformationPlan,
            usedApprovedBase: Boolean(sourceImageUrl),
          }),
        }
      : transformationExecution;

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
          generationMode: result.generationMode ?? settings.generationMode,
          transformationExecution: finalExecution,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const consistencyReport = analyzeSceneImageConsistency({
      scene: params.scene,
      generatedPrompt: completed.generatedPrompt,
    });
    const withConsistency = await persistSceneImageConsistency(
      completed.id,
      consistencyReport
    );

    try {
      const visionReport = await analyzeSceneImageVision({
        scene: params.scene,
        imageUrl: completed.imageUrl,
        thumbnailUrl: completed.thumbnailUrl,
        generatedPrompt: completed.generatedPrompt,
        metering: {
          userId: params.scene.storyboard.ownerId,
          storyboardId: params.scene.storyboardId,
          sceneId: params.scene.id,
          feature: "vision_scene_qa",
          relatedJobId: completed.id,
        },
      });
      await persistSceneImageVision(completed.id, visionReport);
    } catch {
      // Vision is best-effort after generation; prompt consistency still persisted.
    }

    const previousConsistency = params.overrides?.previousConsistencyScore;
    if (
      previousConsistency !== undefined &&
      previousConsistency !== null &&
      params.overrides?.regeneratedFromImageId
    ) {
      const finalRow = await prisma.studioSceneImage.findUnique({
        where: { id: completed.id },
      });
      const newVisionScore = finalRow?.visionScore ?? null;
      const combined = computeCombinedImprovementScore({
        previousConsistencyScore: previousConsistency,
        newConsistencyScore: consistencyReport.overallScore,
        previousVisionScore: params.overrides.previousVisionScore,
        newVisionScore: newVisionScore,
      });
      const improved = await prisma.studioSceneImage.update({
        where: { id: completed.id },
        data: {
          improvementScore: combined.consistency.delta,
          visionImprovementScore: combined.vision.delta,
          overallImprovementScore: combined.overallDelta,
        },
      });
      return { image: mapStudioSceneImageToListItem(improved) };
    }

    const finalRow = await prisma.studioSceneImage.findUnique({
      where: { id: completed.id },
    });
    return { image: finalRow ? mapStudioSceneImageToListItem(finalRow) : withConsistency };
  } catch (err) {
    meterOpenAiSceneImage({
      ctx: {
        userId: params.scene.storyboard.ownerId,
        storyboardId: params.scene.storyboardId,
        sceneId: params.scene.id,
        feature: params.costFeature ?? "scene_image_generate",
        relatedJobId: params.imageRowId,
      },
      status: "failed",
      imageRecordId: params.imageRowId,
      providerId: getSelectedSceneImageProviderId(),
    });
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
  viewer: Pick<SessionUser, "id" | "role">,
  options?: { costFeature?: StudioCostFeature }
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

  return runSceneImageGeneration({
    imageRowId: queued.id,
    scene: loaded.scene,
    costFeature: options?.costFeature ?? "scene_image_generate",
  });
}

export async function regenerateStudioSceneImage(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ image: StudioSceneImageListItem } | { error: ServiceError }> {
  return generateStudioSceneImage(storyboardId, sceneId, viewer, {
    costFeature: "scene_image_regenerate",
  });
}

export async function regenerateStudioSceneImageWithCorrections(
  storyboardId: string,
  sceneId: string,
  sourceImageId: string | undefined,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<RegenerateWithCorrectionsResponse | { error: ServiceError }> {
  const loaded = await loadSceneForImage(storyboardId, sceneId, viewer);
  if ("error" in loaded) {
    return loaded;
  }

  const source =
    (sourceImageId
      ? loaded.scene.sceneImages.find((img) => img.id === sourceImageId)
      : null) ??
    loaded.scene.sceneImages.find((img) => img.id === loaded.scene.selectedSceneImageId) ??
    loaded.scene.sceneImages.find((img) => img.status === "completed");

  if (!source || source.status !== "completed" || !source.generatedPrompt.trim()) {
    return {
      error: serviceError(
        "NO_SOURCE_IMAGE",
        "Select a completed scene image to regenerate with corrections.",
        400
      ),
    };
  }

  let report = parseSceneConsistencyReport(source.consistencyReport);
  if (!report) {
    const analyzed = await analyzeAndPersistSceneImage(
      storyboardId,
      sceneId,
      source.id,
      viewer
    );
    if ("error" in analyzed) {
      return analyzed;
    }
    report = analyzed.report;
  }

  const bundle = buildSceneCorrectionBundle({
    basePrompt: source.generatedPrompt,
    consistencyReport: report,
    visionReport: parseVisionConsistencyReport(source.visionReport),
  });

  const queued = await prisma.studioSceneImage.create({
    data: {
      sceneId,
      status: "queued",
      promptVersion: PROMPT_BUILDER_VERSION,
      generationVersion: 0,
      generatedPrompt: "",
      correctedPrompt: bundle.correctedPrompt,
      provider: getSelectedSceneImageProviderId(),
      regeneratedFromImageId: source.id,
      previousConsistencyScore: source.consistencyScore,
      previousVisionScore: source.visionScore,
      correctionRecommendations: bundle.recommendations as unknown as Prisma.InputJsonValue,
      promptPatches: bundle.patches as unknown as Prisma.InputJsonValue,
    },
  });

  const gen = await runSceneImageGeneration({
    imageRowId: queued.id,
    scene: loaded.scene,
    costFeature: "scene_image_regenerate_corrections",
    overrides: {
      fullPrompt: bundle.correctedPrompt,
      correctedPrompt: bundle.correctedPrompt,
      correction: bundle,
      regeneratedFromImageId: source.id,
      previousConsistencyScore: source.consistencyScore,
      previousVisionScore: source.visionScore,
    },
  });

  if ("error" in gen) {
    return gen;
  }

  const finalRow = await prisma.studioSceneImage.findUnique({ where: { id: gen.image.id } });
  const finalReport =
    parseSceneConsistencyReport(finalRow?.consistencyReport ?? null) ?? report;

  const improvement = computeCombinedImprovementScore({
    previousConsistencyScore: source.consistencyScore,
    newConsistencyScore: gen.image.consistencyScore ?? finalReport.overallScore,
    previousVisionScore: source.visionScore,
    newVisionScore: gen.image.visionScore,
  });

  return {
    image: gen.image,
    correction: bundle,
    improvement,
    consistencyReport: finalReport,
    visionReport: parseVisionConsistencyReport(finalRow?.visionReport ?? null),
  };
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
    include: STUDIO_SCENE_DETAIL_INCLUDE,
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

    const gen = await runSceneImageGeneration({
      imageRowId: queued.id,
      scene,
      costFeature: "scene_image_bulk",
    });
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

export async function ensureStoryboardSceneImagesForProduction(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
}): Promise<
  | { ok: true; generated: number; skipped: number; retried: number }
  | { ok: false; error: string; code?: string }
> {
  const storyboard = await withPrismaProductionRetry("load-storyboard", () =>
    prisma.studioStoryboard.findUnique({
      where: { id: params.storyboardId },
      include: {
        scenes: {
          orderBy: { order: "asc" },
          include: SCENE_FOR_IMAGE_INCLUDE,
        },
      },
    })
  );

  if (!storyboard) {
    return { ok: false, error: "Storyboard not found", code: "NOT_FOUND" };
  }
  if (!studioStoryboardViewerCanModify(params.viewer, storyboard)) {
    return { ok: false, error: "Forbidden", code: "FORBIDDEN" };
  }

  let generated = 0;
  let skipped = 0;
  let retried = 0;

  for (const scene of storyboard.scenes) {
    const completed = scene.sceneImages?.some((img) => img.status === "completed");
    if (completed) {
      skipped += 1;
      continue;
    }

    const staleGenerating = scene.sceneImages?.find((img) => img.status === "generating");
    const failed = scene.sceneImages?.find((img) => img.status === "failed");
    if (failed || staleGenerating) {
      retried += 1;
    }

    await prismaProductionHeartbeat();

    let imageRowId: string;
    const reusable = scene.sceneImages?.find(
      (img) => img.status === "queued" || img.status === "generating" || img.status === "failed"
    );
    if (reusable) {
      imageRowId = reusable.id;
      if (reusable.status === "failed") {
        await withPrismaProductionRetry(`reset-failed-${reusable.id}`, () =>
          prisma.studioSceneImage.update({
            where: { id: reusable.id },
            data: { status: "queued" },
          })
        );
      }
    } else {
      const queued = await withPrismaProductionRetry(`queue-scene-${scene.id}`, () =>
        prisma.studioSceneImage.create({
          data: {
            sceneId: scene.id,
            status: "queued",
            promptVersion: PROMPT_BUILDER_VERSION,
            generationVersion: 0,
            generatedPrompt: "",
            provider: getSelectedSceneImageProviderId(),
          },
        })
      );
      imageRowId = queued.id;
    }

    const gen = await runSceneImageGeneration({
      imageRowId,
      scene,
      costFeature: "scene_image_bulk",
    });

    await prismaProductionHeartbeat();

    if ("error" in gen) {
      return { ok: false, error: gen.error.message, code: gen.error.code };
    }
    generated += 1;
  }

  const refreshed = await withPrismaProductionRetry("verify-storyboard-images", () =>
    prisma.studioStoryboard.findUnique({
      where: { id: params.storyboardId },
      include: {
        scenes: {
          orderBy: { order: "asc" },
          include: { sceneImages: true },
        },
      },
    })
  );

  const missing =
    refreshed?.scenes.filter((s) => !s.sceneImages.some((img) => img.status === "completed")) ??
    [];

  if (missing.length > 0) {
    return {
      ok: false,
      error: `${missing.length} scene(s) still missing images after generation`,
      code: "SCENE_IMAGES_INCOMPLETE",
    };
  }

  return { ok: true, generated, skipped, retried };
}

export async function assertStoryboardSceneImagesReady(
  storyboardId: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    include: {
      scenes: {
        orderBy: { order: "asc" },
        include: { sceneImages: true },
      },
    },
  });

  if (!storyboard) {
    return { ok: false, error: "Storyboard not found", code: "NOT_FOUND" };
  }

  const missing = storyboard.scenes.filter(
    (scene) => !scene.sceneImages.some((img) => img.status === "completed")
  );

  if (missing.length > 0) {
    return {
      ok: false,
      error: `${missing.length} scene(s) missing images — cannot start render batch`,
      code: "SCENE_IMAGES_INCOMPLETE",
    };
  }

  return { ok: true };
}
