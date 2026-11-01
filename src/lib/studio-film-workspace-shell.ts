/**
 * Pure helpers for the compact film workspace shell (V27.53).
 * No DB, no providers, no wallet writes.
 */

import type { StudioWorkspacePosture } from "@/lib/studio-workspace-posture";
import type { ProjectWorkspaceView } from "@/lib/studio-project-workspace";
import {
  canonicalAmountForLowBalanceWarning,
  type CanonicalSpendableBalance,
} from "@/lib/studio-canonical-balance";

export const FILM_ASSISTANT_COLLAPSE_PREF_KEY = "studio-film-assistant-collapsed";

export type FilmWorkspaceReadiness = {
  scenes: number;
  scenesWithStill: number;
  libraryImages: number;
  libraryVideos: number;
  narrationAvailable: boolean;
  timelineAvailable: boolean;
};

export function formatFilmDurationMs(durationMs: number | null | undefined): string | null {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function normalizeFilmAspectRatio(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed;
}

/** Default collapse when the user has not stored a preference. */
export function defaultFilmAssistantCollapsed(posture: StudioWorkspacePosture | null | undefined): boolean {
  return posture !== "full";
}

export function readFilmAssistantCollapsedPreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
  posture: StudioWorkspacePosture | null | undefined,
): boolean {
  const raw = storage?.getItem(FILM_ASSISTANT_COLLAPSE_PREF_KEY);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return defaultFilmAssistantCollapsed(posture);
}

export function writeFilmAssistantCollapsedPreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  collapsed: boolean,
): void {
  storage?.setItem(FILM_ASSISTANT_COLLAPSE_PREF_KEY, collapsed ? "1" : "0");
}

/**
 * Readiness metrics from existing workspace fields only.
 * Does not invent scene-video completion (placeholders are not videos).
 */
export function buildFilmWorkspaceReadiness(workspace: ProjectWorkspaceView): FilmWorkspaceReadiness {
  return {
    scenes: workspace.scenes.length,
    scenesWithStill: workspace.scenes.filter((scene) => Boolean(scene.imageUrl?.trim())).length,
    libraryImages: workspace.media.filter((item) => item.family === "image").length,
    libraryVideos: workspace.media.filter((item) => item.family === "video").length,
    narrationAvailable: workspace.voiceover.length > 0,
    timelineAvailable: workspace.film.timelineAvailable,
  };
}

/** Shared numeric HC for banner + workspace surfaces; null = do not warn / do not invent zero. */
export function resolveSharedHcDisplayAmount(
  balance: CanonicalSpendableBalance,
  options?: { loading?: boolean; resolved?: boolean },
): number | null {
  if (options?.loading) return null;
  if (options?.resolved === false) return null;
  return canonicalAmountForLowBalanceWarning(balance);
}
