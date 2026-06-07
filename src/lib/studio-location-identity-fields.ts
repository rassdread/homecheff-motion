/**
 * Location Identity Builder — form values ↔ Identity Spec Engine ↔ location PATCH.
 * Structured type/style/mood/arch/material/light/crowd/color stored in environmentKeywords (hc:key=value).
 * Usage + forbidden split in continuityNotes.
 */

import {
  isStudioLocationCategory,
  type StudioLocationCategory,
} from "@/lib/studio-location-categories";
import {
  type LocationIdentityArchitectureId,
  type LocationIdentityCrowdId,
  type LocationIdentityLightingId,
  type LocationIdentityMoodId,
  type LocationIdentityStyleId,
  type LocationIdentityTypeId,
} from "@/lib/studio-location-identity-presets";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { LocationIdentitySpecPatch } from "@/types/studio-identity-spec";
import type { StudioLocationListItem } from "@/types/studio-api";

const STRUCTURED_PREFIX = "hc:";
const FORBIDDEN_MARKER = "[identity:forbidden]";

export type LocationIdentityFormValues = {
  name: string;
  description: string;
  locationType: LocationIdentityTypeId | string;
  visualStyle: LocationIdentityStyleId | string;
  mood: LocationIdentityMoodId | string;
  architecture: LocationIdentityArchitectureId | string;
  materials: string;
  colorTheme: string;
  lighting: LocationIdentityLightingId | string;
  crowdLevel: LocationIdentityCrowdId | string;
  visualIdentity: string;
  worldMemory: string;
  forbiddenElements: string;
  usageContext: string;
  worldProfileId: string | null;
};

const TYPE_TO_CATEGORY: Record<string, StudioLocationCategory> = {
  kitchen: "restaurant",
  restaurant: "restaurant",
  market: "market",
  garden: "garden",
  street: "street",
  living_room: "home",
  studio_room: "office",
  shop: "city",
  pickup: "city",
  workshop: "other",
  school: "other",
  office: "office",
};

const CATEGORY_TO_DEFAULT_TYPE: Record<StudioLocationCategory, LocationIdentityTypeId> = {
  city: "shop",
  restaurant: "restaurant",
  garden: "garden",
  market: "market",
  street: "street",
  home: "living_room",
  office: "office",
  nature: "garden",
  fantasy: "garden",
  other: "workshop",
};

type StructuredLocationKeywords = {
  locationType: string;
  visualStyle: string;
  mood: string;
  architecture: string;
  materials: string;
  colorTheme: string;
  lighting: string;
  crowdLevel: string;
  freeTags: string[];
};

export function parseLocationStructuredKeywords(raw: string): StructuredLocationKeywords {
  const freeTags: string[] = [];
  const out: StructuredLocationKeywords = {
    locationType: "",
    visualStyle: "",
    mood: "",
    architecture: "",
    materials: "",
    colorTheme: "",
    lighting: "",
    crowdLevel: "",
    freeTags,
  };

  for (const part of raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
    if (part.startsWith(STRUCTURED_PREFIX)) {
      const body = part.slice(STRUCTURED_PREFIX.length);
      const eq = body.indexOf("=");
      if (eq <= 0) continue;
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      if (key === "type") out.locationType = value;
      if (key === "style") out.visualStyle = value;
      if (key === "mood") out.mood = value;
      if (key === "arch") out.architecture = value;
      if (key === "mat") out.materials = value.replace(/\|/g, ", ");
      if (key === "color") out.colorTheme = value;
      if (key === "light") out.lighting = value;
      if (key === "crowd") out.crowdLevel = value;
    } else {
      freeTags.push(part);
    }
  }
  return out;
}

function encodeStructuredKeywords(structured: StructuredLocationKeywords): string {
  const tokens: string[] = [];
  if (structured.locationType) {
    tokens.push(`${STRUCTURED_PREFIX}type=${structured.locationType}`);
  }
  if (structured.visualStyle) {
    tokens.push(`${STRUCTURED_PREFIX}style=${structured.visualStyle}`);
  }
  if (structured.mood) {
    tokens.push(`${STRUCTURED_PREFIX}mood=${structured.mood}`);
  }
  if (structured.architecture) {
    tokens.push(`${STRUCTURED_PREFIX}arch=${structured.architecture}`);
  }
  if (structured.materials) {
    tokens.push(
      `${STRUCTURED_PREFIX}mat=${structured.materials.replace(/,\s*/g, "|")}`
    );
  }
  if (structured.colorTheme) {
    tokens.push(`${STRUCTURED_PREFIX}color=${structured.colorTheme}`);
  }
  if (structured.lighting) {
    tokens.push(`${STRUCTURED_PREFIX}light=${structured.lighting}`);
  }
  if (structured.crowdLevel) {
    tokens.push(`${STRUCTURED_PREFIX}crowd=${structured.crowdLevel}`);
  }
  tokens.push(...structured.freeTags);
  return tokens.join(", ");
}

function parseContinuityNotes(raw: string): { usageContext: string; forbiddenElements: string } {
  const idx = raw.indexOf(FORBIDDEN_MARKER);
  if (idx === -1) {
    return { usageContext: raw.trim(), forbiddenElements: "" };
  }
  return {
    usageContext: raw.slice(0, idx).trim(),
    forbiddenElements: raw.slice(idx + FORBIDDEN_MARKER.length).trim(),
  };
}

function buildContinuityNotes(usageContext: string, forbiddenElements: string): string {
  const usage = usageContext.trim();
  const forbidden = forbiddenElements.trim();
  if (!forbidden) {
    return usage;
  }
  if (!usage) {
    return `${FORBIDDEN_MARKER}\n${forbidden}`;
  }
  return `${usage}\n\n${FORBIDDEN_MARKER}\n${forbidden}`;
}

export function mapLocationTypeToCategory(locationType: string): StudioLocationCategory {
  return TYPE_TO_CATEGORY[locationType] ?? "other";
}

export function locationIdentityFormFromLocation(
  location: StudioLocationListItem
): LocationIdentityFormValues {
  const spec = toIdentitySpec(location);
  const structured = parseLocationStructuredKeywords(spec.visualKeywords);
  const { usageContext, forbiddenElements } = parseContinuityNotes(spec.continuityMetadata.notes);

  const category = isStudioLocationCategory(spec.type) ? spec.type : "other";
  const locationType =
    structured.locationType ||
    (category === "other" ? "" : CATEGORY_TO_DEFAULT_TYPE[category]);

  return {
    name: spec.name,
    description: spec.description,
    locationType,
    visualStyle: structured.visualStyle,
    mood: structured.mood,
    architecture: structured.architecture,
    materials: structured.materials,
    colorTheme: structured.colorTheme,
    lighting: structured.lighting,
    crowdLevel: structured.crowdLevel,
    visualIdentity: spec.memoryMetadata.visualIdentity.trim(),
    worldMemory: spec.memoryMetadata.worldMemory.trim(),
    forbiddenElements,
    usageContext,
    worldProfileId: spec.world.id,
  };
}

export function locationIdentityFormToPatch(
  values: LocationIdentityFormValues
): LocationIdentitySpecPatch {
  const category = mapLocationTypeToCategory(values.locationType);
  const environmentKeywords = encodeStructuredKeywords({
    locationType: values.locationType,
    visualStyle: values.visualStyle,
    mood: values.mood,
    architecture: values.architecture,
    materials: values.materials,
    colorTheme: values.colorTheme,
    lighting: values.lighting,
    crowdLevel: values.crowdLevel,
    freeTags: [],
  });

  return {
    name: values.name.trim(),
    category,
    description: values.description,
    visualIdentity: values.visualIdentity,
    worldMemory: values.worldMemory,
    environmentKeywords,
    continuityNotes: buildContinuityNotes(values.usageContext, values.forbiddenElements),
    worldProfileId: values.worldProfileId,
  };
}

export function mergeLocationIdentityForm(
  base: LocationIdentityFormValues,
  suggestion: Partial<LocationIdentityFormValues>
): LocationIdentityFormValues {
  return { ...base, ...suggestion };
}

export function locationIdentityCompletenessTier(
  score: number
): "complete" | "almost" | "missing" {
  if (score >= 85) return "complete";
  if (score >= 50) return "almost";
  return "missing";
}
