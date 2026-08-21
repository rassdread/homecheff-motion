/**
 * S.6G — Canonical consumer entry contract.
 * Reuses resolveCreativeExperience + orchestrateCreativeDirector.
 * Does NOT create a second Director API.
 */

import {
  applyCoachSuggestionToAnswers,
  type CoachAcceptResult,
} from "@/lib/studio-creative-director/coach-accept";
import type { CreativeCoachSuggestion } from "@/lib/studio-creative-director/creative-coach";
import type { CreativeIntentAnswers } from "@/lib/studio-creative-director/creative-planner";
import {
  orchestrateCreativeDirector,
  type CreativeDirectorOrchestration,
} from "@/lib/studio-creative-director/director-engine";
import {
  normalizeConsumerDoor,
  type NormalizedConsumerDoor,
} from "@/lib/studio-creative-director/entry-fan-normalization";
import {
  isPackBlockedFromConsumerGenerate,
  missingPackUserMessage,
} from "@/lib/studio-creative-director/missing-pack-policy";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";
import { classifyExperiencePackLifecycle } from "@/lib/studio-preset-lifecycle";

export type ConsumerSourceAsset = {
  kind: "source_image" | "person_ref" | "clothing_ref" | "brand_asset" | "unknown";
  assetId?: string | null;
  /** Opaque client handle — never logged as URL in analytics. */
  clientRef?: string | null;
};

export type OpenExperienceInput = {
  experienceId?: string | null;
  entryFan?: string | null;
  doorHint?: string | null;
  photoIntent?: string | null;
  videoIntent?: string | null;
  motionPreset?: string | null;
  fusionIntent?: string | null;
  characterStudioFlow?: string | null;
  instantStyle?: string | null;
  maakCard?: string | null;
  assistantRecommendation?: string | null;
  mode?: StudioProductMode | null;
  preferProfessional?: boolean;
  preferDirector?: boolean;
  sourceAsset?: ConsumerSourceAsset | null;
  answers?: CreativeIntentAnswers | null;
  /** Where to return after funnel (path only). */
  returnTo?: string | null;
};

export type ConsumerContinuityStrategy =
  | "source_image"
  | "entity_aware"
  | "fusion_refs"
  | "when_linked"
  | "blocked";

export type OpenExperienceResult = {
  ok: boolean;
  blocked: boolean;
  blockReason: string | null;
  door: NormalizedConsumerDoor;
  mode: StudioProductMode;
  orchestration: CreativeDirectorOrchestration | null;
  continuityStrategy: ConsumerContinuityStrategy;
  /** Suggested next consumer surface (path + query). */
  nextHref: string | null;
  returnTo: string | null;
  sourceAsset: ConsumerSourceAsset | null;
  /** S2C lifecycle — registry-driven, no parallel architecture. */
  lifecycleClass?: string | null;
  continuationSupported?: boolean;
  materializationMode?: string | null;
};

function continuityStrategyFor(
  orchestration: CreativeDirectorOrchestration
): ConsumerContinuityStrategy {
  const req = orchestration.experience.continuityRequirements;
  if (req === "source_image") return "source_image";
  if (req === "fusion_refs") return "fusion_refs";
  if (req === "required_entities") return "entity_aware";
  if (req === "when_linked") return "when_linked";
  return "source_image";
}

function nextHrefForPack(
  experienceId: StudioProductExperienceId,
  mode: StudioProductMode
): string {
  const params = new URLSearchParams({
    experience: experienceId,
    mode: mode.toLowerCase(),
    fromExperience: "1",
  });
  switch (experienceId) {
    case "CREATIVE_ANIMATION":
      params.set("photoIntent", "photo_to_video");
      return `/animate/instant?${params.toString()}`;
    case "IDENTITY_OUTFIT":
      params.set("flow", "outfit");
      return `/studio/characters/prepare?${params.toString()}`;
    case "BUSINESS_RESTAURANT":
      params.set("intent", "restaurant_promo");
      return `/studio/start?${params.toString()}`;
    case "BUSINESS_HOMECHEFF":
      params.set("photoIntent", "photo_to_video");
      params.set("style", "food_promo");
      return `/animate/instant?${params.toString()}`;
    case "PEOPLE_LINKEDIN_PHOTO":
      // Still image path via Instant clean_business / Fusion-adjacent Instant
      params.set("style", "clean_business");
      params.set("photoIntent", "photo_to_video");
      return `/animate/instant?${params.toString()}`;
    default:
      return `/studio/experience?experience=${experienceId}&mode=${mode.toLowerCase()}`;
  }
}

/**
 * Open a consumer experience through the canonical Director chain.
 */
export function openExperience(input: OpenExperienceInput): OpenExperienceResult {
  const door = normalizeConsumerDoor(input);
  const mode: StudioProductMode =
    input.mode ??
    (input.preferDirector ? "DIRECTOR" : input.preferProfessional ? "PROFESSIONAL" : "QUICK");

  // slideshow / photo_story — honest unmapped (before Director default fallback)
  if (
    door.doorKind === "videoIntent" &&
    (door.doorHint === "slideshow" || door.doorHint === "photo_story")
  ) {
    return {
      ok: false,
      blocked: true,
      blockReason:
        "This video intent has no Experience Pack yet. Use Studio storyboard or Instant instead.",
      door,
      mode,
      orchestration: null,
      continuityStrategy: "blocked",
      nextHref: null,
      returnTo: input.returnTo ?? null,
      sourceAsset: input.sourceAsset ?? null,
    };
  }

  const orchestration = orchestrateCreativeDirector({
    experienceId: door.experienceId ?? input.experienceId,
    entryFan: door.entryFan ?? input.entryFan,
    doorHint: door.doorHint ?? input.doorHint,
    mode,
    preferDirector: input.preferDirector,
    preferProfessional: input.preferProfessional,
    answers: input.answers,
  });

  const experienceId = orchestration.experience.experienceId;

  if (isPackBlockedFromConsumerGenerate(experienceId)) {
    return {
      ok: false,
      blocked: true,
      blockReason: missingPackUserMessage(experienceId),
      door,
      mode,
      orchestration: null,
      continuityStrategy: "blocked",
      nextHref: null,
      returnTo: input.returnTo ?? null,
      sourceAsset: input.sourceAsset ?? null,
    };
  }

  const lifecycle = classifyExperiencePackLifecycle(experienceId);

  return {
    ok: true,
    blocked: false,
    blockReason: null,
    door,
    mode: orchestration.mode,
    orchestration,
    continuityStrategy: continuityStrategyFor(orchestration),
    nextHref: nextHrefForPack(experienceId, orchestration.mode),
    returnTo: input.returnTo ?? null,
    sourceAsset: input.sourceAsset ?? null,
    lifecycleClass: lifecycle.lifecycleClass,
    continuationSupported: lifecycle.continuationSupported,
    materializationMode: lifecycle.materializationMode,
  };
}

/**
 * Re-orchestrate with updated answers (question changes / coach accept).
 */
export function continueExperience(input: {
  experienceId: StudioProductExperienceId;
  mode: StudioProductMode;
  answers: CreativeIntentAnswers;
  sourceAsset?: ConsumerSourceAsset | null;
  returnTo?: string | null;
}): OpenExperienceResult {
  return openExperience({
    experienceId: input.experienceId,
    mode: input.mode,
    answers: input.answers,
    sourceAsset: input.sourceAsset,
    returnTo: input.returnTo,
  });
}

export function acceptCoachOnExperience(input: {
  experienceId: StudioProductExperienceId;
  mode: StudioProductMode;
  answers: CreativeIntentAnswers;
  suggestion: CreativeCoachSuggestion;
  sourceAsset?: ConsumerSourceAsset | null;
}): { accept: CoachAcceptResult; result: OpenExperienceResult } {
  const accept = applyCoachSuggestionToAnswers(input.answers, input.suggestion);
  const result = continueExperience({
    experienceId: input.experienceId,
    mode: input.mode,
    answers: accept.answers,
    sourceAsset: input.sourceAsset,
  });
  return { accept, result };
}

/** Privacy-safe analytics props (no prompts / URLs / PII). */
export function consumerExperienceAnalyticsProps(
  result: OpenExperienceResult
): {
  experienceId: string | null;
  mode: string;
  family: string | null;
  matrixExperienceId: string | null;
  blocked: boolean;
} {
  return {
    experienceId: result.orchestration?.experience.experienceId ?? null,
    mode: result.mode,
    family: result.orchestration?.experience.family ?? null,
    matrixExperienceId: result.orchestration?.handoff.matrixExperienceId ?? null,
    blocked: result.blocked,
  };
}
