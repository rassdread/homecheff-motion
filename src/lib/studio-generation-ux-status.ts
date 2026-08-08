/**
 * Map existing Studio generation statuses to a coherent UX lifecycle (S.3).
 * Does not invent backend enums — only normalizes known strings.
 */

export const STUDIO_GENERATION_UX_STATES = [
  "ready",
  "queued",
  "generating",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type StudioGenerationUxState = (typeof STUDIO_GENERATION_UX_STATES)[number];

export function normalizeStudioGenerationUxStatus(
  status: string | null | undefined,
  opts?: { busy?: boolean }
): StudioGenerationUxState {
  if (opts?.busy) {
    return "generating";
  }
  const raw = (status ?? "").trim().toLowerCase();
  switch (raw) {
    case "":
    case "idle":
    case "ready":
    case "draft":
      return "ready";
    case "queued":
    case "pending":
    case "waiting":
      return "queued";
    case "generating":
    case "running":
    case "in_progress":
    case "in-progress":
      return "generating";
    case "processing":
    case "post_processing":
    case "post-processing":
      return "processing";
    case "completed":
    case "complete":
    case "succeeded":
    case "success":
    case "ready_for_use":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "ready";
  }
}

export function studioGenerationAllowsContinueEditing(state: StudioGenerationUxState): boolean {
  return state === "queued" || state === "generating" || state === "processing" || state === "ready";
}
