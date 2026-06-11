import { DEFAULT_CAMPAIGN_VARIANT_OUTPUTS, DEFAULT_LIFE_TIMELINE_AGES, DEFAULT_PRODUCT_FAMILY_VARIANTS } from "@/lib/editor-generation-access-config";
import type { EstimateEditorGenerationCostOptions } from "@/types/editor-generation-access";
import type { EditorFusionGenerationSettings, EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function fusionPlanCostOptions(
  plan: EditorFusionPlan,
  document?: EditorCanvasDocument
): EstimateEditorGenerationCostOptions {
  const settings = plan.generationSettings;
  const selectedAges = Array.isArray(settings.selectedAges)
    ? (settings.selectedAges as number[])
    : plan.intent === "life_timeline"
      ? [...DEFAULT_LIFE_TIMELINE_AGES]
      : undefined;

  const selectedVariants = Array.isArray(settings.selectedVariants)
    ? (settings.selectedVariants as string[])
    : plan.intent === "product_family"
      ? [...DEFAULT_PRODUCT_FAMILY_VARIANTS]
      : plan.intent === "campaign_variant"
        ? [...DEFAULT_CAMPAIGN_VARIANT_OUTPUTS]
        : undefined;

  const outputMode = settings.outputMode === "sequence" ? "sequence" : "single";
  const stepCount =
    typeof settings.stepCount === "number"
      ? settings.stepCount
      : outputMode === "sequence"
        ? 3
        : 1;

  return {
    selectedAges,
    selectedVariants,
    referenceCount: plan.references.length + (document ? 1 : 0),
    stepCount,
    outputMode,
    upscaleScope:
      settings.upscaleScope === "all_steps"
        ? "all_steps"
        : settings.upscaleScope === "final_only"
          ? "final_only"
          : "none",
  };
}

export function patchFusionGenerationSettings(
  plan: EditorFusionPlan,
  patch: Partial<EditorFusionGenerationSettings>
): EditorFusionPlan {
  return {
    ...plan,
    generationSettings: {
      ...plan.generationSettings,
      ...patch,
    },
    updatedAt: new Date().toISOString(),
  };
}
