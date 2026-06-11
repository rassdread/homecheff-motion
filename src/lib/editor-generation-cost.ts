import {
  adEstimatedValueUsd,
  BASE_EDITOR_GENERATION_PROVIDER_COST_USD,
  DEFAULT_CAMPAIGN_VARIANT_OUTPUTS,
  DEFAULT_LIFE_TIMELINE_AGES,
  DEFAULT_PRODUCT_FAMILY_VARIANTS,
  LARGE_PRINT_PRESETS,
  MAX_AD_SUPPORTED_GENERATIONS,
  PREMIUM_ONLY_FUSION_INTENTS,
  PREMIUM_ONLY_UPSCALE_MODES,
} from "@/lib/editor-generation-access-config";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import type {
  EditorGenerationWorkflow,
  EstimateEditorGenerationCostOptions,
  GenerationCostProfile,
} from "@/types/editor-generation-access";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

function resolveGenerationCount(
  workflow: EditorGenerationWorkflow,
  options: EstimateEditorGenerationCostOptions
): number {
  if (options.outputMode === "sequence" && options.stepCount) {
    return Math.max(1, options.stepCount);
  }

  const normalized =
    workflow === "export_print" || workflow === "export_upscale" || workflow === "transformation_sequence"
      ? workflow
      : normalizeFusionIntent(workflow as EditorFusionIntent);

  switch (normalized) {
    case "life_timeline":
      return Math.max(1, options.selectedAges?.length ?? DEFAULT_LIFE_TIMELINE_AGES.length);
    case "how_will_i_look":
      return 1;
    case "product_family":
      return Math.max(1, options.selectedVariants?.length ?? DEFAULT_PRODUCT_FAMILY_VARIANTS.length);
    case "campaign_variant":
      return Math.max(1, options.selectedVariants?.length ?? DEFAULT_CAMPAIGN_VARIANT_OUTPUTS.length);
    case "export_upscale":
      if (options.upscaleScope === "all_steps" && options.stepCount) {
        return options.stepCount;
      }
      return options.upscaleScope === "final_only" ? 1 : 0;
    case "export_print":
      return options.upscaleMode && options.upscaleMode !== "safe" ? 1 : 0;
    case "transformation_sequence":
      return Math.max(1, options.stepCount ?? 3);
    default:
      return 1;
  }
}

function isPremiumOnlyWorkflow(
  workflow: EditorGenerationWorkflow,
  options: EstimateEditorGenerationCostOptions,
  generationCount: number
): boolean {
  const normalized =
    workflow === "export_print" || workflow === "export_upscale" || workflow === "transformation_sequence"
      ? workflow
      : normalizeFusionIntent(workflow as EditorFusionIntent);

  if (PREMIUM_ONLY_FUSION_INTENTS.has(normalized as EditorFusionIntent)) {
    return true;
  }

  if (normalized === "life_timeline" && generationCount > 1) {
    return true;
  }

  if (normalized === "how_will_i_look" && generationCount === 1) {
    return false;
  }

  if (options.referenceCount !== undefined && options.referenceCount >= 3) {
    return true;
  }

  if (normalized === "export_upscale" && options.upscaleMode && PREMIUM_ONLY_UPSCALE_MODES.has(options.upscaleMode)) {
    return true;
  }

  if (normalized === "export_print" && options.printPreset && LARGE_PRINT_PRESETS.has(options.printPreset)) {
    return true;
  }

  if (normalized === "transformation_sequence" && generationCount >= 6) {
    return true;
  }

  if (options.outputMode === "sequence" && generationCount >= 3) {
    return true;
  }

  return false;
}

function providerCostPerUnit(options: EstimateEditorGenerationCostOptions): number {
  let cost = BASE_EDITOR_GENERATION_PROVIDER_COST_USD;
  if (options.upscaleMode === "creative") {
    cost += 0.02;
  }
  if (options.upscaleMode === "maximum_detail") {
    cost += 0.06;
  }
  if (options.printPreset && LARGE_PRINT_PRESETS.has(options.printPreset)) {
    cost += 0.08;
  }
  return cost;
}

export function estimateEditorGenerationCost(
  workflow: EditorGenerationWorkflow,
  options: EstimateEditorGenerationCostOptions = {}
): GenerationCostProfile {
  const unitCost = providerCostPerUnit(options);
  const imageGenerationCount = Math.max(resolveGenerationCount(workflow, options), 1);
  const upscaleUnits =
    options.upscaleScope === "all_steps" && options.stepCount
      ? options.stepCount
      : options.upscaleScope === "final_only"
        ? 1
        : workflow === "export_upscale"
          ? 1
          : 0;

  const generationCount = imageGenerationCount;
  const estimatedProviderCostUsd = unitCost * (generationCount + upscaleUnits);
  const premiumRequired = isPremiumOnlyWorkflow(workflow, options, generationCount);
  const adValue = adEstimatedValueUsd();
  const adEligible =
    !premiumRequired &&
    generationCount <= MAX_AD_SUPPORTED_GENERATIONS &&
    upscaleUnits === 0 &&
    estimatedProviderCostUsd <= adValue &&
    options.outputMode !== "sequence";

  const creditCost = generationCount + upscaleUnits;

  let reason: string | undefined;
  if (premiumRequired) {
    reason =
      generationCount > 1
        ? "Multi-generation workflow requires premium or credits."
        : "High-resolution or premium workflow.";
  } else if (!adEligible && generationCount > MAX_AD_SUPPORTED_GENERATIONS) {
    reason = "Ads cannot cover multi-generation workflows.";
  }

  return {
    workflow,
    generationCount,
    estimatedProviderCostUsd,
    creditCost: Math.max(creditCost, 1),
    adEligible,
    premiumRequired,
    subscriptionRequired: premiumRequired && generationCount > 1,
    reason,
  };
}

export function lifeTimelineGenerationCount(selectedAges?: number[]): number {
  return estimateEditorGenerationCost("life_timeline", { selectedAges }).generationCount;
}

export function interpolateTransformationStrengths(stepCount: number): number[] {
  if (stepCount <= 1) {
    return [100];
  }
  return Array.from({ length: stepCount }, (_, index) =>
    Math.round((index / (stepCount - 1)) * 100)
  );
}

export function defaultLifeTimelineAges(): number[] {
  return [...DEFAULT_LIFE_TIMELINE_AGES];
}
