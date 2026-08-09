/**
 * S.6F — Creative Director public API (orchestration only).
 */

export {
  STUDIO_CREATIVE_DIRECTOR_OWNERSHIP,
  STUDIO_CREATIVE_DIRECTOR_VERSION,
  type StudioContinuityRequirementLevel,
  type StudioCreativeDirectorOwnership,
  type StudioDelegatedPlannerId,
  type StudioProductExperienceFamily,
  type StudioProductExperienceStatus,
  type StudioProductMode,
} from "@/lib/studio-creative-director/types";

export {
  STUDIO_PRODUCT_EXPERIENCE_IDS,
  isStudioProductExperienceId,
  type StudioProductExperienceId,
} from "@/lib/studio-creative-director/product-experience-ids";

export {
  STUDIO_PRODUCT_EXPERIENCE_REGISTRY,
  assertUniqueProductExperienceOwnership,
  getProductExperience,
  listProductExperiencesByFamily,
  listProductExperiencesByStatus,
  type StudioProductExperienceEntry,
} from "@/lib/studio-creative-director/product-experience-registry";

export {
  listResolvableEntryFans,
  resolveCreativeExperience,
  type ExperienceResolveInput,
  type ResolvedCreativeExperience,
} from "@/lib/studio-creative-director/experience-resolver";

export {
  planCreativeIntent,
  type CreativeIntent,
  type CreativeIntentAnswers,
  type CreativePlan,
} from "@/lib/studio-creative-director/creative-planner";

export {
  filterPlannersForMode,
  getModePolicy,
  resolveProductMode,
  type StudioModePolicy,
} from "@/lib/studio-creative-director/mode-policy";

export {
  orchestrateCreativeDirector,
  type CreativeDirectorHandoff,
  type CreativeDirectorOrchestrateInput,
  type CreativeDirectorOrchestration,
} from "@/lib/studio-creative-director/director-engine";

export {
  assertCoachSuggestionsNeverForced,
  getCreativeCoachSuggestions,
  type CreativeCoachSuggestion,
} from "@/lib/studio-creative-director/creative-coach";

export {
  normalizeConsumerDoor,
  UNMAPPED_VIDEO_INTENTS,
  type NormalizedConsumerDoor,
} from "@/lib/studio-creative-director/entry-fan-normalization";

export {
  MISSING_PACK_POLICY,
  getMissingPackDisposition,
  isPackBlockedFromConsumerGenerate,
  missingPackUserMessage,
  type MissingPackDisposition,
} from "@/lib/studio-creative-director/missing-pack-policy";

export {
  openExperience,
  continueExperience,
  acceptCoachOnExperience,
  consumerExperienceAnalyticsProps,
  type ConsumerSourceAsset,
  type OpenExperienceInput,
  type OpenExperienceResult,
  type ConsumerContinuityStrategy,
} from "@/lib/studio-creative-director/consumer-entry";

export {
  applyCoachSuggestionToAnswers,
  type CoachAcceptResult,
} from "@/lib/studio-creative-director/coach-accept";

export {
  getGuidedQuestionsForPack,
  applyGuidedAnswer,
  type GuidedQuestionDef,
  type GuidedQuestionType,
  type GuidedQuestionOption,
} from "@/lib/studio-creative-director/guided-questions";

export {
  CONSUMER_EXPERIENCE_SESSION_KEY,
  saveConsumerExperienceSession,
  loadConsumerExperienceSession,
  clearConsumerExperienceSession,
  buildDirectorWorkspaceHref,
  buildProfessionalExperienceHref,
  type ConsumerExperienceSession,
} from "@/lib/studio-creative-director/consumer-session";

export {
  buildExperiencePackHref,
  P0_EXPERIENCE_PACKS,
} from "@/lib/studio-creative-director/consumer-href";
