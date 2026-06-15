export {
  FUSION_ARCHETYPE_IDS,
  type FusionArchetypeId,
  type FusionOutputFieldType,
  type FusionOutputField,
  type FusionArchetypeQuestion,
  type FusionArchetypeValidationRule,
  type FusionArchetype,
  type FusionArchetypeInputContext,
  type FusionArchetypeAnalysis,
  type FusionArchetypeValidationResult,
  type FusionArchetypeSaveMetadata,
  type FusionOutfitItem,
} from "@/lib/editor-fusion-archetype-types";

export {
  FUSION_ARCHETYPE_DEFINITIONS,
  allFusionArchetypeDefinitions,
  fusionArchetypeDefinitionById,
  fusionArchetypeDefinitionForIntent,
  seedArchetypeOutputSettings,
} from "@/lib/editor-fusion-archetype-definitions";

export {
  analyzeFusionInputs,
  extractFusionSemanticObjects,
  resolveFusionDynamicQuestions,
  buildFusionOutputSettings,
  buildFusionArchetypePromptLines,
  buildFusionArchetypeNegativePrompt,
  validateFusionOutput,
  buildFusionSaveMetadata,
  runFusionArchetypeEngine,
} from "@/lib/editor-fusion-archetype-v2";

// Back-compat alias
export { resolveFusionDynamicQuestions as fusionDynamicQuestionsResolver } from "@/lib/editor-fusion-archetype-v2";

import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import {
  allFusionArchetypeDefinitions,
  fusionArchetypeDefinitionById,
  fusionArchetypeDefinitionForIntent,
  seedArchetypeOutputSettings,
} from "@/lib/editor-fusion-archetype-definitions";
import {
  buildFusionArchetypeNegativePrompt,
  buildFusionArchetypePromptLines,
  resolveFusionDynamicQuestions,
} from "@/lib/editor-fusion-archetype-v2";
import type {
  FusionArchetype,
  FusionArchetypeId,
  FusionArchetypeQuestion,
  FusionOutputField,
} from "@/lib/editor-fusion-archetype-types";
import type { EditorFusionGenerationSettings, EditorFusionIntent } from "@/types/editor-instruction-studio";

export const FUSION_ARCHETYPES = allFusionArchetypeDefinitions();

export function allFusionArchetypes(): FusionArchetype[] {
  return allFusionArchetypeDefinitions();
}

export function fusionArchetypeById(id: FusionArchetypeId): FusionArchetype {
  return fusionArchetypeDefinitionById(id);
}

export function fusionArchetypeForIntent(intent: EditorFusionIntent): FusionArchetype {
  return fusionArchetypeDefinitionForIntent(intent);
}

export function seedCategoryOutputSettings(intent: EditorFusionIntent): EditorFusionGenerationSettings {
  return seedArchetypeOutputSettings(intent);
}

export function mergeCategoryOutputSettings(
  intent: EditorFusionIntent,
  current: EditorFusionGenerationSettings,
  patch: EditorFusionGenerationSettings
): EditorFusionGenerationSettings {
  const archetype = fusionArchetypeForIntent(intent);
  return {
    ...seedCategoryOutputSettings(intent),
    ...current,
    ...patch,
    fusionArchetypeId: archetype.id,
  };
}

export function fusionDynamicQuestions(intent: EditorFusionIntent): FusionArchetypeQuestion[] {
  return resolveFusionDynamicQuestions(intent);
}

export function fusionReviewChecklist(intent: EditorFusionIntent): string[] {
  return fusionArchetypeForIntent(intent).reviewChecklist;
}

export function fusionRequiredInputRoles(intent: EditorFusionIntent): string[] {
  return [...fusionArchetypeForIntent(intent).requiredInputRoles];
}

export function fusionMinimumCharacterCount(intent: EditorFusionIntent): number {
  return fusionArchetypeForIntent(intent).minCharacterCount ?? 0;
}

export function fusionCategoryOutputFields(intent: EditorFusionIntent): FusionOutputField[] {
  return fusionArchetypeForIntent(intent).outputFields;
}

export function buildCategoryOutputPromptLines(
  intent: EditorFusionIntent,
  settings: EditorFusionGenerationSettings
): string[] {
  return buildFusionArchetypePromptLines(intent, settings);
}

export function buildCategoryNegativePrompt(
  intent: EditorFusionIntent,
  settings: EditorFusionGenerationSettings
): string {
  return buildFusionArchetypeNegativePrompt(intent, settings);
}

export function isFusionIntentOfferedInWizard(intent: EditorFusionIntent): boolean {
  const def = fusionIntentDefinition(intent);
  if (def.legacy) {
    return false;
  }
  return fusionArchetypeForIntent(intent).wizardAvailable;
}

export function resolveSimpleFusionWizardHref(): string {
  return "/editor/fuse";
}
