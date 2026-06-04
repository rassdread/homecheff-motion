import {
  parseContinuityStrengthField,
  trimMemoryText,
} from "@/lib/studio-memory-validation";

export const STUDIO_WORLD_NAME_MAX = 120;
export const STUDIO_WORLD_TEXT_MAX = 4000;

export type StudioWorldProfileCreateInput = {
  name: string;
  description?: string;
  visualStyle?: string;
  tone?: string;
  continuityRules?: string;
  continuityStrength?: string;
};

export type StudioWorldProfileUpdateInput = {
  name?: string;
  description?: string;
  visualStyle?: string;
  tone?: string;
  continuityRules?: string;
  continuityStrength?: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export function validateStudioWorldProfileCreateInput(
  raw: StudioWorldProfileCreateInput
): ValidationResult<{
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: string;
}> {
  const name = raw.name?.trim() ?? "";
  if (!name) {
    return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
  }
  if (name.length > STUDIO_WORLD_NAME_MAX) {
    return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
  }
  const continuityStrength = parseContinuityStrengthField(raw.continuityStrength) ?? "strong";
  return {
    ok: true,
    value: {
      name,
      description: trimMemoryText(raw.description, STUDIO_WORLD_TEXT_MAX),
      visualStyle: trimMemoryText(raw.visualStyle, STUDIO_WORLD_TEXT_MAX),
      tone: trimMemoryText(raw.tone, STUDIO_WORLD_TEXT_MAX),
      continuityRules: trimMemoryText(raw.continuityRules, STUDIO_WORLD_TEXT_MAX),
      continuityStrength,
    },
  };
}

export function validateStudioWorldProfileUpdateInput(
  raw: StudioWorldProfileUpdateInput
): ValidationResult<Partial<{
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: string;
}>> {
  const patch: Partial<{
    name: string;
    description: string;
    visualStyle: string;
    tone: string;
    continuityRules: string;
    continuityStrength: string;
  }> = {};

  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) {
      return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
    }
    if (name.length > STUDIO_WORLD_NAME_MAX) {
      return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
    }
    patch.name = name;
  }
  if (raw.description !== undefined) {
    patch.description = trimMemoryText(raw.description, STUDIO_WORLD_TEXT_MAX);
  }
  if (raw.visualStyle !== undefined) {
    patch.visualStyle = trimMemoryText(raw.visualStyle, STUDIO_WORLD_TEXT_MAX);
  }
  if (raw.tone !== undefined) {
    patch.tone = trimMemoryText(raw.tone, STUDIO_WORLD_TEXT_MAX);
  }
  if (raw.continuityRules !== undefined) {
    patch.continuityRules = trimMemoryText(raw.continuityRules, STUDIO_WORLD_TEXT_MAX);
  }
  if (raw.continuityStrength !== undefined) {
    const strength = parseContinuityStrengthField(raw.continuityStrength);
    if (strength) {
      patch.continuityStrength = strength;
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
