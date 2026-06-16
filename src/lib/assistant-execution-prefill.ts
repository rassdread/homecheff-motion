import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type {
  AssistantExecutionPlan,
  AssistantPreparedAssetLink,
} from "@/types/assistant-tool-execution";
import { getMotionActionPreset, isMotionActionPresetId } from "@/lib/motion-action-presets";

export function applyPreparedAssetsToPrefillPackage(
  pkg: AssistantPrefillPackage,
  preparedAssets: AssistantPreparedAssetLink[],
  executionPlan?: AssistantExecutionPlan
): AssistantPrefillPackage {
  const character = preparedAssets.find((asset) => asset.requirementId === "person_character");
  const outfit = preparedAssets.find((asset) => asset.requirementId.includes("outfit"));
  const background = preparedAssets.find(
    (asset) =>
      asset.requirementId.includes("location") ||
      asset.requirementId === "stadium_location" ||
      asset.requirementId === "background" ||
      asset.requirementId === "stage" ||
      asset.requirementId === "red_carpet" ||
      asset.requirementId === "luxury_background"
  );
  const prop = preparedAssets.find(
    (asset) =>
      asset.requirementId === "sports_car" ||
      asset.requirementId === "vehicle" ||
      asset.requirementId === "trophy" ||
      asset.requirementId === "skateboard" ||
      asset.requirementId === "snowboard" ||
      asset.requirementId === "microphone"
  );

  const presetIdRaw = pkg.motion?.actionPresetId ?? pkg.hcActionPreset?.actionPresetId;
  const preset =
    presetIdRaw && isMotionActionPresetId(presetIdRaw) ? getMotionActionPreset(presetIdRaw) : null;

  const sourceAssetIds = [
    ...(pkg.sourceAssetIds ?? []),
    ...preparedAssets.map((asset) => asset.assetId).filter(Boolean),
  ];

  const scenePrompt =
    background?.url
      ? pkg.motion?.scenePrompt
      : preset?.sceneSettings.backgroundPrompt ?? pkg.motion?.scenePrompt;

  return {
    ...pkg,
    readiness: "ready_to_open",
    understoodKey: "assistant.understood.preparedActionPreset",
    sourceAssetIds: [...new Set(sourceAssetIds)],
    preparedAssets,
    executionPlan,
    motion: {
      ...pkg.motion,
      scenePrompt,
      preparedOutfitAssetId: outfit?.assetId,
      preparedBackgroundAssetId: background?.assetId,
      preparedPropAssetId: prop?.assetId,
      preparedCharacterAssetId: character?.assetId,
      preparedByAssistant: true,
    },
    generationGoal:
      pkg.generationGoal ??
      (preset ? `Prepared ${preset.title} clip via HomeCheff Assistant` : pkg.generationGoal),
    activitySteps: [
      { id: "intent", labelKey: "assistant.prefill.activity.intent", status: "done" },
      { id: "preset", labelKey: "assistant.prefill.activity.actionPreset", status: "done" },
      { id: "requirements", labelKey: "assistant.prefill.activity.requirements", status: "done" },
      { id: "plan", labelKey: "assistant.prefill.activity.preparationPlan", status: "done" },
      { id: "execute", labelKey: "assistant.prefill.activity.execution", status: "done" },
      { id: "review", labelKey: "assistant.prefill.activity.review", status: "active" },
    ],
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function linkPreparedAssetToHcProject(
  project: import("@/types/homecheff-project-package").HomeCheffProjectPackage,
  asset: AssistantPreparedAssetLink
): import("@/types/homecheff-project-package").HomeCheffProjectPackage {
  if (!asset.url && asset.sourceActionId === "use_preset_default") {
    return project;
  }
  const ref = createHcAssetReference({
    id: asset.assetId,
    url: asset.url,
    kind: asset.requirementId,
    role: `assistant_prepared:${asset.requirementId}`,
    sourceService: project.projectType ?? "motion",
  });
  return upsertHcAssetReference(project, ref);
}
