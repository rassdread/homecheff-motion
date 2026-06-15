/**
 * Studio AI Everything — one-click production pipeline (COLLECT → GENERATE).
 */

import {
  buildMissingAssetRequirements,
  enrichLocationFromWizard,
  enrichPropFromWizard,
  enrichWorldFromWizard,
  LOCATION_WIZARD_DEFAULTS,
  PROP_WIZARD_DEFAULTS,
  WORLD_WIZARD_DEFAULTS,
  type BriefAssetRequirement,
} from "@/lib/studio-brief-asset-wizards";
import {
  CHARACTER_WIZARD_DEFAULTS,
  enrichCharacterFromWizard,
  type EnrichedCharacterConcept,
} from "@/lib/studio-character-wizard";
import { buildStoryPlanFromBrief } from "@/lib/studio-build-story-plan";
import { buildStudioStorylineFromIdea } from "@/lib/studio-story-generator";
import { readHcWorkflowV2, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefV4Selections } from "@/types/studio-production-brief-v4";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { GeneratedBriefAsset } from "@/lib/studio-brief-asset-generation";

export type AiEverythingAnalysis = {
  storyType: string;
  audience: string;
  style: string;
  tone: string;
  lengthSeconds: number;
  analyzedAt: string;
};

export type AiEverythingPipelinePlan = {
  analysis: AiEverythingAnalysis;
  storyPlan: StudioStoryPlan;
  assetRequirements: BriefAssetRequirement[];
  voiceRequirements: Array<{ role: string; style: string; sceneIds: string[] }>;
  musicRequirements: { genre: string; tempo: string; emotion: string; instrumentation: string };
  estimatedCredits: number;
  estimatedWaitMinutes: number;
};

export type AiEverythingCreditGate = {
  ok: boolean;
  requiredCredits: number;
  availableCredits?: number;
  missingAssets: BriefAssetRequirement[];
  message: string;
};

export type AiEverythingPipelineResult = {
  plan: AiEverythingPipelinePlan;
  hcProject: HomeCheffProjectPackage;
  generatedAssets: GeneratedBriefAsset[];
  creditGate: AiEverythingCreditGate;
};

function inferCharacterConcept(idea: string): EnrichedCharacterConcept {
  const concept = enrichCharacterFromWizard(CHARACTER_WIZARD_DEFAULTS);
  return { ...concept, name: idea.split(/\s+/).slice(0, 3).join(" ") || concept.name };
}

export function analyzeAiEverythingIdea(
  idea: string,
  selections: StudioProductionBriefV4Selections
): AiEverythingAnalysis {
  const storyline = buildStudioStorylineFromIdea(idea, {
    emotions: selections.emotions,
    visualStyles: selections.visualStyles,
    audience: selections.audience,
  });
  return {
    storyType: selections.goals[0] ?? "promotional",
    audience: storyline.targetAudience,
    style: selections.visualStyles[0] ?? "cinematic",
    tone: storyline.tone,
    lengthSeconds: 30,
    analyzedAt: new Date().toISOString(),
  };
}

export function buildAiEverythingPipelinePlan(input: {
  brief: StudioProductionBrief;
  selections: StudioProductionBriefV4Selections;
}): AiEverythingPipelinePlan {
  const analysis = analyzeAiEverythingIdea(input.brief.idea, input.selections);
  const storyPlan = buildStoryPlanFromBrief({ brief: input.brief, selections: input.selections });
  const assetRequirements = buildMissingAssetRequirements({ storyPlan });
  const storyline = buildStudioStorylineFromIdea(input.brief.idea, {
    emotions: input.selections.emotions,
    visualStyles: input.selections.visualStyles,
    audience: input.selections.audience,
  });

  const voiceRequirements = [
    { role: "Narrator", style: storyline.tone, sceneIds: storyPlan.scenes.map((s) => s.id) },
    ...storyPlan.characterNotes.map((name) => ({
      role: name,
      style: "character dialogue",
      sceneIds: storyPlan.scenes.filter((s) => s.requiredAssets.includes(name)).map((s) => s.id),
    })),
  ];

  const musicRequirements = {
    genre: storyline.musicMood,
    tempo: "medium",
    emotion: analysis.tone,
    instrumentation: storyline.soundEnvironment,
  };

  const estimatedCredits = assetRequirements
    .filter((r) => r.status === "missing" && ["character", "mascot", "team", "location", "prop", "world"].includes(r.kind))
    .reduce((sum, r) => sum + r.estimatedCredits, 0);

  return {
    analysis,
    storyPlan,
    assetRequirements,
    voiceRequirements,
    musicRequirements,
    estimatedCredits,
    estimatedWaitMinutes: Math.max(2, Math.ceil(estimatedCredits * 0.8)),
  };
}

export function checkAiEverythingCredits(
  plan: AiEverythingPipelinePlan,
  availableCredits: number
): AiEverythingCreditGate {
  const missingAssets = plan.assetRequirements.filter(
    (r) => r.status === "missing" && !["voice", "music", "sfx"].includes(r.kind)
  );
  const requiredCredits = missingAssets.reduce((sum, r) => sum + r.estimatedCredits, 0);
  if (availableCredits < requiredCredits) {
    return {
      ok: false,
      requiredCredits,
      availableCredits,
      missingAssets,
      message: `Need ${requiredCredits} credits (${availableCredits} available). Missing: ${missingAssets.map((a) => a.label).join(", ")}`,
    };
  }
  return {
    ok: true,
    requiredCredits,
    availableCredits,
    missingAssets: [],
    message: "Credits sufficient to generate all assets.",
  };
}

export function storeAiEverythingStateInHc(
  project: HomeCheffProjectPackage,
  plan: AiEverythingPipelinePlan
): HomeCheffProjectPackage {
  const root = readHcWorkflowV2(project);
  return writeHcWorkflowV2(
    storeStudioWorkflowInHc(project, {
      phase: "generate",
      idea: plan.storyPlan.logline,
      storyPlan: plan.storyPlan,
      productionRoute: "asset_first",
      briefSelections: {
        ...(root.studio?.briefSelections ?? {}),
        aiEverythingMode: true,
      } as StudioProductionBriefV4Selections,
      inventorySummary: {
        available: root.studio?.inventorySummary?.available ?? [],
        missing: plan.assetRequirements.filter((r) => r.status === "missing").map((r) => r.kind),
        optional: root.studio?.inventorySummary?.optional ?? [],
      },
    }),
    {
      aiEverything: {
        analysis: plan.analysis,
        assetRequirements: plan.assetRequirements,
        storyRequirements: plan.storyPlan.assetRequirements,
        productionRequirements: plan.musicRequirements,
        voiceRequirements: plan.voiceRequirements,
        musicRequirements: plan.musicRequirements,
        estimatedCredits: plan.estimatedCredits,
        completedAt: null,
      },
    }
  );
}

export type BriefWizardConcept =
  | EnrichedCharacterConcept
  | ReturnType<typeof enrichLocationFromWizard>
  | ReturnType<typeof enrichPropFromWizard>
  | ReturnType<typeof enrichWorldFromWizard>;

export function buildAutoConceptForRequirement(req: BriefAssetRequirement, idea: string): BriefWizardConcept {
  const seed = idea.trim() || req.label;
  if (req.kind === "character" || req.kind === "mascot" || req.kind === "team") {
    const concept = inferCharacterConcept(seed);
    if (req.kind === "mascot") {
      return { ...concept, type: "mascot", name: req.label || "Mascot" };
    }
    return { ...concept, name: req.label || "Main character" };
  }
  if (req.kind === "location") {
    const loc = enrichLocationFromWizard(LOCATION_WIZARD_DEFAULTS);
    return { ...loc, name: req.label || loc.name, description: `${loc.description} — ${seed}` };
  }
  if (req.kind === "world") {
    const world = enrichWorldFromWizard(WORLD_WIZARD_DEFAULTS);
    return { ...world, name: req.label || world.name, atmosphere: `${world.atmosphere} — ${seed}` };
  }
  const prop = enrichPropFromWizard(PROP_WIZARD_DEFAULTS);
  return { ...prop, name: req.label || prop.name, description: `${prop.description} — ${seed}` };
}
