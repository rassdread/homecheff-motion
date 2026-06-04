import type { Prisma, StudioSceneImage } from "@prisma/client";
import { normalizeStudioConsistencyStatus } from "@/lib/studio-consistency-status";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import {
  parseConsistencyRecommendations,
  parseSceneConsistencyReport,
} from "@/lib/studio-consistency-report-parse";
import {
  parseCorrectionRecommendations,
  parsePromptPatches,
} from "@/lib/studio-correction-report-parse";
import {
  STUDIO_SCENE_IMAGE_STATUSES,
  type StudioSceneImageGenerationSettings,
  type StudioSceneImageListItem,
  type StudioSceneImageStatus,
} from "@/types/studio-scene-image";

function isStudioSceneImageStatus(value: string): value is StudioSceneImageStatus {
  return (STUDIO_SCENE_IMAGE_STATUSES as readonly string[]).includes(value);
}

function parseGenerationSettings(
  value: Prisma.JsonValue | null
): StudioSceneImageGenerationSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as StudioSceneImageGenerationSettings;
}

export function mapStudioSceneImageToListItem(row: StudioSceneImage): StudioSceneImageListItem {
  return {
    id: row.id,
    sceneId: row.sceneId,
    status: isStudioSceneImageStatus(row.status) ? row.status : "failed",
    promptVersion: row.promptVersion,
    generationVersion: row.generationVersion,
    generatedPrompt: row.generatedPrompt,
    imageUrl: row.imageUrl,
    storageKey: row.storageKey,
    thumbnailUrl: row.thumbnailUrl,
    provider: row.provider,
    seed: row.seed,
    generationSettings: parseGenerationSettings(row.generationSettings),
    consistencyScore: row.consistencyScore,
    consistencyStatus: normalizeStudioConsistencyStatus(row.consistencyStatus),
    consistencyReport: parseSceneConsistencyReport(row.consistencyReport),
    consistencyRecommendations: parseConsistencyRecommendations(
      row.consistencyRecommendations
    ),
    consistencyAnalyzedAt: row.consistencyAnalyzedAt?.toISOString() ?? null,
    correctionRecommendations: parseCorrectionRecommendations(row.correctionRecommendations),
    promptPatches: parsePromptPatches(row.promptPatches),
    correctedPrompt: row.correctedPrompt,
    regeneratedFromImageId: row.regeneratedFromImageId,
    previousConsistencyScore: row.previousConsistencyScore,
    improvementScore: row.improvementScore,
    previousVisionScore: row.previousVisionScore,
    visionImprovementScore: row.visionImprovementScore,
    overallImprovementScore: row.overallImprovementScore,
    visionScore: row.visionScore,
    visionStatus: normalizeStudioConsistencyStatus(row.visionStatus),
    visionReport: parseVisionConsistencyReport(row.visionReport),
    visionAnalyzedAt: row.visionAnalyzedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
