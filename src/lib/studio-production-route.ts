import type { StudioProductionRoute } from "@/types/studio-production-brief-v3";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";

export type ProductionRouteCreditEstimate = {
  assetCredits: number;
  motionCredits: number;
  totalCredits: number;
  labelKey: string;
};

export function estimateProductionRouteCredits(
  route: StudioProductionRoute,
  storyPlan: StudioStoryPlan
): ProductionRouteCreditEstimate {
  const motionCredits = Math.max(1, storyPlan.scenes.length);
  const assetCount = storyPlan.assetRequirements.length + storyPlan.characterNotes.length;

  if (route === "prompt_only") {
    return {
      assetCredits: 0,
      motionCredits,
      totalCredits: motionCredits,
      labelKey: "studio.productionRoute.credits.promptOnly",
    };
  }
  if (route === "asset_first") {
    const assetCredits = Math.max(3, assetCount * 2);
    return {
      assetCredits,
      motionCredits,
      totalCredits: assetCredits + motionCredits,
      labelKey: "studio.productionRoute.credits.assetFirst",
    };
  }
  const assetCredits = Math.max(1, Math.ceil(assetCount / 2));
  return {
    assetCredits,
    motionCredits,
    totalCredits: assetCredits + motionCredits,
    labelKey: "studio.productionRoute.credits.mixed",
  };
}

export function buildMotionPromptForRoute(input: {
  route: StudioProductionRoute;
  idea: string;
  storyPlan: StudioStoryPlan;
  lockedAssets?: string[];
}): string {
  const scenes = input.storyPlan.scenes
    .map((s) => `Scene ${s.index}: ${s.description}. ${s.voiceOver}`)
    .join(" ");

  if (input.route === "prompt_only") {
    return [
      input.idea,
      input.storyPlan.logline,
      scenes,
      "Style: cinematic. AI may invent characters, locations and props.",
    ].join(" ");
  }

  const locked = (input.lockedAssets ?? input.storyPlan.characterNotes).join(", ");
  if (input.route === "asset_first") {
    return [
      input.idea,
      `Use fixed assets: ${locked}.`,
      scenes,
      "Preserve character identity, clothing and branding across scenes.",
    ].join(" ");
  }

  return [
    input.idea,
    locked ? `Lock important assets: ${locked}.` : "",
    scenes,
    "Invent secondary roles and background details only.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function routeRequiresAssetPlan(route: StudioProductionRoute): boolean {
  return route === "asset_first";
}
