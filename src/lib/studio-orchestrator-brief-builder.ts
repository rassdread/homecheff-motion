/**
 * Build production brief from orchestrator state (no manual brief wizard).
 */

import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { studioVideoIntentToDirectorProfile } from "@/lib/studio-video-intents";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { HcOrchestratorState, StudioVideoIntent } from "@/types/studio-video-production";
import { studioVideoIntentDefaultDuration } from "@/lib/studio-video-intents";

const INTENT_IDEA_PREFIX: Partial<Record<StudioVideoIntent, string>> = {
  music_video: "Music video for",
  travel_vlog: "Travel vlog about",
  product_commercial: "Product commercial for",
  fashion_reel: "Fashion reel showcasing",
  documentary: "Documentary about",
  podcast_video: "Podcast video episode about",
  cooking_show: "Cooking show featuring",
  social_campaign: "Social media campaign for",
  brand_story: "Brand story about",
  company_video: "Company video about",
};

export function buildBriefFromOrchestratorState(params: {
  orchestrator: HcOrchestratorState;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot;
}): StudioProductionBrief | null {
  const intent = params.orchestrator.intent;
  if (!intent) return null;

  const idea =
    params.orchestrator.idea?.trim() ||
    `${INTENT_IDEA_PREFIX[intent] ?? "Video about"} ${intent.replace(/_/g, " ")}`;

  const durationSeconds =
    params.orchestrator.audioAnalysis?.durationSeconds ??
    params.orchestrator.musicVideoPlan?.estimatedDurationSeconds ??
    params.orchestrator.photoMoviePlan?.targetSeconds ??
    params.orchestrator.longFormPlan?.targetSeconds ??
    studioVideoIntentDefaultDuration(intent);

  const brief = buildProductionBrief({
    idea: `${idea}. Target duration: ${durationSeconds} seconds. Style: ${studioVideoIntentToDirectorProfile(intent)}.`,
    characters: params.characters ?? [],
    locations: params.locations ?? [],
    props: params.props ?? [],
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
  });

  if (!brief) return null;

  return {
    ...brief,
    estimatedDurationSeconds: durationSeconds,
    idea,
    goal: brief.goal || idea.slice(0, 160),
  };
}
