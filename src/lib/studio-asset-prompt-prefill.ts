/**
 * Heuristic prompt → identity prefill for all asset kinds (no auto-save, no LLM).
 */

import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import type { LocationIdentityFormValues } from "@/lib/studio-location-identity-fields";
import type { PropIdentityFormValues } from "@/lib/studio-prop-identity-fields";
import type { WorldIdentityFormValues } from "@/lib/studio-world-identity-fields";
import {
  LOCATION_IDENTITY_ARCHITECTURE,
  LOCATION_IDENTITY_CORE_STYLES,
  LOCATION_IDENTITY_LIGHTING,
  LOCATION_IDENTITY_MOODS,
  LOCATION_IDENTITY_TYPES,
} from "@/lib/studio-location-identity-presets";
import {
  PROP_IDENTITY_FUNCTIONS,
  PROP_IDENTITY_MATERIALS,
  PROP_IDENTITY_SHAPES,
  PROP_IDENTITY_STYLES,
  PROP_IDENTITY_TYPES,
} from "@/lib/studio-prop-identity-presets";
import {
  WORLD_IDENTITY_ADVANCED_TYPES,
  WORLD_IDENTITY_CORE_TYPES,
  WORLD_IDENTITY_VISUAL_STYLES,
} from "@/lib/studio-world-identity-presets";
import type {
  AssetPromptPrefillProposal,
  StudioAssetKind,
} from "@/types/studio-asset-creation";

function normalizeHaystack(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function firstMatch(haystack: string, candidates: readonly string[]): string {
  for (const id of candidates) {
    const token = id.replace(/_/g, " ");
    if (haystack.includes(id) || haystack.includes(token)) {
      return id;
    }
  }
  return "";
}

function suggestName(prompt: string): string {
  const quoted = prompt.match(/["“]([^"”]+)["”]/);
  if (quoted?.[1]?.trim()) {
    return quoted[1].trim().slice(0, 80);
  }
  const named = prompt.match(/\b(?:named|called|naam)\s+([A-Z][a-zA-Z\s]{1,30})/);
  if (named?.[1]?.trim()) {
    return named[1].trim();
  }
  return "";
}

function computeConfidence(prefill: Record<string, unknown>): number {
  const keys = Object.keys(prefill).filter((k) => {
    const v = prefill[k];
    return typeof v === "string" ? v.trim().length > 0 : v != null && v !== "";
  });
  if (keys.length >= 5) return 0.85;
  if (keys.length >= 3) return 0.65;
  if (keys.length >= 1) return 0.45;
  return 0.2;
}

function buildPropProposal(
  prompt: string,
  usageContext: string,
  brandRules: string
): AssetPromptPrefillProposal {
  const haystack = normalizeHaystack([prompt, usageContext, brandRules]);
  const prefill: Partial<PropIdentityFormValues> = {
    name: suggestName(prompt),
    description: prompt.slice(0, 500),
    propType: firstMatch(haystack, PROP_IDENTITY_TYPES),
    propFunction: firstMatch(haystack, PROP_IDENTITY_FUNCTIONS),
    shapeLanguage: firstMatch(haystack, PROP_IDENTITY_SHAPES),
    material: firstMatch(haystack, PROP_IDENTITY_MATERIALS),
    styleId: firstMatch(haystack, PROP_IDENTITY_STYLES),
    usageContext: usageContext.trim() || prompt.slice(0, 200),
    forbiddenElements: brandRules.trim(),
  };
  const missingFields: string[] = [];
  if (!prefill.name) missingFields.push("name");
  if (!prefill.propType) missingFields.push("propType");
  if (!prefill.styleId) missingFields.push("styleId");

  return {
    kind: "prop",
    confidence: computeConfidence(prefill),
    missingFields,
    reasons: ["source:prompt", ...(prefill.propType ? [`type:${prefill.propType}`] : [])],
    prefill,
  };
}

function buildLocationProposal(
  prompt: string,
  usageContext: string,
  brandRules: string
): AssetPromptPrefillProposal {
  const haystack = normalizeHaystack([prompt, usageContext, brandRules]);
  const prefill: Partial<LocationIdentityFormValues> = {
    name: suggestName(prompt),
    description: prompt.slice(0, 500),
    locationType: firstMatch(haystack, LOCATION_IDENTITY_TYPES),
    visualStyle: firstMatch(haystack, LOCATION_IDENTITY_CORE_STYLES),
    architecture: firstMatch(haystack, LOCATION_IDENTITY_ARCHITECTURE),
    mood: firstMatch(haystack, LOCATION_IDENTITY_MOODS),
    lighting: firstMatch(haystack, LOCATION_IDENTITY_LIGHTING),
    usageContext: usageContext.trim() || prompt.slice(0, 200),
    forbiddenElements: brandRules.trim(),
  };
  const missingFields: string[] = [];
  if (!prefill.name) missingFields.push("name");
  if (!prefill.locationType) missingFields.push("locationType");

  return {
    kind: "location",
    confidence: computeConfidence(prefill),
    missingFields,
    reasons: ["source:prompt", ...(prefill.locationType ? [`type:${prefill.locationType}`] : [])],
    prefill,
  };
}

function buildWorldProposal(
  prompt: string,
  usageContext: string,
  brandRules: string
): AssetPromptPrefillProposal {
  const haystack = normalizeHaystack([prompt, usageContext, brandRules]);
  const worldType =
    firstMatch(haystack, WORLD_IDENTITY_ADVANCED_TYPES) ||
    firstMatch(haystack, WORLD_IDENTITY_CORE_TYPES);
  const prefill: Partial<WorldIdentityFormValues> = {
    name: suggestName(prompt),
    description: prompt.slice(0, 500),
    worldType,
    visualStyle: firstMatch(haystack, WORLD_IDENTITY_VISUAL_STYLES),
    usageContext: usageContext.trim() || prompt.slice(0, 200),
    brandRules: brandRules.trim() || extractRulesFromPrompt(prompt),
    forbiddenElements: brandRules.trim(),
  };
  const missingFields: string[] = [];
  if (!prefill.name) missingFields.push("name");
  if (!prefill.worldType) missingFields.push("worldType");

  return {
    kind: "world",
    confidence: computeConfidence(prefill),
    missingFields,
    reasons: ["source:prompt", ...(prefill.worldType ? [`type:${prefill.worldType}`] : [])],
    prefill,
  };
}

function extractRulesFromPrompt(prompt: string): string {
  const rules = prompt.match(/(?:rules?|regels?|must|moet)[^.!?]{0,120}/gi);
  return rules?.join("; ").slice(0, 300) ?? "";
}

/** Build a wizard proposal from user prompt for any asset kind. */
export function buildAssetPromptPrefillProposal(params: {
  kind: StudioAssetKind;
  prompt: string;
  usageContext?: string;
  brandRules?: string;
  locale?: "en" | "nl";
}): AssetPromptPrefillProposal {
  const prompt = params.prompt.trim();
  const usageContext = params.usageContext?.trim() ?? "";
  const brandRules = params.brandRules?.trim() ?? "";

  if (params.kind === "character") {
    const result = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt, usageContext, brandRules },
      locale: params.locale,
    });
    return {
      kind: "character",
      confidence: result.confidence,
      missingFields: result.missingFields,
      reasons: result.reasons,
      prefill: result.prefill as Record<string, unknown>,
      conflicts: result.conflicts?.map((c) => ({
        field: String(c.field),
        imageValue: c.imageValue,
        promptValue: c.promptValue,
      })),
    };
  }
  if (params.kind === "prop") {
    return buildPropProposal(prompt, usageContext, brandRules);
  }
  if (params.kind === "location") {
    return buildLocationProposal(prompt, usageContext, brandRules);
  }
  return buildWorldProposal(prompt, usageContext, brandRules);
}

/** Map universal entry path to character-specific path where needed. */
export function mapEntryPathToCharacter(
  path: import("@/types/studio-asset-creation").AssetCreateEntryPath
): import("@/components/studio/studio-character-identity-builder").CharacterCreateEntryPath {
  switch (path) {
    case "prompt_only":
      return "prompt_prefill";
    case "image_only":
      return "image_prefill";
    case "image_and_prompt":
      return "image_prefill";
    case "existing_asset":
      return "existing_image";
    default:
      return "design";
  }
}
