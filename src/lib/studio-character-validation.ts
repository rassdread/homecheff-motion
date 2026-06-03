import { isStudioCharacterRole, type StudioCharacterRole } from "@/lib/studio-character-roles";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

export const STUDIO_CHARACTER_NAME_MAX = 120;
export const STUDIO_CHARACTER_TEXT_MAX = 4000;

export type StudioCharacterCreateInput = {
  name: string;
  role: string;
  description?: string;
  personality?: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

export type StudioCharacterUpdateInput = {
  name?: string;
  role?: string;
  description?: string;
  personality?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

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
  return {
    ok: true,
    value: {
      name,
      role: raw.role,
      description: trimText(raw.description, STUDIO_CHARACTER_TEXT_MAX),
      personality: trimText(raw.personality, STUDIO_CHARACTER_TEXT_MAX),
      referenceImageUrl,
      referenceStorageKey,
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
}> {
  const patch: {
    name?: string;
    role?: StudioCharacterRole;
    description?: string;
    personality?: string;
    referenceImageUrl?: string;
    referenceStorageKey?: string;
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

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
