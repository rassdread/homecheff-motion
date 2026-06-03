/**
 * Gallery + wizard project status: map backend values to UI and detect playable completion.
 */

import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type ProjectDisplayStatus =
  | "completed"
  | "generating"
  | "rendering"
  | "failed"
  | "queued";

const COMPLETED_ALIASES = new Set([
  "completed",
  "complete",
  "succeeded",
  "success",
  "done",
]);

const FAILED_ALIASES = new Set([
  "failed",
  "failed_overlay",
  "error",
  "cancelled",
  "canceled",
]);

const GENERATING_ALIASES = new Set(["generating", "processing"]);

const RENDERING_ALIASES = new Set(["rendering", "finalizing", "running"]);

export function normalizeProjectStatusToken(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

export function isCompletedStatusToken(raw: string | null | undefined): boolean {
  return COMPLETED_ALIASES.has(normalizeProjectStatusToken(raw));
}

export function isFailedStatusToken(raw: string | null | undefined): boolean {
  return FAILED_ALIASES.has(normalizeProjectStatusToken(raw));
}

export function isExplicitProjectFailure(
  projectStatus: string,
  exportStatus?: string | null
): boolean {
  return isFailedStatusToken(projectStatus) || isFailedStatusToken(exportStatus);
}

export function hasPlayableOutputVideoUrl(outputVideoUrl: string | null | undefined): boolean {
  const url = outputVideoUrl?.trim() ?? "";
  if (!url) {
    return false;
  }
  if (url.startsWith("/")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return url.length > 8;
  }
}

export type PlayableCompletionInput = {
  projectStatus: string;
  exportStatus?: string | null;
  outputVideoUrl?: string | null;
};

/** True when a final/output URL exists and neither side is explicitly failed. */
export function isProjectPlayablyComplete(input: PlayableCompletionInput): boolean {
  if (isExplicitProjectFailure(input.projectStatus, input.exportStatus)) {
    return false;
  }
  return hasPlayableOutputVideoUrl(input.outputVideoUrl);
}

export function resolveProjectDisplayStatus(input: PlayableCompletionInput): ProjectDisplayStatus {
  if (isProjectPlayablyComplete(input)) {
    return "completed";
  }
  const project = normalizeProjectStatusToken(input.projectStatus);
  if (FAILED_ALIASES.has(project) || isFailedStatusToken(input.exportStatus)) {
    return "failed";
  }
  if (GENERATING_ALIASES.has(project)) {
    return "generating";
  }
  if (RENDERING_ALIASES.has(project)) {
    return "rendering";
  }
  if (project === "queued") {
    return "queued";
  }
  return "queued";
}

export function isInstantWizardProjectSnapshotComplete(
  snapshot: InstantPremiumStatusResponse | null | undefined
): boolean {
  if (!snapshot) {
    return false;
  }
  if (snapshot.status === "failed") {
    return false;
  }
  const url = snapshot.finalVideoUrl?.trim() ?? "";
  if (!url && !snapshot.downloadable) {
    return false;
  }
  return (
    snapshot.status === "completed" ||
    snapshot.downloadable ||
    hasPlayableOutputVideoUrl(url)
  );
}

export function hasUnfinishedWizardDraftContent(params: {
  imagesCount: number;
  /** Storyboard slots (text persists without images). */
  sceneSlotsCount?: number;
  step: number;
  motionText: string;
  chipsCount: number;
  lockedTextLayersCount: number;
}): boolean {
  return (
    params.imagesCount > 0 ||
    (params.sceneSlotsCount ?? 0) > 0 ||
    params.step > 1 ||
    params.motionText.trim().length > 0 ||
    params.chipsCount > 0 ||
    params.lockedTextLayersCount > 0
  );
}
