import { isStudioLocationCategory, type StudioLocationCategory } from "@/lib/studio-location-categories";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

export const STUDIO_LOCATION_NAME_MAX = 120;
export const STUDIO_LOCATION_TEXT_MAX = 4000;

export type StudioLocationCreateInput = {
  name: string;
  category: string;
  description?: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

export type StudioLocationUpdateInput = {
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

export function validateStudioLocationCreateInput(
  raw: StudioLocationCreateInput
): ValidationResult<{
  name: string;
  category: StudioLocationCategory;
  description: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
}> {
  const name = raw.name?.trim() ?? "";
  if (!name) {
    return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
  }
  if (name.length > STUDIO_LOCATION_NAME_MAX) {
    return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
  }
  if (!isStudioLocationCategory(raw.category)) {
    return { ok: false, code: "INVALID_CATEGORY", message: "Invalid location category." };
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
      category: raw.category,
      description: trimText(raw.description, STUDIO_LOCATION_TEXT_MAX),
      referenceImageUrl,
      referenceStorageKey,
    },
  };
}

export function validateStudioLocationUpdateInput(
  raw: StudioLocationUpdateInput
): ValidationResult<{
  name?: string;
  category?: StudioLocationCategory;
  description?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
}> {
  const patch: {
    name?: string;
    category?: StudioLocationCategory;
    description?: string;
    referenceImageUrl?: string;
    referenceStorageKey?: string;
  } = {};

  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) {
      return { ok: false, code: "NAME_REQUIRED", message: "Name is required." };
    }
    if (name.length > STUDIO_LOCATION_NAME_MAX) {
      return { ok: false, code: "NAME_TOO_LONG", message: "Name is too long." };
    }
    patch.name = name;
  }

  if (raw.category !== undefined) {
    if (!isStudioLocationCategory(raw.category)) {
      return { ok: false, code: "INVALID_CATEGORY", message: "Invalid location category." };
    }
    patch.category = raw.category;
  }

  if (raw.description !== undefined) {
    patch.description = trimText(raw.description, STUDIO_LOCATION_TEXT_MAX);
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
