import { findCreatorPreset } from "@/lib/editor-instruction-presets";
import type {
  EditorCreatorPresetId,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";

export type EditorBulkVariantPlan = {
  id: string;
  name: string;
  nameKey?: string;
  promptSuffix: string;
  action?: EditorInstructionSelection["action"];
  presetId?: string;
};

export function buildBulkVariantPlansFromPreset(
  presetId: EditorCreatorPresetId
): EditorBulkVariantPlan[] {
  const preset = findCreatorPreset(presetId);
  return preset.variants.map((v) => ({
    id: v.id,
    name: v.id,
    nameKey: v.labelKey,
    promptSuffix: v.promptSuffix,
    action: v.action,
    presetId: preset.id,
  }));
}

export function buildGenericBulkPlans(count = 4): EditorBulkVariantPlan[] {
  const labels = ["Premium", "Luxury", "Modern", "Community"] as const;
  return labels.slice(0, count).map((label, index) => ({
    id: `bulk_${label.toLowerCase()}`,
    name: label,
    promptSuffix: `Create a ${label.toLowerCase()} style variant while preserving brand identity and composition.`,
    action: "change_style" as const,
    presetId: `generic_${index}`,
  }));
}

export function mergeBulkPrompt(
  basePrompt: string,
  plan: EditorBulkVariantPlan
): string {
  return `${basePrompt} ${plan.promptSuffix}`.trim();
}
