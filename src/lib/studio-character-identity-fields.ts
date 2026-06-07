/**
 * Character Identity Builder — form values ↔ Identity Spec Engine ↔ character PATCH.
 * Structured type/style/shape/energy/color stored in visualKeywords (hc:key=value tokens).
 * Usage + forbidden split in continuityNotes.
 */

import { isStudioCharacterRole, type StudioCharacterRole } from "@/lib/studio-character-roles";
import {
  type CharacterIdentityEnergyId,
  type CharacterIdentityShapeId,
  type CharacterIdentityStyleId,
  type CharacterIdentityTypeId,
} from "@/lib/studio-character-identity-presets";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { CharacterIdentitySpecPatch } from "@/types/studio-identity-spec";
import type { StudioCharacterListItem } from "@/types/studio-api";

const STRUCTURED_PREFIX = "hc:";
const FORBIDDEN_MARKER = "[identity:forbidden]";

export type CharacterIdentityFormValues = {
  name: string;
  description: string;
  characterType: CharacterIdentityTypeId | string;
  role: StudioCharacterRole;
  visualStyle: CharacterIdentityStyleId | string;
  shapeLanguage: CharacterIdentityShapeId | string;
  energy: CharacterIdentityEnergyId | string;
  personality: string;
  colorTheme: string;
  clothing: string;
  accessories: string;
  appearanceMemory: string;
  forbiddenElements: string;
  usageContext: string;
  worldProfileId: string | null;
};

const TYPE_TO_ROLE: Record<string, StudioCharacterRole> = {
  human: "human",
  mascot: "mascot",
  animal: "animal",
  avatar: "human",
  robot: "object",
  alien: "other",
  monster: "other",
  object_character: "object",
  vehicle_character: "object",
  brand_character: "mascot",
};

const ROLE_TO_DEFAULT_TYPE: Record<StudioCharacterRole, CharacterIdentityTypeId> = {
  human: "human",
  mascot: "mascot",
  animal: "animal",
  object: "object_character",
  other: "human",
};

type StructuredIdentityKeywords = {
  characterType: string;
  visualStyle: string;
  shapeLanguage: string;
  energy: string;
  colorTheme: string;
  freeTags: string[];
};

function parseStructuredKeywords(raw: string): StructuredIdentityKeywords {
  const freeTags: string[] = [];
  const out: StructuredIdentityKeywords = {
    characterType: "",
    visualStyle: "",
    shapeLanguage: "",
    energy: "",
    colorTheme: "",
    freeTags,
  };

  for (const part of raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
    if (part.startsWith(STRUCTURED_PREFIX)) {
      const body = part.slice(STRUCTURED_PREFIX.length);
      const eq = body.indexOf("=");
      if (eq <= 0) continue;
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      if (key === "type") out.characterType = value;
      if (key === "style") out.visualStyle = value;
      if (key === "shape") out.shapeLanguage = value;
      if (key === "energy") out.energy = value;
      if (key === "color") out.colorTheme = value;
    } else {
      freeTags.push(part);
    }
  }
  return out;
}

function encodeStructuredKeywords(structured: StructuredIdentityKeywords): string {
  const tokens: string[] = [];
  if (structured.characterType) {
    tokens.push(`${STRUCTURED_PREFIX}type=${structured.characterType}`);
  }
  if (structured.visualStyle) {
    tokens.push(`${STRUCTURED_PREFIX}style=${structured.visualStyle}`);
  }
  if (structured.shapeLanguage) {
    tokens.push(`${STRUCTURED_PREFIX}shape=${structured.shapeLanguage}`);
  }
  if (structured.energy) {
    tokens.push(`${STRUCTURED_PREFIX}energy=${structured.energy}`);
  }
  if (structured.colorTheme) {
    tokens.push(`${STRUCTURED_PREFIX}color=${structured.colorTheme}`);
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

export function mapCharacterTypeToRole(characterType: string): StudioCharacterRole {
  return TYPE_TO_ROLE[characterType] ?? "other";
}

export function emptyCharacterIdentityForm(
  overrides?: Partial<CharacterIdentityFormValues>
): CharacterIdentityFormValues {
  return {
    name: "",
    description: "",
    characterType: "",
    role: "mascot",
    visualStyle: "",
    shapeLanguage: "",
    energy: "",
    personality: "",
    colorTheme: "",
    clothing: "",
    accessories: "",
    appearanceMemory: "",
    forbiddenElements: "",
    usageContext: "",
    worldProfileId: null,
    ...overrides,
  };
}

/** Merge identity form into a list item shape for completeness / spec preview. */
export function characterListItemPreviewFromIdentityForm(
  form: CharacterIdentityFormValues,
  base?: Partial<StudioCharacterListItem>
): StudioCharacterListItem {
  const patch = characterIdentityFormToPatch(form);
  return {
    id: base?.id ?? "preview",
    ownerId: base?.ownerId ?? "",
    name: patch.name ?? form.name,
    slug: base?.slug ?? "",
    role: (patch.role as StudioCharacterListItem["role"]) ?? form.role,
    description: patch.description ?? form.description,
    personality: patch.personality ?? form.personality,
    referenceImageUrl: base?.referenceImageUrl ?? "",
    isMascot: form.characterType === "mascot" || form.role === "mascot",
    appearanceMemory: patch.appearanceMemory ?? "",
    personalityMemory: patch.personalityMemory ?? "",
    continuityNotes: patch.continuityNotes ?? "",
    defaultClothing: patch.defaultClothing ?? "",
    defaultAccessories: patch.defaultAccessories ?? "",
    visualKeywords: patch.visualKeywords ?? "",
    primaryReferenceImageId: base?.primaryReferenceImageId ?? null,
    referenceNotes: base?.referenceNotes ?? "",
    identityStrength: base?.identityStrength ?? "strong",
    continuityStrength: base?.continuityStrength ?? "strong",
    worldProfileId: patch.worldProfileId ?? null,
    worldProfile: base?.worldProfile ?? null,
    voiceEnabled: base?.voiceEnabled ?? false,
    voiceProvider: base?.voiceProvider ?? "",
    voiceProfile: base?.voiceProfile ?? "",
    voiceLanguage: base?.voiceLanguage ?? "en",
    voiceGender: base?.voiceGender ?? "",
    voiceDescription: base?.voiceDescription ?? "",
    voiceNotes: base?.voiceNotes ?? "",
    voiceLock: base?.voiceLock ?? false,
    voiceProfilesByLanguage: base?.voiceProfilesByLanguage ?? {},
    performanceEnabled: base?.performanceEnabled ?? false,
    defaultSmileStrength: base?.defaultSmileStrength ?? 70,
    defaultBlinkRate: base?.defaultBlinkRate ?? "medium",
    defaultHeadMovement: base?.defaultHeadMovement ?? "medium",
    defaultMouthIntensity: base?.defaultMouthIntensity ?? "medium",
    idleAnimationStyle: base?.idleAnimationStyle ?? "subtle",
    performanceNotes: base?.performanceNotes ?? "",
    mouthAnimationEnabled: base?.mouthAnimationEnabled ?? false,
    mouthClosedAssetUrl: base?.mouthClosedAssetUrl ?? "",
    mouthSmallAssetUrl: base?.mouthSmallAssetUrl ?? "",
    mouthMediumAssetUrl: base?.mouthMediumAssetUrl ?? "",
    mouthWideAssetUrl: base?.mouthWideAssetUrl ?? "",
    createdAt: base?.createdAt ?? new Date(0).toISOString(),
    updatedAt: base?.updatedAt ?? new Date(0).toISOString(),
  };
}

export function characterIdentityFormFromCharacter(
  character: StudioCharacterListItem
): CharacterIdentityFormValues {
  const spec = toIdentitySpec(character);
  const structured = parseStructuredKeywords(spec.visualKeywords);
  const { usageContext, forbiddenElements } = parseContinuityNotes(spec.continuityMetadata.notes);

  const role = isStudioCharacterRole(spec.role) ? spec.role : "other";
  const characterType =
    structured.characterType ||
    (role === "mascot" && character.isMascot ? "mascot" : ROLE_TO_DEFAULT_TYPE[role]);

  return {
    name: spec.name,
    description: spec.description,
    characterType,
    role,
    visualStyle: structured.visualStyle,
    shapeLanguage: structured.shapeLanguage,
    energy: structured.energy,
    personality: spec.personality.trim() || spec.memoryMetadata.personalityMemory.trim(),
    colorTheme: structured.colorTheme,
    clothing: spec.memoryMetadata.defaultClothing,
    accessories: spec.memoryMetadata.defaultAccessories,
    appearanceMemory: spec.memoryMetadata.appearanceMemory,
    forbiddenElements,
    usageContext,
    worldProfileId: spec.world.id,
  };
}

export function characterIdentityFormToPatch(
  values: CharacterIdentityFormValues
): CharacterIdentitySpecPatch {
  const role = mapCharacterTypeToRole(values.characterType);
  const visualKeywords = encodeStructuredKeywords({
    characterType: values.characterType,
    visualStyle: values.visualStyle,
    shapeLanguage: values.shapeLanguage,
    energy: values.energy,
    colorTheme: values.colorTheme,
    freeTags: [],
  });

  return {
    name: values.name.trim(),
    role,
    description: values.description,
    personality: values.personality,
    appearanceMemory: values.appearanceMemory,
    personalityMemory: values.personality,
    visualKeywords,
    defaultClothing: values.clothing,
    defaultAccessories: values.accessories,
    continuityNotes: buildContinuityNotes(values.usageContext, values.forbiddenElements),
    worldProfileId: values.worldProfileId,
  };
}

export function mergeCharacterIdentityForm(
  base: CharacterIdentityFormValues,
  suggestion: Partial<CharacterIdentityFormValues>
): CharacterIdentityFormValues {
  return { ...base, ...suggestion };
}

export function characterIdentityCompletenessTier(
  score: number
): "complete" | "almost" | "missing" {
  if (score >= 85) return "complete";
  if (score >= 50) return "almost";
  return "missing";
}

export type CharacterVoiceIdentityStatus = "none" | "preset" | "clone" | "locked";

export function resolveCharacterVoiceIdentityStatus(
  character: StudioCharacterListItem
): CharacterVoiceIdentityStatus {
  if (!character.voiceEnabled || !character.voiceProfile.trim()) {
    return "none";
  }
  if (character.voiceLock) {
    return "locked";
  }
  if (character.voiceProfile.startsWith("clone:")) {
    return "clone";
  }
  return "preset";
}
