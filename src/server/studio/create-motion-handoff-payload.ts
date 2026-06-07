import type { SessionUser } from "@/server/auth/session";
import {
  getStoryboardSceneRowsForHandoff,
  toSceneSnapshot,
  type ServiceError,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";
import { buildScenePromptFromSceneRow } from "@/server/studio/studio-prompt-builder-service";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { computeShotDiversityScore } from "@/lib/studio-story-flow-analyzer";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { resolveStudioSceneImageHandoff } from "@/lib/studio-scene-image-handoff";
import {
  parseConsistencyRecommendations,
  parseSceneConsistencyReport,
} from "@/lib/studio-consistency-report-parse";
import { parseCorrectionRecommendations } from "@/lib/studio-correction-report-parse";
import { buildConsistencyHistoryFromImages } from "@/lib/studio-storyboard-correction-summary";
import { computeImprovementScore } from "@/lib/studio-improvement-score";
import {
  computeCombinedImageScore,
  isRecommendedSceneImage,
} from "@/lib/studio-combined-image-score";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { buildStoryboardCharacterConsistencyReport } from "@/lib/studio-character-timeline";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import { attachVoiceToHandoffPayload } from "@/lib/attach-voice-handoff";
import { attachMusicToHandoffPayload } from "@/lib/attach-music-handoff";
import { attachSoundToHandoffPayload } from "@/lib/attach-sound-handoff";
import { attachAudioProductionToHandoffPayload } from "@/lib/attach-audio-production-handoff";
import { attachAudioAssetToHandoffPayload } from "@/lib/attach-audio-asset-handoff";
import { attachAudioMixToHandoffPayload } from "@/lib/attach-audio-mix-handoff";
import { attachVoiceIdentityToHandoffPayload } from "@/lib/attach-voice-identity-handoff";
import { attachCharacterVoicePlanToHandoff } from "@/lib/attach-character-voice-plan-handoff";
import { attachMediaAssetToHandoffPayload } from "@/lib/attach-media-asset-handoff";
import { attachSceneCompositionToHandoffPayload } from "@/lib/attach-scene-composition-handoff";
import { attachAssetPlacementToHandoffPayload } from "@/lib/attach-asset-placement-handoff";
import { attachCharacterBlockingToHandoffPayload } from "@/lib/attach-character-blocking-handoff";
import { attachTextBeatsToHandoffPayload } from "@/lib/attach-text-beats-handoff";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { toMotionRenderStrategyHandoffPlan } from "@/lib/studio-render-strategy-handoff";
import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import { toMotionAnimationPlanHandoffPlan } from "@/lib/studio-animation-plan-handoff";
import { buildViduExecutionPlan } from "@/lib/studio-vidu-execution-planner";
import { toMotionViduExecutionPlanHandoffPlan } from "@/lib/studio-vidu-execution-plan-handoff";
import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import { toMotionSceneGenerationHandoffPlan } from "@/lib/studio-scene-generation-plan-handoff";
import { attachProviderExecutionToHandoffPayload } from "@/lib/attach-provider-execution-handoff";
import { attachPerformanceToHandoffPayload } from "@/lib/attach-performance-handoff";
import { attachExecutionToHandoffPayload } from "@/lib/studio-scene-execution";
import { prisma } from "@/lib/prisma";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
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
  imageHandoff: ReturnType<typeof resolveStudioSceneImageHandoff>,
  directorProfile: string
): StudioSceneContextMetadata {
  const noteParts = [scene.description.trim(), scene.action.trim()].filter(Boolean);
  return {
    source: "studio",
    storyboardId,
    sceneId: scene.sceneId,
    action: scene.action,
    emotion: scene.emotion,
    camera: scene.camera,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    directorProfile: normalizeStudioDirectorProfile(directorProfile),
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
  styleProfile: string,
  directorProfile: string
): MotionHandoffScene {
  const snapshot = toSceneSnapshot(row);
  const built = buildScenePromptFromSceneRow(row, styleProfile, directorProfile);
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

  const mappedSceneImages = row.sceneImages.map(mapStudioSceneImageToListItem);
  const selectedListItem = selectedImageRow
    ? mappedSceneImages.find((img) => img.id === selectedImageRow.id) ?? null
    : null;
  const selectedImageScore = selectedListItem
    ? computeCombinedImageScore({
        visionScore: selectedListItem.visionScore,
        consistencyScore: selectedListItem.consistencyScore,
      })
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
    studioContext: buildStudioContext(
      storyboardId,
      snapshot,
      built,
      imageHandoff,
      directorProfile
    ),
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
    selectedImageScore,
    selectedImageVisionScore: selectedImageRow?.visionScore ?? null,
    selectedImageConsistencyScore: selectedImageRow?.consistencyScore ?? null,
    selectedImageImprovementScore:
      selectedImageRow?.overallImprovementScore ?? selectedImageRow?.improvementScore ?? null,
    selectedImageRecommended: selectedListItem
      ? isRecommendedSceneImage(selectedListItem, mappedSceneImages)
      : false,
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
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);

  const sceneBundles = scenes.map((scene) => buildSceneMemoryBundleFromSceneRow(scene));
  const storyboardMemory: SceneMemoryBundle = {
    characters: sceneBundles.flatMap((b) => b.characters),
    location: sceneBundles.find((b) => b.location)?.location ?? null,
    props: sceneBundles.flatMap((b) => b.props),
    world: sceneBundles.find((b) => b.world)?.world ?? null,
    continuityStrength: sceneBundles[0]?.continuityStrength ?? "strong",
  };

  const handoffScenes = scenes.map((scene) =>
    toHandoffScene(storyboard.id, scene, styleProfile, directorProfile)
  );

  const shotDiversityScore = computeShotDiversityScore(
    scenes.map((scene) => ({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: scene.sceneEnergy,
      camera: scene.camera,
    }))
  );

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

  const characterConsistencyReport = buildStoryboardCharacterConsistencyReport({
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
        characters: scene.characters.map((link) => ({
          id: link.character.id,
          name: link.character.name,
          role: link.character.role,
          description: link.character.description,
          personality: link.character.personality,
          referenceImageUrl: link.character.referenceImageUrl,
          appearanceMemory: link.character.appearanceMemory,
          personalityMemory: link.character.personalityMemory,
          continuityNotes: link.character.continuityNotes,
          defaultClothing: link.character.defaultClothing,
          defaultAccessories: link.character.defaultAccessories,
          visualKeywords: link.character.visualKeywords,
          primaryReferenceImageId: link.character.primaryReferenceImageId,
          referenceNotes: link.character.referenceNotes,
          identityStrength: link.character.identityStrength,
          continuityStrength: link.character.continuityStrength,
          worldProfileId: link.character.worldProfileId,
          worldProfile: link.character.worldProfile,
        })),
        consistencyReportJson: selected?.consistencyReport ?? null,
        visionReportJson: selected?.visionReport ?? null,
      };
    }),
  });

  const perSceneCharacterIdentityScores = characterConsistencyReport.perSceneCharacterScores.map(
    (row) => ({
      sceneId: row.sceneId,
      order: row.order,
      characters: row.characters.map((c) => ({
        characterId: c.characterId,
        name: c.name,
        score: c.score,
        status: c.status,
      })),
    })
  );

  const basePayload: MotionHandoffPayload = {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: storyboard.id,
    title: storyboard.title,
    description: storyboard.description,
    promptStyleProfile: styleProfile,
    directorProfile,
    shotDiversityScore,
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
    characterConsistencyReport,
    overallCharacterConsistencyScore: characterConsistencyReport.overallCharacterConsistencyScore,
    characterDriftWarnings: characterConsistencyReport.driftWarnings,
    perSceneCharacterIdentityScores,
    scenes: handoffScenes,
  };

  let payload = attachExecutionToHandoffPayload(basePayload, {
    aiDirectorNotes: storyboard.aiDirectorPrompt?.trim() ?? "",
  });

  const detail = await getStudioStoryboardById(storyboardId, viewer);
  if (detail) {
    const lang = (detail.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
    const [voice, subtitle] = await Promise.all([
      prisma.studioStoryboardVoice.findUnique({
        where: { storyboardId_language: { storyboardId, language: lang } },
      }),
      prisma.studioStoryboardSubtitleTrack.findUnique({
        where: { storyboardId_language: { storyboardId, language: lang } },
      }),
    ]);
    payload = attachVoiceToHandoffPayload(payload, {
      storyboard: detail,
      voice: voice
        ? {
            language: voice.language,
            provider: voice.provider,
            voiceProfile: voice.voiceProfile,
            voiceStyle: voice.voiceStyle,
            audioUrl: voice.audioUrl,
            durationSeconds: voice.durationSeconds,
            status: voice.status,
          }
        : null,
      subtitle: subtitle
        ? {
            language: subtitle.language,
            status: subtitle.status,
            entriesJson: subtitle.entriesJson,
          }
        : null,
    });
    payload = attachPerformanceToHandoffPayload(payload, { storyboard: detail });
    payload = attachMusicToHandoffPayload(payload, { storyboard: detail });
    payload = attachSoundToHandoffPayload(payload, { storyboard: detail });
    payload = attachAudioProductionToHandoffPayload(payload, { storyboard: detail });
    payload = attachAudioAssetToHandoffPayload(payload, { storyboard: detail });
    payload = await attachAudioMixToHandoffPayload(payload, {
      storyboard: detail,
      audioAssetMetadataJson: (
        await prisma.studioStoryboard.findUnique({
          where: { id: storyboardId },
          select: { audioAssetMetadataJson: true },
        })
      )?.audioAssetMetadataJson,
    });
    payload = attachVoiceIdentityToHandoffPayload(payload, { storyboard: detail });
    payload = attachCharacterVoicePlanToHandoff(payload, { storyboard: detail });
    payload = attachMediaAssetToHandoffPayload(payload, { storyboard: detail });
    payload = attachSceneCompositionToHandoffPayload(payload, { storyboard: detail });
    payload = attachAssetPlacementToHandoffPayload(payload, { storyboard: detail });
    payload = attachCharacterBlockingToHandoffPayload(payload, { storyboard: detail });
    payload = attachProviderExecutionToHandoffPayload(payload, { storyboard: detail });
    const compositionByScene = new Map(
      (payload.sceneCompositionPlan?.sceneCompositions ?? []).map((c) => [c.sceneId, c])
    );
    const placementByScene = new Map(
      (payload.assetPlacementPlan?.scenePlacements ?? []).map((p) => [p.sceneId, p])
    );
    const blockingByScene = new Map(
      (payload.characterBlockingPlan?.sceneBlockings ?? []).map((b) => [b.sceneId, b])
    );
    payload = {
      ...payload,
      scenes: payload.scenes.map((scene) => ({
        ...scene,
        sceneComposition: compositionByScene.get(scene.sceneId),
        assetPlacement: placementByScene.get(scene.sceneId),
        characterBlocking: blockingByScene.get(scene.sceneId),
      })),
    };
  }

  payload = attachTextBeatsToHandoffPayload(payload);

  if (detail) {
    const renderStrategyPlan = buildStudioRenderStrategyPlan({ storyboard: detail });
    const animationPlan = buildStudioAnimationPlan({
      storyboard: detail,
      renderStrategyPlan,
    });
    const viduExecutionPlan = buildViduExecutionPlan({
      storyboard: detail,
      renderStrategyPlan,
      animationPlan,
    });
    const sceneGenerationPlan = buildSceneGenerationPlan({
      storyboard: detail,
      renderStrategyPlan,
      animationPlan,
      actionShotDistributions: buildStoryboardActionShotDistribution({ storyboard: detail }),
    });
    payload = {
      ...payload,
      renderStrategyPlan: toMotionRenderStrategyHandoffPlan(renderStrategyPlan),
      animationPlan: toMotionAnimationPlanHandoffPlan(animationPlan),
      viduExecutionPlan: toMotionViduExecutionPlanHandoffPlan(viduExecutionPlan),
      sceneGenerationPlan: toMotionSceneGenerationHandoffPlan(sceneGenerationPlan),
    };
  }

  return { payload };
}
