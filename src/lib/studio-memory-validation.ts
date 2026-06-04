import {
  isStudioContinuityStrength,
  normalizeStudioContinuityStrength,
  type StudioContinuityStrength,
} from "@/lib/studio-continuity-strength";

export const STUDIO_MEMORY_TEXT_MAX = 4000;
export const STUDIO_MEMORY_KEYWORDS_MAX = 500;

export const STUDIO_IDENTITY_STRENGTHS = ["low", "normal", "strong", "strict"] as const;
export type StudioIdentityStrength = (typeof STUDIO_IDENTITY_STRENGTHS)[number];

export function isStudioIdentityStrength(value: string): value is StudioIdentityStrength {
  return (STUDIO_IDENTITY_STRENGTHS as readonly string[]).includes(value);
}

export function normalizeStudioIdentityStrength(
  value: string | undefined | null
): StudioIdentityStrength {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioIdentityStrength(trimmed) ? trimmed : "strong";
}

export function trimMemoryText(value: string | undefined, max = STUDIO_MEMORY_TEXT_MAX): string {
  return (value ?? "").trim().slice(0, max);
}

export function trimMemoryKeywords(value: string | undefined): string {
  return (value ?? "").trim().slice(0, STUDIO_MEMORY_KEYWORDS_MAX);
}

export function parseContinuityStrengthField(
  value: string | undefined
): StudioContinuityStrength | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }
  return isStudioContinuityStrength(trimmed)
    ? trimmed
    : normalizeStudioContinuityStrength(trimmed);
}

export function parseIdentityStrengthField(
  value: string | undefined
): StudioIdentityStrength | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }
  return isStudioIdentityStrength(trimmed) ? trimmed : normalizeStudioIdentityStrength(trimmed);
}

export function parseOptionalWorldProfileId(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalReferenceId(
  value: string | null | undefined
): string | null | undefined {
  return parseOptionalWorldProfileId(value);
}
