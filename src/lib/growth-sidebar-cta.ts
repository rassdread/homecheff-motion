import type { AssistantRecommendation } from "@/types/assistant-recommendation";

export type GrowthSidebarCtaBlock = {
  id: string;
  badgeKey: `assistant.growth.cta.${string}.badge`;
  titleKey: `assistant.growth.cta.${string}.title`;
  descriptionKey: `assistant.growth.cta.${string}.description`;
  actionKey: `assistant.growth.cta.${string}.action`;
  recommendationId: string;
  emoji: string;
};

export const GROWTH_SIDEBAR_CTA_BLOCKS: GrowthSidebarCtaBlock[] = [
  {
    id: "cta_film_trailer",
    badgeKey: "assistant.growth.cta.filmTrailer.badge",
    titleKey: "assistant.growth.cta.filmTrailer.title",
    descriptionKey: "assistant.growth.cta.filmTrailer.description",
    actionKey: "assistant.growth.cta.filmTrailer.action",
    recommendationId: "film_trailer",
    emoji: "🎬",
  },
  {
    id: "cta_goal",
    badgeKey: "assistant.growth.cta.goalCelebration.badge",
    titleKey: "assistant.growth.cta.goalCelebration.title",
    descriptionKey: "assistant.growth.cta.goalCelebration.description",
    actionKey: "assistant.growth.cta.goalCelebration.action",
    recommendationId: "goal_celebration",
    emoji: "⚽",
  },
  {
    id: "cta_future_child",
    badgeKey: "assistant.growth.cta.futureChild.badge",
    titleKey: "assistant.growth.cta.futureChild.title",
    descriptionKey: "assistant.growth.cta.futureChild.description",
    actionKey: "assistant.growth.cta.futureChild.action",
    recommendationId: "future_child",
    emoji: "👶",
  },
  {
    id: "cta_future_age",
    badgeKey: "assistant.growth.cta.futureAge.badge",
    titleKey: "assistant.growth.cta.futureAge.title",
    descriptionKey: "assistant.growth.cta.futureAge.description",
    actionKey: "assistant.growth.cta.futureAge.action",
    recommendationId: "future_age_70",
    emoji: "🧓",
  },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickGrowthSidebarCtaBlock(sessionSeed: string): GrowthSidebarCtaBlock {
  const index = hashSeed(sessionSeed) % GROWTH_SIDEBAR_CTA_BLOCKS.length;
  return GROWTH_SIDEBAR_CTA_BLOCKS[index]!;
}

export function resolveGrowthCtaRecommendation(
  block: GrowthSidebarCtaBlock,
  recommendations: AssistantRecommendation[]
): AssistantRecommendation | null {
  return recommendations.find((row) => row.id === block.recommendationId) ?? null;
}
