import { isStudioPropCategory, type StudioPropCategory } from "@/lib/studio-prop-categories";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { parsePropMemoryFields, type StudioPropMemoryInput } from "@/lib/studio-prop-memory-fields";

export const STUDIO_PROP_NAME_MAX = 120;
export const STUDIO_PROP_TEXT_MAX = 4000;

export type StudioPropCreateInput = StudioPropMemoryInput & {
  name: string;
  category: string;
  description?: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

export type StudioPropUpdateInput = StudioPropMemoryInput & {
  name?: string;
  category?: string;
  description?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

export function validateStudioPropCreateInput(
  raw: StudioPropCreateInput
): ValidationResult<{
  name: string;
  category: StudioPropCategory;
  description: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  appearanceMemory: string;
  brandingRules: string;
  continuityNotes: string;
  continuityStrength: string;
  worldProfileId: string | null;
}> {
  const name = raw.name?.trim() ?? "";
  if (!name) {
    return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
  }
  if (name.length > STUDIO_PROP_NAME_MAX) {
    return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
  }
  if (!isStudioPropCategory(raw.category)) {
    return { ok: false, code: "INVALID_CATEGORY", message: "Invalid prop category." };
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
  const memory = parsePropMemoryFields(raw);
  return {
    ok: true,
    value: {
      name,
      category: raw.category,
      description: trimText(raw.description, STUDIO_PROP_TEXT_MAX),
      referenceImageUrl,
      referenceStorageKey,
      appearanceMemory: memory.appearanceMemory,
      brandingRules: memory.brandingRules,
      continuityNotes: memory.continuityNotes,
      continuityStrength: memory.continuityStrength ?? "strong",
      worldProfileId: memory.worldProfileId ?? null,
    },
  };
}

export function validateStudioPropUpdateInput(
  raw: StudioPropUpdateInput
): ValidationResult<{
  name?: string;
  category?: StudioPropCategory;
  description?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
  appearanceMemory?: string;
  brandingRules?: string;
  continuityNotes?: string;
  continuityStrength?: string;
  worldProfileId?: string | null;
}> {
  const patch: {
    name?: string;
    category?: StudioPropCategory;
    description?: string;
    referenceImageUrl?: string;
    referenceStorageKey?: string;
    appearanceMemory?: string;
    brandingRules?: string;
    continuityNotes?: string;
    continuityStrength?: string;
    worldProfileId?: string | null;
  } = {};

  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) {
      return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
    }
    if (name.length > STUDIO_PROP_NAME_MAX) {
      return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
    }
    patch.name = name;
  }

  if (raw.category !== undefined) {
    if (!isStudioPropCategory(raw.category)) {
      return { ok: false, code: "INVALID_CATEGORY", message: "Invalid prop category." };
    }
    patch.category = raw.category;
  }

  if (raw.description !== undefined) {
    patch.description = trimText(raw.description, STUDIO_PROP_TEXT_MAX);
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

  const memory = parsePropMemoryFields(raw);
  if (raw.appearanceMemory !== undefined) patch.appearanceMemory = memory.appearanceMemory;
  if (raw.brandingRules !== undefined) patch.brandingRules = memory.brandingRules;
  if (raw.continuityNotes !== undefined) patch.continuityNotes = memory.continuityNotes;
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
