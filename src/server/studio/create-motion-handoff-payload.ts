import type { SessionUser } from "@/server/auth/session";
import {
  getStoryboardSceneRowsForHandoff,
  toSceneSnapshot,
  type ServiceError,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";
import { buildScenePromptFromSceneRow } from "@/server/studio/studio-prompt-builder-service";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { resolveStudioSceneImageHandoff } from "@/lib/studio-scene-image-handoff";
import {
  parseConsistencyRecommendations,
  parseSceneConsistencyReport,
} from "@/lib/studio-consistency-report-parse";
import { parseCorrectionRecommendations } from "@/lib/studio-correction-report-parse";
import { buildConsistencyHistoryFromImages } from "@/lib/studio-storyboard-correction-summary";
import { computeImprovementScore } from "@/lib/studio-improvement-score";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function buildStudioContext(
  storyboardId: string,
  scene: SceneSnapshot,
  prompt: PromptBuilderOutput,
  imageHandoff: ReturnType<typeof resolveStudioSceneImageHandoff>
): StudioSceneContextMetadata {
  const noteParts = [scene.description.trim(), scene.action.trim()].filter(Boolean);
  return {
    source: "studio",
    storyboardId,
    sceneId: scene.sceneId,
    action: scene.action,
    emotion: scene.emotion,
    camera: scene.camera,
    transitionToNext: scene.transitionToNext,
    location: scene.location,
    characters: scene.characters,
    props: scene.props,
    notes: noteParts.join("\n"),
    voice: scene.voice,
    music: scene.music,
    generatedPrompt: prompt.metadata.generatedPrompt,
    stylePrompt: prompt.stylePrompt,
    continuityPrompt: prompt.continuityPrompt,
    promptVersion: prompt.metadata,
    selectedSceneImageId: imageHandoff.selectedSceneImageId,
    preferredSceneImageUrl: imageHandoff.selectedSceneImageUrl,
    sceneImageReference: imageHandoff.reference,
    imageSource: imageHandoff.reference ? "studio" : undefined,
    selectedSceneImagePromptVersion: imageHandoff.selectedSceneImagePromptVersion,
    selectedSceneImageGenerationVersion: imageHandoff.selectedSceneImageGenerationVersion,
  };
}

function toHandoffScene(
  storyboardId: string,
  row: StudioStoryboardSceneRow,
  styleProfile: string
): MotionHandoffScene {
  const snapshot = toSceneSnapshot(row);
  const built = buildScenePromptFromSceneRow(row, styleProfile);
  const imageHandoff = resolveStudioSceneImageHandoff({
    storyboardId,
    sceneId: row.id,
    selectedSceneImageId: row.selectedSceneImageId,
    sceneImages: row.sceneImages.map((img) => ({
      id: img.id,
      status: img.status,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      promptVersion: img.promptVersion,
      generationVersion: img.generationVersion,
    })),
  });

  const selectedImageRow = row.selectedSceneImageId
    ? row.sceneImages.find((img) => img.id === row.selectedSceneImageId)
    : row.sceneImages.find((img) => img.status === "completed");
  const sceneConsistencyReport = selectedImageRow
    ? parseSceneConsistencyReport(selectedImageRow.consistencyReport)
    : null;
  const sceneVisionReport = selectedImageRow
    ? parseVisionConsistencyReport(selectedImageRow.visionReport)
    : null;

  return {
    ...snapshot,
    selectedSceneImageId: imageHandoff.selectedSceneImageId,
    selectedSceneImageUrl: imageHandoff.selectedSceneImageUrl,
    selectedSceneImagePromptVersion: imageHandoff.selectedSceneImagePromptVersion,
    selectedSceneImageGenerationVersion: imageHandoff.selectedSceneImageGenerationVersion,
    sceneImageReference: imageHandoff.reference,
    notes:
      snapshot.notes ??
      [snapshot.description.trim(), snapshot.action.trim()].filter(Boolean).join("\n"),
    studioContext: buildStudioContext(storyboardId, snapshot, built, imageHandoff),
    generatedPrompt: built.metadata.generatedPrompt,
    stylePrompt: built.stylePrompt,
    continuityPrompt: built.continuityPrompt,
    promptVersion: built.metadata,
    sceneConsistencyScore: selectedImageRow?.consistencyScore ?? null,
    sceneConsistencyReport,
    sceneConsistencyRecommendations: selectedImageRow
      ? parseConsistencyRecommendations(selectedImageRow.consistencyRecommendations)
      : [],
    sceneCorrectionRecommendations: selectedImageRow
      ? parseCorrectionRecommendations(selectedImageRow.correctionRecommendations).length > 0
        ? parseCorrectionRecommendations(selectedImageRow.correctionRecommendations)
        : sceneConsistencyReport
          ? buildCombinedCorrectionRecommendations({
              consistencyReport: sceneConsistencyReport,
              visionReport: sceneVisionReport,
            })
          : []
      : [],
    sceneVisionScore: selectedImageRow?.visionScore ?? null,
    sceneVisionReport,
  };
}

export async function createMotionHandoffPayload(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ payload: MotionHandoffPayload } | { error: ServiceError }> {
  const loaded = await getStoryboardSceneRowsForHandoff(storyboardId, viewer);
  if (!loaded) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }

  const { storyboard, scenes } = loaded;

  if (scenes.length === 0) {
    return {
      error: serviceError(
        "NO_SCENES",
        "Add at least one scene before opening in Motion.",
        400
      ),
    };
  }

  const styleProfile = normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile);

  const sceneBundles = scenes.map((scene) => buildSceneMemoryBundleFromSceneRow(scene));
  const storyboardMemory: SceneMemoryBundle = {
    characters: sceneBundles.flatMap((b) => b.characters),
    location: sceneBundles.find((b) => b.location)?.location ?? null,
    props: sceneBundles.flatMap((b) => b.props),
    world: sceneBundles.find((b) => b.world)?.world ?? null,
    continuityStrength: sceneBundles[0]?.continuityStrength ?? "strong",
  };

  const handoffScenes = scenes.map((scene) => toHandoffScene(storyboard.id, scene, styleProfile));

  const consistencyReport = buildStoryboardConsistencyReport({
    storyboardId: storyboard.id,
    scenes: scenes.map((scene) => {
      const selected = scene.selectedSceneImageId
        ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
        : scene.sceneImages.find((img) => img.status === "completed");
      return {
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        imageId: selected?.id ?? null,
        report: selected ? parseSceneConsistencyReport(selected.consistencyReport) : null,
      };
    }),
  });

  const allImages = scenes.flatMap((scene) =>
    scene.sceneImages.map((img) => ({
      id: img.id,
      generationVersion: img.generationVersion,
      consistencyScore: img.consistencyScore,
      consistencyStatus: img.consistencyStatus,
      improvementScore: img.improvementScore,
      previousConsistencyScore: img.previousConsistencyScore,
      correctionRecommendations: img.correctionRecommendations,
      createdAt: img.createdAt.toISOString(),
    }))
  );
  const consistencyHistory = buildConsistencyHistoryFromImages(allImages);

  const correctionRecommendations = handoffScenes.flatMap((s) => s.sceneCorrectionRecommendations);

  const latestRegen = [...allImages]
    .filter((img) => img.improvementScore !== null)
    .sort((a, b) => b.generationVersion - a.generationVersion)[0];
  const latestImprovementScore = latestRegen
    ? computeImprovementScore(
        latestRegen.previousConsistencyScore,
        latestRegen.consistencyScore ?? 0
      )
    : null;

  const visionReport = buildStoryboardVisionReport({
    storyboardId: storyboard.id,
    scenes: scenes.map((scene) => {
      const selected = scene.selectedSceneImageId
        ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
        : scene.sceneImages.find((img) => img.status === "completed");
      return {
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        imageId: selected?.id ?? null,
        report: selected ? parseVisionConsistencyReport(selected.visionReport) : null,
      };
    }),
  });

  const payload: MotionHandoffPayload = {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: storyboard.id,
    title: storyboard.title,
    description: storyboard.description,
    promptStyleProfile: styleProfile,
    characterMemory: storyboardMemory.characters,
    locationMemory: storyboardMemory.location,
    propMemory: storyboardMemory.props,
    worldMemory: storyboardMemory.world,
    continuityStrength: storyboardMemory.continuityStrength,
    consistencyReport,
    overallConsistencyScore: consistencyReport.overallScore,
    driftWarnings: consistencyReport.driftWarnings,
    correctionRecommendations,
    consistencyHistory,
    latestImprovementScore,
    visionReport,
    overallVisionScore: visionReport.overallVisionScore,
    visionWarnings: visionReport.visionWarnings,
    scenes: handoffScenes,
  };

  return { payload };
}
