/**
 * Character Studio Hub — centralized workflow catalog (CS0/CS2).
 * Reuses existing wizards; no new render pipelines.
 */

import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import { MASCOT_TRANSFORM_WORKFLOW } from "@/lib/editor-mascot-transformation";
import { fusionWorkflowUsesIntelligence } from "@/lib/editor-fusion-workflow-credits";
import type {
  CharacterStudioFlowDefinition,
  CharacterStudioFlowId,
} from "@/types/character-studio-hub";

export const CHARACTER_STUDIO_HUB_PATH = "/studio/characters/prepare";

const FUSION_FLOWS: Partial<
  Record<
    CharacterStudioFlowId,
    Pick<CharacterStudioFlowDefinition, "fusionIntent" | "workflowId">
  >
> = {
  outfit: { fusionIntent: "outfit_from_reference", workflowId: "outfit_from_reference" },
  character_fusion: { fusionIntent: "character_fusion", workflowId: "character_fusion" },
  future_child: { fusionIntent: "future_child", workflowId: "future_child" },
  genetic_blend: { fusionIntent: "genetic_blend", workflowId: "genetic_blend" },
  character_upgrade: { fusionIntent: "character_upgrade", workflowId: "character_upgrade" },
};

export const CHARACTER_STUDIO_FLOWS: CharacterStudioFlowDefinition[] = [
  {
    id: "full_body",
    kind: "studio_motion",
    titleKey: "characterStudio.flow.fullBody.title",
    descriptionKey: "characterStudio.flow.fullBody.description",
    bulletKeys: ["characterStudio.flow.fullBody.bullet1"],
    workflowId: "full_body_extension",
    wizardFirst: true,
    usesFusionIntelligence: false,
    usesCharacterConsistency: false,
    usesBrandProtection: false,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "outfit",
    kind: "fusion_wizard",
    titleKey: "characterStudio.flow.outfit.title",
    descriptionKey: "characterStudio.flow.outfit.description",
    bulletKeys: [
      "characterStudio.flow.outfit.bullet1",
      "characterStudio.flow.outfit.bullet2",
    ],
    fusionIntent: "outfit_from_reference",
    workflowId: "outfit_from_reference",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "character_upgrade",
    kind: "fusion_wizard",
    titleKey: "characterStudio.flow.upgrade.title",
    descriptionKey: "characterStudio.flow.upgrade.description",
    bulletKeys: ["characterStudio.flow.upgrade.bullet1"],
    fusionIntent: "character_upgrade",
    workflowId: "character_upgrade",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "mascot_transform",
    kind: "mascot_wizard",
    titleKey: "characterStudio.flow.mascotTransform.title",
    descriptionKey: "characterStudio.flow.mascotTransform.description",
    bulletKeys: ["characterStudio.flow.mascotTransform.bullet1"],
    mascotSourceType: "mascot",
    workflowId: MASCOT_TRANSFORM_WORKFLOW,
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "human_to_mascot",
    kind: "mascot_wizard",
    titleKey: "characterStudio.flow.humanToMascot.title",
    descriptionKey: "characterStudio.flow.humanToMascot.description",
    bulletKeys: ["characterStudio.flow.humanToMascot.bullet1"],
    mascotSourceType: "human",
    workflowId: "human_into_mascot",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "mascot_to_human",
    kind: "mascot_wizard",
    titleKey: "characterStudio.flow.mascotToHuman.title",
    descriptionKey: "characterStudio.flow.mascotToHuman.description",
    bulletKeys: ["characterStudio.flow.mascotToHuman.bullet1"],
    mascotSourceType: "mascot",
    mascotInitialTarget: "human_version",
    workflowId: "mascot_into_human",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "character_fusion",
    kind: "fusion_wizard",
    titleKey: "characterStudio.flow.fusion.title",
    descriptionKey: "characterStudio.flow.fusion.description",
    bulletKeys: ["characterStudio.flow.fusion.bullet1"],
    fusionIntent: "character_fusion",
    workflowId: "character_fusion",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: false,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "future_child",
    kind: "fusion_wizard",
    titleKey: "characterStudio.flow.futureChild.title",
    descriptionKey: "characterStudio.flow.futureChild.description",
    bulletKeys: ["characterStudio.flow.futureChild.bullet1"],
    fusionIntent: "future_child",
    workflowId: "future_child",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: false,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "genetic_blend",
    kind: "fusion_wizard",
    titleKey: "characterStudio.flow.geneticBlend.title",
    descriptionKey: "characterStudio.flow.geneticBlend.description",
    bulletKeys: ["characterStudio.flow.geneticBlend.bullet1"],
    fusionIntent: "genetic_blend",
    workflowId: "genetic_blend",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: true,
    usesBrandProtection: false,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "motion_ready",
    kind: "studio_motion",
    titleKey: "characterStudio.flow.motionReady.title",
    descriptionKey: "characterStudio.flow.motionReady.description",
    bulletKeys: ["characterStudio.flow.motionReady.bullet1"],
    workflowId: "motion_ready_character",
    wizardFirst: true,
    usesFusionIntelligence: false,
    usesCharacterConsistency: false,
    usesBrandProtection: false,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
  {
    id: "logo_placement",
    kind: "logo_wizard",
    titleKey: "characterStudio.flow.logoPlacement.title",
    descriptionKey: "characterStudio.flow.logoPlacement.description",
    bulletKeys: [
      "characterStudio.flow.logoPlacement.bullet1",
      "characterStudio.flow.logoPlacement.bullet2",
    ],
    workflowId: "logo_placement",
    wizardFirst: true,
    usesFusionIntelligence: true,
    usesCharacterConsistency: false,
    usesBrandProtection: true,
    usesMotionLock: false,
    editorDependent: false,
    copilotReachable: true,
    visibleInHub: true,
  },
];

export function characterStudioFlowDefinition(
  flowId: CharacterStudioFlowId
): CharacterStudioFlowDefinition {
  return CHARACTER_STUDIO_FLOWS.find((f) => f.id === flowId) ?? CHARACTER_STUDIO_FLOWS[0]!;
}

export function hubVisibleCharacterStudioFlows(): CharacterStudioFlowDefinition[] {
  return CHARACTER_STUDIO_FLOWS.filter((f) => f.visibleInHub);
}

export function fusionIntentForCharacterStudioFlow(
  flowId: CharacterStudioFlowId
): CharacterStudioFlowDefinition["fusionIntent"] {
  return FUSION_FLOWS[flowId]?.fusionIntent ?? characterStudioFlowDefinition(flowId).fusionIntent;
}

export function characterStudioFlowUsesFusionIntelligence(flowId: CharacterStudioFlowId): boolean {
  const intent = fusionIntentForCharacterStudioFlow(flowId);
  return intent ? fusionWorkflowUsesIntelligence(intent) : false;
}

export function isCharacterStudioFlowId(value: string | null | undefined): value is CharacterStudioFlowId {
  if (!value) {
    return false;
  }
  return CHARACTER_STUDIO_FLOWS.some((f) => f.id === value);
}

export function buildCharacterStudioHubHref(): string {
  return CHARACTER_STUDIO_HUB_PATH;
}

export function buildCharacterStudioFlowHref(
  flowId: CharacterStudioFlowId,
  extra?: Record<string, string>
): string {
  const def = characterStudioFlowDefinition(flowId);
  if (def.kind === "studio_motion") {
    return buildCharacterClusterHref("motion-ready", {
      flow: flowId,
      sourceImage: extra?.sourceImage ?? undefined,
      sourceAsset: extra?.sourceAsset ?? undefined,
      returnTo: extra?.returnTo ?? undefined,
    });
  }
  const params = new URLSearchParams({ flow: flowId, ...extra });
  return `${CHARACTER_STUDIO_HUB_PATH}?${params.toString()}`;
}
