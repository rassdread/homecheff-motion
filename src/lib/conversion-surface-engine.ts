import type {
  ConversionSurfaceInput,
  ConversionSurfaceOutput,
  ConversionUsageLevel,
} from "@/types/conversion-surface";

export function resolveUsageLevel(availableCredits: number): ConversionUsageLevel {
  if (availableCredits <= 0) {
    return "zero";
  }
  if (availableCredits <= 20) {
    return "low";
  }
  if (availableCredits <= 100) {
    return "medium";
  }
  return "high";
}

function isPaidPlan(plan: string): boolean {
  return plan !== "free" && plan !== "enterprise";
}

function recommendUpgradePlan(plan: string, usageLevel: ConversionUsageLevel): "creator" | "pro" | "studio" | undefined {
  if (plan === "free") {
    return usageLevel === "zero" || usageLevel === "low" ? "creator" : "pro";
  }
  if (plan === "creator") {
    return "pro";
  }
  if (plan === "pro") {
    return "studio";
  }
  return undefined;
}

export function resolveConversionSurface(input: ConversionSurfaceInput): ConversionSurfaceOutput {
  const paid = isPaidPlan(input.currentPlan);
  const upgradeTarget = recommendUpgradePlan(input.currentPlan, input.usageLevel);

  if (!input.loggedIn) {
    return {
      showBuyCredits: false,
      showUpgradePlan: false,
      showViewPricing: true,
      showPromoCampaign: false,
      showInsufficientBlock: false,
      headlineKey: "billing.conversion.guest.headline",
      bodyKey: "billing.conversion.guest.body",
    };
  }

  const lowOrZero = input.usageLevel === "low" || input.usageLevel === "zero";
  const heavyUsage =
    input.pageType === "usage" &&
    input.creditsUsedThisMonth != null &&
    input.creditsUsedThisMonth >= 200;
  const insufficient =
    input.estimatedCredits != null &&
    input.estimatedCredits > 0 &&
    input.availableCredits < input.estimatedCredits;

  return {
    showBuyCredits: true,
    showUpgradePlan:
      input.pageType === "studio_dashboard" ||
      input.pageType === "motion" ||
      input.pageType === "projects" ||
      !paid ||
      input.pageType === "usage" ||
      input.pageType === "billing" ||
      lowOrZero,
    showViewPricing: input.pageType === "homepage" || input.pageType === "pricing" || input.pageType === "knowledge",
    showPromoCampaign: (lowOrZero || heavyUsage) && Boolean(upgradeTarget),
    showInsufficientBlock: insufficient,
    headlineKey:
      input.usageLevel === "zero" ? "billing.conversion.zeroCreditsTitle"
      : lowOrZero ? "billing.conversion.lowCreditsTitle"
      : undefined,
    bodyKey:
      input.usageLevel === "zero" ? "billing.conversion.zeroCreditsBody"
      : lowOrZero ? "billing.conversion.lowCreditsBody"
      : undefined,
    promoPlanId: upgradeTarget,
  };
}
