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
