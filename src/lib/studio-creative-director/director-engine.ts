/**
 * S.6F — Creative Director Engine (orchestrator).
 *
 * Chain (never bypass):
 * User → Creative Director → Experience Resolver → Creative Planner
 *   → CreativeSpecification selections → ContinuityBundle (delegated)
 *   → Prompt Matrix → Provider Transform → GenerationJob → Provider
 *
 * This module does NOT build ContinuityBundle, assemble prompts,
 * transform providers, charge credits, or enqueue GenerationJobs.
 */

import {
  planCreativeIntent,
  type CreativeIntentAnswers,
  type CreativePlan,
} from "@/lib/studio-creative-director/creative-planner";
import {
  resolveCreativeExperience,
  type ExperienceResolveInput,
  type ResolvedCreativeExperience,
} from "@/lib/studio-creative-director/experience-resolver";
import {
  filterPlannersForMode,
  getModePolicy,
  resolveProductMode,
  type StudioModePolicy,
} from "@/lib/studio-creative-director/mode-policy";
import {
  STUDIO_CREATIVE_DIRECTOR_OWNERSHIP,
  STUDIO_CREATIVE_DIRECTOR_VERSION,
  type StudioDelegatedPlannerId,
  type StudioProductMode,
} from "@/lib/studio-creative-director/types";
import type { MatrixUserSelections } from "@/lib/studio-prompt-matrix/assemble";
import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioMatrixDetailLevel } from "@/lib/studio-prompt-matrix/types";

export type CreativeDirectorOrchestrateInput = {
  experienceId?: string | null;
  entryFan?: string | null;
  doorHint?: string | null;
  mode?: StudioProductMode | null;
  preferDirector?: boolean;
  preferProfessional?: boolean;
  answers?: CreativeIntentAnswers | null;
};

export type CreativeDirectorHandoff = {
  /** Next: ContinuityBundle must be resolved by Continuity systems. */
  requiresContinuityBundle: true;
  continuityRequirements: ResolvedCreativeExperience["continuityRequirements"];
  /** Matrix experience to assemble after Continuity. */
  matrixExperienceId: StudioCreativeExperienceId;
  detailLevel: StudioMatrixDetailLevel;
  selections: MatrixUserSelections;
  /** Explicit: Director does not call these. */
  delegatedSystems: {
    continuity: "studio_continuity_foundation";
    promptMatrix: "studio_prompt_matrix";
    providerTransform: "studio_provider_transform";
    generationJobs: "generation_jobs";
    fusion: "fusion_intelligence";
    motion: "vidu_motion_pipeline";
    billing: "billing_unchanged";
    credits: "credits_unchanged";
  };
};

export type CreativeDirectorOrchestration = {
  version: typeof STUDIO_CREATIVE_DIRECTOR_VERSION;
  mode: StudioProductMode;
  modePolicy: StudioModePolicy;
  experience: ResolvedCreativeExperience;
  plan: CreativePlan;
  recommendedPlanners: StudioDelegatedPlannerId[];
  ownership: typeof STUDIO_CREATIVE_DIRECTOR_OWNERSHIP;
  handoff: CreativeDirectorHandoff;
  /** Human-readable orchestration summary (no provider prompts). */
  summary: string;
};

function modeToMatrixDetail(mode: StudioProductMode): StudioMatrixDetailLevel {
  switch (mode) {
    case "QUICK":
      return "QUICK";
    case "PROFESSIONAL":
      return "PROFESSIONAL";
    case "DIRECTOR":
      return "DIRECTOR";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/**
 * Canonical orchestration entry. Does not mutate identity or call providers.
 */
export function orchestrateCreativeDirector(
  input: CreativeDirectorOrchestrateInput
): CreativeDirectorOrchestration {
  const mode = resolveProductMode({
    requested: input.mode,
    preferDirector: input.preferDirector,
    preferProfessional: input.preferProfessional,
  });
  const modePolicy = getModePolicy(mode);

  const resolveInput: ExperienceResolveInput = {
    experienceId: input.experienceId,
    entryFan: input.entryFan,
    doorHint: input.doorHint,
    mode,
  };
  const experience = resolveCreativeExperience(resolveInput);

  const plan = planCreativeIntent({
    experience,
    mode,
    answers: input.answers,
  });

  const recommendedPlanners = filterPlannersForMode(
    experience.recommendedPlanners,
    mode
  );

  const handoff: CreativeDirectorHandoff = {
    requiresContinuityBundle: true,
    continuityRequirements: experience.continuityRequirements,
    matrixExperienceId: experience.matrixExperienceId,
    detailLevel: modeToMatrixDetail(mode),
    selections: plan.matrixSelections,
    delegatedSystems: {
      continuity: "studio_continuity_foundation",
      promptMatrix: "studio_prompt_matrix",
      providerTransform: "studio_provider_transform",
      generationJobs: "generation_jobs",
      fusion: "fusion_intelligence",
      motion: "vidu_motion_pipeline",
      billing: "billing_unchanged",
      credits: "credits_unchanged",
    },
  };

  const summary = [
    `Creative Director ${STUDIO_CREATIVE_DIRECTOR_VERSION}`,
    `mode=${mode}`,
    `experience=${experience.experienceId}`,
    `family=${experience.family}`,
    `status=${experience.status}`,
    `matrix=${experience.matrixExperienceId}`,
    `planners=${recommendedPlanners.join(",") || "none"}`,
    "next=ContinuityBundle→PromptMatrix→ProviderTransform→GenerationJob",
  ].join(" | ");

  return {
    version: STUDIO_CREATIVE_DIRECTOR_VERSION,
    mode,
    modePolicy,
    experience,
    plan,
    recommendedPlanners,
    ownership: STUDIO_CREATIVE_DIRECTOR_OWNERSHIP,
    handoff,
    summary,
  };
}
