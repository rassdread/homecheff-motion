/**
 * SHARED_PURE — Canonical Studio generation job statuses (S.4).
 * UI maps provider-specific states through adapters into these values.
 */

export const STUDIO_GENERATION_STATUSES = [
  "pending",
  "queued",
  "starting",
  "generating",
  "processing",
  "succeeded",
  "failed",
  "cancel_requested",
  "cancelled",
] as const;

export type StudioGenerationStatus = (typeof STUDIO_GENERATION_STATUSES)[number];

export const STUDIO_GENERATION_TERMINAL_STATUSES: readonly StudioGenerationStatus[] = [
  "succeeded",
  "failed",
  "cancelled",
];

export function isStudioGenerationTerminal(status: string): boolean {
  return (STUDIO_GENERATION_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isStudioGenerationInFlight(status: string): boolean {
  return (
    status === "pending" ||
    status === "queued" ||
    status === "starting" ||
    status === "generating" ||
    status === "processing" ||
    status === "cancel_requested"
  );
}

/** Map legacy StudioJob / scene-image statuses into canonical generation status. */
export function mapLegacyStatusToStudioGeneration(status: string): StudioGenerationStatus {
  switch (status.trim().toLowerCase()) {
    case "queued":
    case "pending":
      return "queued";
    case "running":
    case "generating":
    case "in_progress":
    case "in-progress":
      return "generating";
    case "processing":
    case "post_processing":
      return "processing";
    case "completed":
    case "complete":
    case "succeeded":
    case "success":
      return "succeeded";
    case "failed":
    case "error":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "cancel_requested":
      return "cancel_requested";
    default:
      return "pending";
  }
}
