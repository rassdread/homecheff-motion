/**
 * Character Studio audit reports (CS0, CS15) — static inventory from hub config.
 */

import {
  CHARACTER_STUDIO_FLOWS,
  CHARACTER_STUDIO_HUB_PATH,
  buildCharacterStudioFlowHref,
  characterStudioFlowDefinition,
} from "@/lib/character-studio-hub";
import { CHARACTER_STUDIO_COPILOT_PHRASES } from "@/lib/character-studio-copilot";
import type {
  CharacterStudioAuditBundle,
  CharacterStudioCompletenessReport,
  CharacterStudioDuplicationReport,
  CharacterStudioFlowId,
  CharacterWorkflowInventoryEntry,
} from "@/types/character-studio-hub";

const LEGACY_WORKFLOW_ROUTES: Record<string, string> = {
  mascot_transform: "/editor/start?workflow=mascot_transform",
  human_into_mascot: "/editor/start?workflow=combine&intent=human_into_mascot",
  mascot_into_human: "/editor/start?workflow=combine&intent=mascot_into_human",
  character_upgrade: "/editor/start?workflow=combine&intent=character_upgrade",
  outfit_from_reference: "/editor/start?workflow=combine&intent=outfit_from_reference",
  motion_ready_character: "/studio/characters/motion-ready",
  full_body_extension: "/studio/characters/motion-ready",
  character_fusion: "/studio/characters/prepare?flow=character_fusion",
  future_child: "/studio/characters/prepare?flow=future_child",
  genetic_blend: "/studio/characters/prepare?flow=genetic_blend",
  logo_placement: "/studio/characters/prepare?flow=logo_placement",
};

function flowIdForWorkflow(workflowId: string): CharacterStudioFlowId | null {
  const match = CHARACTER_STUDIO_FLOWS.find((f) => f.workflowId === workflowId);
  return match?.id ?? null;
}

export function buildCharacterWorkflowInventoryReport(): CharacterWorkflowInventoryEntry[] {
  const workflowIds = [
    "mascot_transform",
    "human_into_mascot",
    "mascot_into_human",
    "character_upgrade",
    "outfit_from_reference",
    "motion_ready_character",
    "full_body_extension",
    "character_fusion",
    "future_child",
    "genetic_blend",
    "logo_placement",
  ];

  return workflowIds.map((workflowId) => {
    const flowId = flowIdForWorkflow(workflowId);
    const def = flowId ? characterStudioFlowDefinition(flowId) : null;
    const canonicalRoute = flowId ? buildCharacterStudioFlowHref(flowId) : LEGACY_WORKFLOW_ROUTES[workflowId];
    return {
      workflowId,
      route: canonicalRoute ?? LEGACY_WORKFLOW_ROUTES[workflowId] ?? CHARACTER_STUDIO_HUB_PATH,
      wizardFirst: def?.wizardFirst ?? workflowId === "motion_ready_character",
      editorFirst: !def?.wizardFirst && workflowId !== "motion_ready_character",
      visibleInUi: Boolean(def?.visibleInHub),
      copilotReachable: def?.copilotReachable ?? false,
      usesFusionIntelligence: def?.usesFusionIntelligence ?? false,
      usesCharacterConsistency: def?.usesCharacterConsistency ?? false,
      usesBrandProtection: def?.usesBrandProtection ?? false,
      usesMotionLock: def?.usesMotionLock ?? false,
      hiddenDependencies:
        workflowId === "full_body_extension"
          ? ["motion_ready_character wizard — sub-action reconstruct_full_body"]
          : def?.editorDependent
            ? ["legacy editor canvas optional after render"]
            : [],
    };
  });
}

export function buildCharacterStudioCompletenessReport(): CharacterStudioCompletenessReport {
  const inventory = buildCharacterWorkflowInventoryReport();
  const total = inventory.length;
  const wizardFirstCount = inventory.filter((e) => e.wizardFirst).length;
  const hubVisibleCount = inventory.filter((e) => e.visibleInUi).length;
  const copilotRoutedCount = inventory.filter((e) => e.copilotReachable).length;
  const editorIndependentCount = inventory.filter(
    (e) => e.wizardFirst && !e.hiddenDependencies.some((d) => d.includes("legacy editor"))
  ).length;

  const score = Math.round(
    ((wizardFirstCount + hubVisibleCount + copilotRoutedCount + editorIndependentCount) /
      (total * 4)) *
      100
  );

  return {
    score: Math.min(100, score),
    totalWorkflows: total,
    wizardFirstCount,
    hubVisibleCount,
    copilotRoutedCount,
    editorIndependentCount,
  };
}

export function buildCharacterStudioDuplicationReport(): CharacterStudioDuplicationReport {
  const duplicateRoutes = [
    "/editor/start?workflow=mascot_transform → redirect",
    "/editor/transform → redirect",
    "/editor/fuse → redirect",
    "/editor/start?workflow=combine&intent=* (character) → redirect",
  ];
  const duplicateComponents: string[] = [];
  const notes = [
    "Character Studio Hub reuses EditorMascotTransformationWizard, EditorReferenceRoleFlow, and EditorLogoPlacementWizard.",
    "Legacy routes remain as redirects only — canonical entry is /studio/characters/prepare.",
    "Copilot character intents route to Character Studio flows, not editor combine picker.",
  ];

  return {
    score: 5,
    duplicateRoutes,
    duplicateComponents,
    notes,
  };
}

export function buildCharacterStudioAuditBundle(): CharacterStudioAuditBundle {
  const inventory = buildCharacterWorkflowInventoryReport();
  const completeness = buildCharacterStudioCompletenessReport();
  const duplication = buildCharacterStudioDuplicationReport();

  const hiddenWorkflows = inventory
    .filter((e) => !e.visibleInUi)
    .map((e) => e.workflowId);

  const editorDependencies = [
    "Editor canvas optional via onOpenEditor in fusion/mascot result panels (hidden in Character Studio mode)",
    "Premium analysis runs via existing editor-reference-role-analysis-runner",
    "Fusion blueprint/payload built via editor-fusion-* libs",
  ];

  const uxRecommendations = [
    "Use /studio/characters/prepare as single entry — avoid Editor workflow chooser for character prep.",
    "Route Copilot character prompts to buildCharacterStudioFlowHref instead of generic /editor/start.",
    "Keep motion-ready and full-body extension unified under motion-ready wizard.",
  ];

  return {
    inventory,
    completeness,
    copilotRouting: CHARACTER_STUDIO_COPILOT_PHRASES,
    hiddenWorkflows,
    editorDependencies,
    uxRecommendations,
    duplication,
  };
}
