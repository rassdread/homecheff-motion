/**
 * Combine workspace retirement plan — wizard-first migration matrix (Phase N0/N1).
 */

import { fusionWorkflowUsesWizardFirst } from "@/lib/editor-fusion-wizard-flow";
import { buildCharacterStudioHubHref } from "@/lib/character-studio-hub";
import { resolveCharacterStudioRouteForFusionIntent } from "@/lib/character-studio-legacy-routes";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export type CombineRetirementDecision = "migrate_to_wizard" | "admin_only" | "keep_advanced";

export type CombineWorkflowRetirementEntry = {
  intent: EditorFusionIntent;
  decision: CombineRetirementDecision;
  wizardFirstToday: boolean;
  characterStudioRoute: string | null;
  reason: string;
};

const LEGACY_FREE_COMPOSE: EditorFusionIntent[] = ["multiple_references", "custom_composition"];

const ADMIN_ONLY_SIMULATION: EditorFusionIntent[] = [
  "how_will_i_look",
  "future_professions",
  "future_home",
];

const WIZARD_CANDIDATE_NON_INTELLIGENCE: EditorFusionIntent[] = [
  "animal_fusion",
  "pet_customization",
  "fantasy_creature",
  "product_environment",
  "ad_composition",
  "social_media_visual",
  "poster_composition",
];

export function combineRetirementPlan(): CombineWorkflowRetirementEntry[] {
  const intents: EditorFusionIntent[] = [
    "character_fusion",
    "animal_human_fusion",
    "genetic_blend",
    "future_child",
    "human_into_mascot",
    "mascot_into_human",
    "character_upgrade",
    "outfit_from_reference",
    "person_outfit",
    "person_background",
    "product_branding",
    "product_packaging",
    "product_family",
    "life_timeline",
    "campaign_variant",
    "animal_fusion",
    "pet_customization",
    "fantasy_creature",
    "product_environment",
    "ad_composition",
    "social_media_visual",
    "poster_composition",
    "how_will_i_look",
    "future_professions",
    "future_home",
    "multiple_references",
    "custom_composition",
  ];

  return intents.map((intent) => {
    const wizardFirstToday = fusionWorkflowUsesWizardFirst(intent);
    const csRoute = resolveCharacterStudioRouteForFusionIntent(intent);

    if (LEGACY_FREE_COMPOSE.includes(intent)) {
      return {
        intent,
        decision: "admin_only" as const,
        wizardFirstToday,
        characterStudioRoute: csRoute,
        reason: "Free-form composition — advanced editor only",
      };
    }

    if (ADMIN_ONLY_SIMULATION.includes(intent)) {
      return {
        intent,
        decision: "admin_only" as const,
        wizardFirstToday,
        characterStudioRoute: csRoute,
        reason: "Simulation / sequence UX not yet in wizard shell",
      };
    }

    if (wizardFirstToday) {
      return {
        intent,
        decision: "migrate_to_wizard" as const,
        wizardFirstToday,
        characterStudioRoute: csRoute,
        reason: csRoute
          ? "Character Studio hub + wizard render pipeline"
          : "Editor wizard-first via EditorReferenceRoleFlow",
      };
    }

    if (WIZARD_CANDIDATE_NON_INTELLIGENCE.includes(intent)) {
      return {
        intent,
        decision: "keep_advanced" as const,
        wizardFirstToday,
        characterStudioRoute: csRoute,
        reason: "Future wizard migration — combine workspace until intelligence wired",
      };
    }

    return {
      intent,
      decision: "keep_advanced" as const,
      wizardFirstToday,
      characterStudioRoute: csRoute,
      reason: "Non-intelligence combine workflow",
    };
  });
}

export function combineWorkspaceAllowedForUser(input: {
  role?: string;
  billingFree?: boolean;
}): boolean {
  return input.billingFree === true || input.role === "admin";
}

export function shouldSteerCombineIntentToWizard(intent: EditorFusionIntent): boolean {
  return fusionWorkflowUsesWizardFirst(intent);
}

export function combineWizardSteerHref(intent: EditorFusionIntent): string {
  const csRoute = resolveCharacterStudioRouteForFusionIntent(intent);
  return csRoute ?? buildCharacterStudioHubHref();
}

export function combineWorkspaceRequiresRetirementBanner(input: {
  intent: EditorFusionIntent;
  role?: string;
  billingFree?: boolean;
}): boolean {
  if (combineWorkspaceAllowedForUser(input)) {
    return false;
  }
  return shouldSteerCombineIntentToWizard(input.intent);
}
