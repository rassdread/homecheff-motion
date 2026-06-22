import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { fusionWorkflowUsesIntelligence } from "@/lib/editor-fusion-workflow-credits";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

/** Fusion intelligence workflows use wizard-first (no auto editor redirect). */
export function fusionWorkflowUsesWizardFirst(intent: EditorFusionIntent): boolean {
  return fusionWorkflowUsesIntelligence(intent);
}

export const FUSION_WIZARD_RENDER_ACTION_KEYS: Partial<Record<EditorFusionIntent, string>> = {
  character_fusion: "editor.fusionWizard.renderAction.characterFusion",
  animal_human_fusion: "editor.fusionWizard.renderAction.animalHumanFusion",
  genetic_blend: "editor.fusionWizard.renderAction.geneticBlend",
  future_child: "editor.fusionWizard.renderAction.futureChild",
  human_into_mascot: "editor.fusionWizard.renderAction.humanIntoMascot",
  mascot_into_human: "editor.fusionWizard.renderAction.mascotIntoHuman",
  character_upgrade: "editor.fusionWizard.renderAction.characterUpgrade",
  outfit_from_reference: "editor.fusionWizard.renderAction.outfitTransfer",
  person_outfit: "editor.fusionWizard.renderAction.outfitTransfer",
  person_background: "editor.fusionWizard.renderAction.personBackground",
  product_branding: "editor.fusionWizard.renderAction.productBranding",
  product_packaging: "editor.fusionWizard.renderAction.productPackaging",
  product_family: "editor.fusionWizard.renderAction.productFamily",
  life_timeline: "editor.fusionWizard.renderAction.lifeTimeline",
};

export function fusionWizardRenderActionKey(intent: EditorFusionIntent): string {
  const normalized = normalizeFusionIntent(intent);
  return FUSION_WIZARD_RENDER_ACTION_KEYS[normalized] ?? "editor.fusionWizard.renderAction.default";
}

export const FUSION_WIZARD_PROGRESS_STEP_KEYS = [
  "editor.fusionWizard.progress.checkingRefs",
  "editor.fusionWizard.progress.analyzingImages",
  "editor.fusionWizard.progress.buildingBlueprint",
  "editor.fusionWizard.progress.rendering",
  "editor.fusionWizard.progress.savingResult",
] as const;

export type FusionWizardProgressStepIndex = 0 | 1 | 2 | 3 | 4;
