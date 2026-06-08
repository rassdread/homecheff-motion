/**
 * Prop identity read-only hints for Visual Production, prompts, and Shot Planner.
 */

import { parsePropStructuredKeywords } from "@/lib/studio-prop-identity-structured";
import { propIdentityFormFromProp } from "@/lib/studio-prop-identity-fields";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { PropIdentitySpec } from "@/types/studio-identity-spec";
import type { StudioPropListItem } from "@/types/studio-api";
import type { PropMemorySnapshot } from "@/types/studio-memory-snapshots";

export type PropIdentityShotHint = {
  preferredShotTypes: StudioShotType[];
  focusHintKey: string;
  rationaleKey: string;
};

const TYPE_SHOT_HINTS: Record<string, PropIdentityShotHint> = {
  tool: {
    preferredShotTypes: ["close_up", "medium_close_up"],
    focusHintKey: "studio.propIdentity.shotHint.tool",
    rationaleKey: "studio.propIdentity.shotHint.tool",
  },
  sport: {
    preferredShotTypes: ["medium", "medium_wide"],
    focusHintKey: "studio.propIdentity.shotHint.sport",
    rationaleKey: "studio.propIdentity.shotHint.sport",
  },
  food: {
    preferredShotTypes: ["close_up", "medium_close_up"],
    focusHintKey: "studio.propIdentity.shotHint.food",
    rationaleKey: "studio.propIdentity.shotHint.food",
  },
  transport: {
    preferredShotTypes: ["medium_wide", "wide"],
    focusHintKey: "studio.propIdentity.shotHint.transport",
    rationaleKey: "studio.propIdentity.shotHint.transport",
  },
  business: {
    preferredShotTypes: ["medium_close_up", "medium"],
    focusHintKey: "studio.propIdentity.shotHint.package",
    rationaleKey: "studio.propIdentity.shotHint.package",
  },
};

const FUNCTION_SHOT_HINTS: Record<string, PropIdentityShotHint> = {
  delivery: {
    preferredShotTypes: ["medium", "medium_close_up"],
    focusHintKey: "studio.propIdentity.shotHint.package",
    rationaleKey: "studio.propIdentity.shotHint.package",
  },
  sports: {
    preferredShotTypes: ["medium_wide", "medium"],
    focusHintKey: "studio.propIdentity.shotHint.sport",
    rationaleKey: "studio.propIdentity.shotHint.sport",
  },
  cooking: {
    preferredShotTypes: ["close_up", "medium_close_up"],
    focusHintKey: "studio.propIdentity.shotHint.tool",
    rationaleKey: "studio.propIdentity.shotHint.tool",
  },
};

export function resolvePropIdentityShotHint(
  propType: string,
  propFunction: string
): PropIdentityShotHint | null {
  return (
    FUNCTION_SHOT_HINTS[propFunction] ??
    TYPE_SHOT_HINTS[propType] ??
    null
  );
}

export function resolvePropIdentityShotHintFromProp(
  prop: StudioPropListItem | null | undefined
): PropIdentityShotHint | null {
  if (!prop) return null;
  const form = propIdentityFormFromProp(prop);
  return resolvePropIdentityShotHint(form.propType, form.propFunction);
}

export function buildPropIdentityVisualProductionLines(spec: PropIdentitySpec): string[] {
  const structured = parsePropStructuredKeywords(spec.memoryMetadata.appearanceMemory);
  const lines: string[] = [];

  if (structured.propType) {
    lines.push(`Prop type: ${structured.propType.replace(/_/g, " ")}.`);
  }
  if (structured.propFunction) {
    lines.push(`Function: ${structured.propFunction.replace(/_/g, " ")}.`);
  }
  if (structured.shapeLanguage) {
    lines.push(`Shape language: ${structured.shapeLanguage.replace(/_/g, " ")}.`);
  }
  if (structured.material) {
    lines.push(`Material: ${structured.material.replace(/_/g, " ")}.`);
  }
  if (structured.colorTheme) {
    lines.push(`Color theme: ${structured.colorTheme.replace(/_/g, " ")}.`);
  }
  if (structured.sizeImpression) {
    lines.push(`Size impression: ${structured.sizeImpression.replace(/_/g, " ")}.`);
  }
  if (structured.styleId) {
    lines.push(`Style: ${structured.styleId.replace(/_/g, " ")}.`);
  }
  if (structured.linkedCharacterIds.length > 0) {
    lines.push(`Linked characters: ${structured.linkedCharacterIds.join(", ")}.`);
    lines.push(`Keep this prop visually tied to its linked character when both appear.`);
  }

  const details = spec.memoryMetadata.appearanceMemory;
  const detailText = details.includes("[identity:details]")
    ? details.slice(details.indexOf("[identity:details]") + "[identity:details]".length).trim()
    : "";
  if (detailText) {
    lines.push(`Visual details: ${detailText}.`);
  }
  if (spec.world.name) {
    lines.push(`World: ${spec.world.name}.`);
  }

  return lines;
}

export function buildPropIdentityMemoryPromptExtras(
  prop: PropMemorySnapshot,
  characterNamesById?: Map<string, string>
): string[] {
  const structured = parsePropStructuredKeywords(prop.appearanceMemory);
  const lines: string[] = [];

  if (structured.propType) {
    lines.push(`Prop type: ${structured.propType.replace(/_/g, " ")}.`);
  }
  if (structured.propFunction) {
    lines.push(`Function: ${structured.propFunction.replace(/_/g, " ")}.`);
  }
  if (structured.shapeLanguage) {
    lines.push(`Shape: ${structured.shapeLanguage.replace(/_/g, " ")}.`);
  }
  if (structured.material) {
    lines.push(`Material: ${structured.material.replace(/_/g, " ")}.`);
  }
  if (structured.sizeImpression) {
    lines.push(`Size: ${structured.sizeImpression.replace(/_/g, " ")}.`);
  }
  if (structured.styleId) {
    lines.push(`Style: ${structured.styleId.replace(/_/g, " ")}.`);
  }
  if (structured.linkedCharacterIds.length > 0) {
    const names = structured.linkedCharacterIds.map(
      (id) => characterNamesById?.get(id) ?? id
    );
    lines.push(`Signature prop for ${names.join(" and ")}.`);
  }

  return lines;
}

export function buildPropIdentityPromptContext(prop: StudioPropListItem | null): string {
  if (!prop) return "";
  return buildPropIdentityVisualProductionLines(toIdentitySpec(prop)).join(" ");
}
