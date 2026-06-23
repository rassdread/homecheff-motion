/**
 * P0 — Legacy editor routes → Character Studio Hub (redirect-only consolidation).
 */

import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { MASCOT_TRANSFORM_WORKFLOW } from "@/lib/editor-mascot-transformation";
import {
  buildCharacterStudioFlowHref,
  buildCharacterStudioHubHref,
} from "@/lib/character-studio-hub";
import type { CharacterStudioFlowId } from "@/types/character-studio-hub";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

/** Character workflows consolidated under Character Studio Hub. */
const LOGO_PLACEMENT_WORKFLOW = "logo_placement";

export const CHARACTER_STUDIO_FUSION_INTENTS = new Set<EditorFusionIntent>([
  "character_fusion",
  "genetic_blend",
  "future_child",
  "human_into_mascot",
  "mascot_into_human",
  "character_upgrade",
  "outfit_from_reference",
  "person_outfit",
]);

const FUSION_INTENT_TO_FLOW: Partial<Record<EditorFusionIntent, CharacterStudioFlowId>> = {
  outfit_from_reference: "outfit",
  person_outfit: "outfit",
  character_fusion: "character_fusion",
  future_child: "future_child",
  genetic_blend: "genetic_blend",
  character_upgrade: "character_upgrade",
  human_into_mascot: "human_to_mascot",
  mascot_into_human: "mascot_to_human",
};

export function characterStudioFlowForFusionIntent(
  intent: EditorFusionIntent | string | null | undefined
): CharacterStudioFlowId | null {
  if (!intent) {
    return null;
  }
  const normalized = normalizeFusionIntent(intent as EditorFusionIntent);
  return FUSION_INTENT_TO_FLOW[normalized] ?? null;
}

export function isCharacterStudioFusionIntent(intent: EditorFusionIntent | string): boolean {
  const normalized = normalizeFusionIntent(intent as EditorFusionIntent);
  return CHARACTER_STUDIO_FUSION_INTENTS.has(normalized);
}

export function resolveCharacterStudioRouteForFusionIntent(
  intent: EditorFusionIntent | string
): string | null {
  const flowId = characterStudioFlowForFusionIntent(intent);
  return flowId ? buildCharacterStudioFlowHref(flowId) : null;
}

export type LegacyEditorStartRedirect = {
  from: string;
  to: string;
  reason: string;
};

/**
 * Returns a Character Studio URL when a legacy /editor/start URL should redirect.
 * Returns null when the editor start screen should render normally (product combine, edit, export).
 */
export function resolveLegacyEditorStartRedirect(input: {
  workflow?: string | null;
  intent?: string | null;
  bootstrapFusionIntent?: string | null;
}): LegacyEditorStartRedirect | null {
  const workflow = input.workflow?.trim() ?? "";
  const intentParam = input.intent?.trim() ?? "";
  const bootstrapIntent = input.bootstrapFusionIntent?.trim() ?? "";

  if (workflow === MASCOT_TRANSFORM_WORKFLOW) {
    return {
      from: `workflow=${MASCOT_TRANSFORM_WORKFLOW}`,
      to: buildCharacterStudioFlowHref("mascot_transform"),
      reason: "mascot_transform consolidated to Character Studio",
    };
  }

  if (workflow === LOGO_PLACEMENT_WORKFLOW) {
    return {
      from: `workflow=${LOGO_PLACEMENT_WORKFLOW}`,
      to: buildCharacterStudioFlowHref("logo_placement"),
      reason: "logo_placement consolidated to Character Studio",
    };
  }

  const intent = intentParam || bootstrapIntent;
  if (intent) {
    const csRoute = resolveCharacterStudioRouteForFusionIntent(intent);
    if (csRoute) {
      return {
        from: `intent=${intent}`,
        to: csRoute,
        reason: "character fusion intent consolidated to Character Studio",
      };
    }
  }

  if (workflow === "combine" && !intentParam) {
    return null;
  }

  return null;
}

export function resolveLegacyEditorStartRedirectFromSearchParams(
  params: URLSearchParams,
  bootstrapFusionIntent?: string | null
): LegacyEditorStartRedirect | null {
  return resolveLegacyEditorStartRedirect({
    workflow: params.get("workflow"),
    intent: params.get("intent"),
    bootstrapFusionIntent,
  });
}

/** Default fusion Copilot/action route — hub, not editor combine picker. */
export function defaultCharacterFusionAssistantRoute(): string {
  return buildCharacterStudioHubHref();
}
