import { getAssistantExecutionCreditEstimate } from "@/lib/assistant-tool-execution-mode";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type { AssistantCostEstimate, ProducerProductionPlan } from "@/types/assistant-producer-plan";
import type { ProducerResponse } from "@/types/assistant-producer";

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

export function estimateProducerPlanCost(
  plan: ProducerProductionPlan,
  studio: AssistantStudioContext,
  locale?: string
): AssistantCostEstimate {
  const nl = isNl(locale);
  const reuseExistingAssets = studio.characters.length > 0 || studio.preparedAssets.length > 0;
  const savingsPercent = plan.reuseSavingsPercent ?? (reuseExistingAssets ? 40 : 0);
  const summary = nl
    ? reuseExistingAssets
      ? `Als je bestaande assets gebruikt, kost dit ongeveer ${savingsPercent}% minder credits.`
      : `Verwachte kosten: ~${plan.estimatedCredits} credits, ${plan.estimatedRenderCount} render(s), ${plan.estimatedAssetGenerations} asset-generatie(s).`
    : reuseExistingAssets
      ? `Reusing existing assets saves about ${savingsPercent}% credits.`
      : `Expected cost: ~${plan.estimatedCredits} credits, ${plan.estimatedRenderCount} render(s), ${plan.estimatedAssetGenerations} asset generation(s).`;

  return {
    estimatedCredits: plan.estimatedCredits,
    estimatedRenderCount: plan.estimatedRenderCount,
    estimatedAssetGenerations: plan.estimatedAssetGenerations,
    reuseExistingAssets,
    savingsPercent,
    summary,
  };
}

export function estimateInterpretationCost(
  interpretation: AssistantInterpretation,
  studio: AssistantStudioContext,
  locale?: string
): AssistantCostEstimate {
  const baseCredits =
    interpretation.detectedIntent === "create_motion_video" ? 12 : interpretation.detectedIntent === "mascot_variant" ? 10 : 6;
  const hasAssets = studio.characters.length > 0;
  const estimatedCredits = hasAssets ? Math.max(2, Math.round(baseCredits * 0.35)) : baseCredits;
  const nl = isNl(locale);
  return {
    estimatedCredits,
    estimatedRenderCount: interpretation.detectedIntent.includes("motion") ? 1 : 0,
    estimatedAssetGenerations: hasAssets ? 0 : 2,
    reuseExistingAssets: hasAssets,
    savingsPercent: hasAssets ? 65 : 0,
    summary: hasAssets
      ? nl
        ? "Bestaande bibliotheekassets verlagen de verwachte kosten aanzienlijk."
        : "Existing library assets significantly lower expected cost."
      : nl
        ? `Verwacht ~${estimatedCredits} credits voor deze richting.`
        : `Expect ~${estimatedCredits} credits for this direction.`,
  };
}

export function isCheapestPathQuestion(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("goedkoopste") ||
    text.includes("cheapest") ||
    text.includes("minste credits") ||
    text.includes("least credits")
  );
}

export function buildCheapestPathReply(studio: AssistantStudioContext, locale?: string): string {
  const nl = isNl(locale);
  const hasLibrary = studio.characters.length > 0 || studio.preparedAssets.length > 0;
  if (!hasLibrary) {
    return nl
      ? "De goedkoopste start is vaak: bestaande foto hergebruiken, één korte clip, en geen extra asset-generaties."
      : "The cheapest start is usually: reuse an existing photo, one short clip, and no extra asset generations.";
  }
  return nl
    ? "Als je bestaande assets gebruikt kost dit ongeveer 80% minder credits dan alles opnieuw genereren."
    : "Reusing existing assets costs about 80% fewer credits than generating everything again.";
}

export function attachCostToProducerResponse(
  producer: ProducerResponse,
  cost: AssistantCostEstimate
): ProducerResponse {
  return {
    ...producer,
    shortReply: `${producer.shortReply} ${cost.summary}`.trim(),
  };
}

export function sumPrepareStepCredits(actionIds: string[]): number {
  return actionIds.reduce((sum, actionId) => sum + getAssistantExecutionCreditEstimate(actionId as never), 0);
}
