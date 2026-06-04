import {
  STUDIO_CONSISTENCY_STATUSES,
  type StudioConsistencyStatus,
} from "@/types/studio-consistency";

export function scoreToConsistencyStatus(score: number): StudioConsistencyStatus {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 55) {
    return "needs_review";
  }
  return "poor";
}

export function isStudioConsistencyStatus(value: string): value is StudioConsistencyStatus {
  return (STUDIO_CONSISTENCY_STATUSES as readonly string[]).includes(value);
}

export function normalizeStudioConsistencyStatus(
  value: string | null | undefined
): StudioConsistencyStatus | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioConsistencyStatus(trimmed) ? trimmed : null;
}
