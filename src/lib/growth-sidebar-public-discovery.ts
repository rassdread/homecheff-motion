import { ASSISTANT_RECOMMENDATION_CATALOG } from "@/lib/assistant-recommendation-catalog";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

/** Public homepage discovery cards — no auth, no provider calls. */
export const PUBLIC_HOMEPAGE_DISCOVERY_IDS = [
  "goal_celebration",
  "future_age_70",
  "future_child",
  "outfit_on_self",
  "red_carpet_moment",
] as const;

export type PublicHomepageDiscoveryId = (typeof PUBLIC_HOMEPAGE_DISCOVERY_IDS)[number];

export function buildPublicHomepageDiscoveryRecommendations(): AssistantRecommendation[] {
  return PUBLIC_HOMEPAGE_DISCOVERY_IDS.flatMap((id) => {
    const entry = ASSISTANT_RECOMMENDATION_CATALOG.find((row) => row.id === id);
    if (!entry) {
      return [];
    }
    return [
      {
        id: entry.id,
        category: entry.category,
        emoji: entry.emoji,
        titleKey: entry.titleKey,
        descriptionKey: entry.descriptionKey,
        whyKey: entry.whyKey,
        promptMessage: entry.promptMessage,
        status: "start",
        actionPresetId: entry.actionPresetId,
        fusionIntent: entry.fusionIntent,
        score: entry.trendingScore ?? 50,
      } satisfies AssistantRecommendation,
    ];
  });
}
