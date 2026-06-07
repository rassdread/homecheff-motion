/**
 * Studio V2 — Production configuration snapshot builder.
 * Captures storyboard, scenes, assets, identities, and planner state — no renders or blobs.
 */

import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { emptyAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import type { StudioSceneDetail } from "@/types/studio-api";
import type {
  BuildStudioSnapshotInput,
  StudioProductionSnapshot,
  StudioSnapshotCreationAssistantSummary,
  StudioSnapshotIdentitySummary,
  StudioSnapshotPlannerSummary,
  StudioSnapshotSceneConfig,
  StudioSnapshotStoryboardConfig,
} from "@/types/studio-production-snapshot";

function snapshotId(): string {
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toSceneConfig(scene: StudioSceneDetail): StudioSnapshotSceneConfig {
  return {
    id: scene.id,
    order: scene.order,
    title: scene.title?.trim() ?? "",
    description: scene.description?.trim() ?? "",
    action: scene.action?.trim() ?? "",
    emotion: scene.emotion?.trim() ?? "",
    durationSeconds: scene.durationSeconds ?? 0,
    shotType: scene.shotType?.trim() ?? "",
    cameraMovement: scene.cameraMovement?.trim() ?? "",
    sceneEnergy: scene.sceneEnergy?.trim() ?? "",
    locationId: scene.location?.id ?? null,
    characterIds: scene.characters.map((character) => character.id),
    propIds: scene.props.map((prop) => prop.id),
  };
}

function toStoryboardConfig(
  storyboard: BuildStudioSnapshotInput["storyboard"]
): StudioSnapshotStoryboardConfig {
  return {
    title: storyboard.title?.trim() ?? "",
    description: storyboard.description?.trim() ?? "",
    aiDirectorPrompt: storyboard.aiDirectorPrompt?.trim() ?? "",
    promptStyleProfile: storyboard.promptStyleProfile ?? "",
    directorProfile: storyboard.directorProfile ?? "",
    aiDirectorStyleStrength: storyboard.aiDirectorStyleStrength ?? "",
    voiceEnabled: storyboard.voiceEnabled ?? false,
    voiceLanguage: storyboard.voiceLanguage ?? "en",
    voiceProfile: storyboard.voiceProfile ?? "",
    narrationMode: storyboard.narrationMode ?? "",
    musicEnabled: storyboard.musicEnabled ?? false,
    musicStyle: storyboard.musicStyle ?? "",
    soundEnabled: storyboard.soundEnabled ?? false,
    soundStyle: storyboard.soundStyle ?? "",
  };
}

function buildIdentitySummaries(
  input: BuildStudioSnapshotInput
): StudioSnapshotIdentitySummary[] {
  const consumption = buildStoryboardIdentityConsumption({
    storyboard: input.storyboard,
    libraries: {
      characters: input.characters ?? [],
      locations: input.locations ?? [],
      props: input.props ?? [],
      worlds: input.worlds ?? [],
    },
    memory: input.projectMemory,
  });

  return consumption.assetSummaries.slice(0, 12).map((asset) => ({
    id: asset.id,
    kind: asset.kind,
    name: asset.name,
    completenessScore: asset.completenessScore,
    completenessStatus: asset.completenessStatus,
  }));
}

function buildPlannerSummary(input: BuildStudioSnapshotInput): StudioSnapshotPlannerSummary {
  const productionPlan = buildStudioProductionPlan({
    storyboard: input.storyboard,
    characters: input.characters,
    locations: input.locations,
    props: input.props,
    worlds: input.worlds,
    projectMemory: input.projectMemory,
    assetDecisionRegistry: input.assetDecisionRegistry,
  });
  const renderPlan = buildStudioRenderStrategyPlan({
    storyboard: input.storyboard,
    characters: input.characters ?? [],
    locations: input.locations ?? [],
    props: input.props ?? [],
    worlds: input.worlds ?? [],
    projectMemory: input.projectMemory,
  });

  return {
    estimatedSceneCount: productionPlan.estimatedSceneCount,
    estimatedShotCount: productionPlan.estimatedShotCount,
    estimatedDurationSeconds: productionPlan.estimatedDurationSeconds,
    renderStrategy: renderPlan.recommendedStrategy,
    readinessScore: productionPlan.readinessScore,
  };
}

function buildAssistantSummary(
  input: BuildStudioSnapshotInput
): StudioSnapshotCreationAssistantSummary {
  const view = buildCreationAssistantView({
    storyboard: input.storyboard,
    characters: input.characters,
    locations: input.locations,
    props: input.props,
    worlds: input.worlds,
    projectMemory: input.projectMemory,
    assetDecisionRegistry: input.assetDecisionRegistry,
  });

  return {
    projectStatus: view.completionProgress.projectStatus,
    completedCount: view.completionProgress.completedCount,
    totalCount: view.completionProgress.totalCount,
    percent: view.completionProgress.percent,
    readinessScore: view.completionProgress.readinessScore,
  };
}

export function buildStudioSnapshot(input: BuildStudioSnapshotInput): StudioProductionSnapshot {
  const scenes = [...(input.storyboard.scenes ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(toSceneConfig);
  const sceneCount = String(scenes.length);
  const savedAt = new Date().toISOString();

  return {
    version: 1,
    id: snapshotId(),
    storyboardId: input.storyboard.id,
    savedAt,
    source: input.source ?? "manual",
    storyboardUpdatedAt: input.storyboard.updatedAt,
    labelKey: input.labelKey ?? "studio.snapshot.label.default",
    labelParams: input.labelParams ?? { scenes: sceneCount },
    storyboard: toStoryboardConfig(input.storyboard),
    scenes,
    assetDecisionRegistry:
      input.assetDecisionRegistry
      ?? emptyAssetDecisionRegistry({ storyboardId: input.storyboard.id }),
    productionBrief: input.productionBrief ?? null,
    identitySummaries: buildIdentitySummaries(input),
    plannerSummary: buildPlannerSummary(input),
    creationAssistantSummary: buildAssistantSummary(input),
  };
}
