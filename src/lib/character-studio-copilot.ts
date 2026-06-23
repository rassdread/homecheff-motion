/**
 * Character Studio Copilot routing (CS13 / P0.3) — maps phrases to hub flows.
 */

import type { AssistantActionId } from "@/lib/assistant-action-registry";
import { buildCharacterStudioFlowHref } from "@/lib/character-studio-hub";
import type { CharacterStudioFlowId } from "@/types/character-studio-hub";

export type CharacterStudioCopilotMatch = {
  flowId: CharacterStudioFlowId;
  phrase: string;
};

export const CHARACTER_STUDIO_COPILOT_PHRASES: CharacterStudioCopilotMatch[] = [
  { phrase: "logo plaatsen en beschermen", flowId: "logo_placement" },
  { phrase: "andere versie van deze mascotte", flowId: "mascot_transform" },
  { phrase: "chef van deze mascotte", flowId: "mascot_transform" },
  { phrase: "realistische versie", flowId: "mascot_to_human" },
  { phrase: "mascotte veranderen", flowId: "mascot_transform" },
  { phrase: "logo plaatsen", flowId: "logo_placement" },
  { phrase: "logo placement", flowId: "logo_placement" },
  { phrase: "logo beschermen", flowId: "logo_placement" },
  { phrase: "chef van mascotte", flowId: "mascot_transform" },
  { phrase: "mens van mascotte", flowId: "mascot_to_human" },
  { phrase: "upgrade dit karakter", flowId: "character_upgrade" },
  { phrase: "karakter upgraden", flowId: "character_upgrade" },
  { phrase: "mascot naar mens", flowId: "mascot_to_human" },
  { phrase: "hier een mens van", flowId: "mascot_to_human" },
  { phrase: "animatie personage", flowId: "motion_ready" },
  { phrase: "character fusion", flowId: "character_fusion" },
  { phrase: "genetische blend", flowId: "genetic_blend" },
  { phrase: "mens naar mascotte", flowId: "human_to_mascot" },
  { phrase: "andere stijl", flowId: "mascot_transform" },
  { phrase: "maak een chef", flowId: "mascot_transform" },
  { phrase: "motion-ready", flowId: "motion_ready" },
  { phrase: "nieuwe outfit", flowId: "outfit" },
  { phrase: "future child", flowId: "future_child" },
  { phrase: "volledig lichaam", flowId: "full_body" },
  { phrase: "3d versie", flowId: "character_upgrade" },
  { phrase: "3d version", flowId: "character_upgrade" },
  { phrase: "nieuwe stijl", flowId: "mascot_transform" },
  { phrase: "outfit", flowId: "outfit" },
];

/** Longer phrases first so "chef van mascotte" wins over "chef". */
const SORTED_COPILOT_PHRASES = [...CHARACTER_STUDIO_COPILOT_PHRASES].sort(
  (a, b) => b.phrase.length - a.phrase.length
);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CharacterStudioCopilotRouteResult =
  | { kind: "none" }
  | { kind: "flow"; flowId: CharacterStudioFlowId; phrase: string; route: string };

export function characterStudioFlowToActionId(flowId: CharacterStudioFlowId): AssistantActionId {
  switch (flowId) {
    case "outfit":
      return "prepare_outfit";
    case "logo_placement":
      return "prepare_logo_placement";
    case "motion_ready":
    case "full_body":
      return "prepare_motion_character";
    case "mascot_transform":
    case "human_to_mascot":
    case "mascot_to_human":
      return "edit_mascot";
    default:
      return "create_fusion";
  }
}

export function detectCharacterStudioFlowFromMessage(message: string): CharacterStudioCopilotRouteResult {
  const text = normalize(message);
  for (const entry of SORTED_COPILOT_PHRASES) {
    if (text.includes(normalize(entry.phrase))) {
      return {
        kind: "flow",
        flowId: entry.flowId,
        phrase: entry.phrase,
        route: buildCharacterStudioFlowHref(entry.flowId),
      };
    }
  }
  return { kind: "none" };
}

export function buildCharacterStudioCopilotRoute(message: string): string | null {
  const match = detectCharacterStudioFlowFromMessage(message);
  return match.kind === "flow" ? match.route : null;
}
