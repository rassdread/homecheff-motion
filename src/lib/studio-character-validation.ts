import { isStudioCharacterRole, type StudioCharacterRole } from "@/lib/studio-character-roles";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import {
  parseContinuityStrengthField,
  parseIdentityStrengthField,
  parseOptionalReferenceId,
  parseOptionalWorldProfileId,
  trimMemoryKeywords,
  trimMemoryText,
} from "@/lib/studio-memory-validation";

export const STUDIO_CHARACTER_NAME_MAX = 120;
export const STUDIO_CHARACTER_TEXT_MAX = 4000;

export type StudioCharacterMemoryInput = {
  appearanceMemory?: string;
  personalityMemory?: string;
  continuityNotes?: string;
  defaultClothing?: string;
  defaultAccessories?: string;
  visualKeywords?: string;
  primaryReferenceImageId?: string | null;
  referenceNotes?: string;
  identityStrength?: string;
  continuityStrength?: string;
  worldProfileId?: string | null;
};

export type StudioCharacterCreateInput = StudioCharacterMemoryInput & {
  name: string;
  role: string;
  description?: string;
  personality?: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

export type StudioCharacterUpdateInput = StudioCharacterMemoryInput & {
  name?: string;
  role?: string;
  description?: string;
  personality?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

function parseCharacterMemoryFields(raw: StudioCharacterMemoryInput) {
  return {
    appearanceMemory: trimMemoryText(raw.appearanceMemory, STUDIO_CHARACTER_TEXT_MAX),
    personalityMemory: trimMemoryText(raw.personalityMemory, STUDIO_CHARACTER_TEXT_MAX),
    continuityNotes: trimMemoryText(raw.continuityNotes, STUDIO_CHARACTER_TEXT_MAX),
    defaultClothing: trimMemoryText(raw.defaultClothing, STUDIO_CHARACTER_TEXT_MAX),
    defaultAccessories: trimMemoryText(raw.defaultAccessories, STUDIO_CHARACTER_TEXT_MAX),
    visualKeywords: trimMemoryKeywords(raw.visualKeywords),
    primaryReferenceImageId: parseOptionalReferenceId(raw.primaryReferenceImageId),
    referenceNotes: trimMemoryText(raw.referenceNotes, STUDIO_CHARACTER_TEXT_MAX),
    identityStrength: parseIdentityStrengthField(raw.identityStrength),
    continuityStrength: parseContinuityStrengthField(raw.continuityStrength),
    worldProfileId: parseOptionalWorldProfileId(raw.worldProfileId),
  };
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

export function validateStudioCharacterCreateInput(
  raw: StudioCharacterCreateInput
): ValidationResult<{
  name: string;
  role: StudioCharacterRole;
  description: string;
  personality: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  appearanceMemory: string;
  personalityMemory: string;
  continuityNotes: string;
  defaultClothing: string;
  defaultAccessories: string;
  visualKeywords: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
  identityStrength: string;
  continuityStrength: string;
  worldProfileId: string | null;
}> {
  const name = raw.name?.trim() ?? "";
  if (!name) {
    return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
  }
  if (name.length > STUDIO_CHARACTER_NAME_MAX) {
    return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
  }
  if (!isStudioCharacterRole(raw.role)) {
    return { ok: false, code: "INVALID_ROLE", message: "Invalid character role." };
  }
  const referenceImageUrl = raw.referenceImageUrl?.trim() ?? "";
  const referenceStorageKey = raw.referenceStorageKey?.trim() ?? "";
  if (!referenceImageUrl || !referenceStorageKey) {
    return {
      ok: false,
      code: "REFERENCE_IMAGE_REQUIRED",
      message: "Reference image is required.",
    };
  }
  if (!isValidHttpUrl(referenceImageUrl)) {
    return { ok: false, code: "INVALID_REFERENCE_URL", message: "Invalid reference image URL." };
  }
  const memory = parseCharacterMemoryFields(raw);
  return {
    ok: true,
    value: {
      name,
      role: raw.role,
      description: trimText(raw.description, STUDIO_CHARACTER_TEXT_MAX),
      personality: trimText(raw.personality, STUDIO_CHARACTER_TEXT_MAX),
      referenceImageUrl,
      referenceStorageKey,
      appearanceMemory: memory.appearanceMemory,
      personalityMemory: memory.personalityMemory,
      continuityNotes: memory.continuityNotes,
      defaultClothing: memory.defaultClothing,
      defaultAccessories: memory.defaultAccessories,
      visualKeywords: memory.visualKeywords,
      primaryReferenceImageId: memory.primaryReferenceImageId ?? null,
      referenceNotes: memory.referenceNotes,
      identityStrength: memory.identityStrength ?? "strong",
      continuityStrength: memory.continuityStrength ?? "strong",
      worldProfileId: memory.worldProfileId ?? null,
    },
  };
}

export function validateStudioCharacterUpdateInput(
  raw: StudioCharacterUpdateInput
): ValidationResult<{
  name?: string;
  role?: StudioCharacterRole;
  description?: string;
  personality?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
  appearanceMemory?: string;
  personalityMemory?: string;
  continuityNotes?: string;
  defaultClothing?: string;
  defaultAccessories?: string;
  visualKeywords?: string;
  primaryReferenceImageId?: string | null;
  referenceNotes?: string;
  identityStrength?: string;
  continuityStrength?: string;
  worldProfileId?: string | null;
}> {
  const patch: {
    name?: string;
    role?: StudioCharacterRole;
    description?: string;
    personality?: string;
    referenceImageUrl?: string;
    referenceStorageKey?: string;
    appearanceMemory?: string;
    personalityMemory?: string;
    continuityNotes?: string;
    defaultClothing?: string;
    defaultAccessories?: string;
    visualKeywords?: string;
    primaryReferenceImageId?: string | null;
    referenceNotes?: string;
    identityStrength?: string;
    continuityStrength?: string;
    worldProfileId?: string | null;
  } = {};

  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) {
      return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
    }
    if (name.length > STUDIO_CHARACTER_NAME_MAX) {
      return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
    }
    patch.name = name;
  }

  if (raw.role !== undefined) {
    if (!isStudioCharacterRole(raw.role)) {
      return { ok: false, code: "INVALID_ROLE", message: "Invalid character role." };
    }
    patch.role = raw.role;
  }

  if (raw.description !== undefined) {
    patch.description = trimText(raw.description, STUDIO_CHARACTER_TEXT_MAX);
  }
  if (raw.personality !== undefined) {
    patch.personality = trimText(raw.personality, STUDIO_CHARACTER_TEXT_MAX);
  }

  const hasRefUrl = raw.referenceImageUrl !== undefined;
  const hasRefKey = raw.referenceStorageKey !== undefined;
  if (hasRefUrl !== hasRefKey) {
    return {
      ok: false,
      code: "REFERENCE_PAIR_REQUIRED",
      message: "Reference image URL and storage key must be provided together.",
    };
  }
  if (hasRefUrl && hasRefKey) {
    const referenceImageUrl = raw.referenceImageUrl!.trim();
    const referenceStorageKey = raw.referenceStorageKey!.trim();
    if (!referenceImageUrl || !referenceStorageKey) {
      return {
        ok: false,
        code: "REFERENCE_IMAGE_REQUIRED",
        message: "Reference image is required.",
      };
    }
    if (!isValidHttpUrl(referenceImageUrl)) {
      return { ok: false, code: "INVALID_REFERENCE_URL", message: "Invalid reference image URL." };
    }
    patch.referenceImageUrl = referenceImageUrl;
    patch.referenceStorageKey = referenceStorageKey;
  }

  const memory = parseCharacterMemoryFields(raw);
  if (raw.appearanceMemory !== undefined) {
    patch.appearanceMemory = memory.appearanceMemory;
  }
  if (raw.personalityMemory !== undefined) {
    patch.personalityMemory = memory.personalityMemory;
  }
  if (raw.continuityNotes !== undefined) {
    patch.continuityNotes = memory.continuityNotes;
  }
  if (raw.defaultClothing !== undefined) {
    patch.defaultClothing = memory.defaultClothing;
  }
  if (raw.defaultAccessories !== undefined) {
    patch.defaultAccessories = memory.defaultAccessories;
  }
  if (raw.visualKeywords !== undefined) {
    patch.visualKeywords = memory.visualKeywords;
  }
  if (raw.primaryReferenceImageId !== undefined) {
    patch.primaryReferenceImageId = memory.primaryReferenceImageId ?? null;
  }
  if (raw.referenceNotes !== undefined) {
    patch.referenceNotes = memory.referenceNotes;
  }
  if (raw.identityStrength !== undefined && memory.identityStrength) {
    patch.identityStrength = memory.identityStrength;
  }
  if (raw.continuityStrength !== undefined && memory.continuityStrength) {
    patch.continuityStrength = memory.continuityStrength;
  }
  if (raw.worldProfileId !== undefined) {
    patch.worldProfileId = memory.worldProfileId ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
