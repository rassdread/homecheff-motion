import type { CorrectionRecommendation, PromptPatch } from "@/types/studio-correction";

const CORRECTION_LAYER_HEADER = "--- Continuity corrections (apply on top of scene prompt) ---";

export function recommendationsToPromptPatches(
  recommendations: CorrectionRecommendation[]
): PromptPatch[] {
  return recommendations.map((rec) => ({
    id: rec.id,
    type: patchTypeFromRecommendation(rec.type),
    priority: patchPriorityFromSeverity(rec.severity),
    text: rec.promptPatch,
    source: rec.source,
  }));
}

function patchTypeFromRecommendation(
  type: CorrectionRecommendation["type"]
): PromptPatch["type"] {
  switch (type) {
    case "MissingCharacterTrait":
      return "character";
    case "MissingPropBranding":
      return "prop";
    case "WeakLocationIdentity":
      return "location";
    case "WorldStyleMismatch":
      return "world";
    case "LowConsistencyScore":
    case "GeneralContinuity":
    default:
      return "continuity";
  }
}

function patchPriorityFromSeverity(severity: CorrectionRecommendation["severity"]): number {
  switch (severity) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "medium":
      return 50;
    case "low":
    default:
      return 25;
  }
}

export function buildCorrectedPrompt(
  originalPrompt: string,
  patches: PromptPatch[]
): string {
  const base = originalPrompt.trim();
  if (patches.length === 0) {
    return base;
  }

  const sorted = [...patches].sort((a, b) => b.priority - a.priority);
  const layer = sorted.map((p) => p.text.trim()).filter(Boolean);

  return [base, CORRECTION_LAYER_HEADER, ...layer, "Preserve all original scene requirements."].join(
    "\n\n"
  );
}

export function buildCorrectionLayerFromRecommendations(
  recommendations: CorrectionRecommendation[]
): string {
  const patches = recommendationsToPromptPatches(recommendations);
  return buildCorrectedPrompt("", patches).replace(/^\n\n/, "");
}
