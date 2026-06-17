/**
 * Explicit registry of actions that never incur external provider cost or wallet debits.
 */

export const FREE_STUDIO_ACTIONS = [
  "assistant_execute_plan",
  "assistant_execute_step",
  "consistency_analysis",
  "correction_preview",
  "crud_read",
  "crud_write",
  "upload",
  "browse",
  "voice_preview_cache_hit",
] as const;

export type FreeStudioAction = (typeof FREE_STUDIO_ACTIONS)[number];

const FREE_ACTION_SET: ReadonlySet<string> = new Set(FREE_STUDIO_ACTIONS);

export function isFreeStudioAction(action: string): boolean {
  return FREE_ACTION_SET.has(action);
}

/** Route patterns that are free by design (no wallet gate required). */
export const FREE_API_ROUTE_PATTERNS = [
  "/api/assistant/execute/",
  "/api/studio/storyboards/*/analyze-consistency",
  "/api/studio/storyboards/*/generate-corrections",
  "/api/studio/storyboards/*/scenes",
  "/api/studio/storyboards/*/workspace-state",
  "/api/auth/",
  "/api/me/account",
  "/api/me/studio-account",
] as const;

export function describeFreeAction(action: FreeStudioAction): string {
  switch (action) {
    case "assistant_execute_plan":
    case "assistant_execute_step":
      return "Assistant navigation only — no provider calls.";
    case "consistency_analysis":
      return "Local heuristic scoring — no LLM.";
    case "correction_preview":
      return "Local bundle assembly — no provider.";
    case "voice_preview_cache_hit":
      return "Served from cache — no provider call.";
    default:
      return "No external provider cost.";
  }
}
