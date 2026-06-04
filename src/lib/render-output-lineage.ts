/**
 * Align clean/final playback URLs with the latest segment clips and render versions.
 */

import { isFullRerenderInProgress } from "@/lib/full-rerender-audit";
import { isOverlayFailureStatus } from "@/lib/instant-premium-export-status";
import { hasPlayableOutputVideoUrl } from "@/lib/project-display-status";
import { urlsReferToSameAsset } from "@/lib/playback-url-resolution";
import type { RenderSegmentSnapshotEntry } from "@/lib/render-version-snapshots";

export type RenderVersionDisplayRow = {
  renderVersionNumber: number;
  status: string;
  isDefault: boolean;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
};

export type ProjectVideoDisplayState = {
  primaryFinalUrl: string | null;
  finalIsArchivedFallback: boolean;
  cleanUrl: string | null;
  cleanIsStale: boolean;
  cleanIsLatestBareOnly: boolean;
};

type TransitionClipRow = {
  order: number;
  id: string;
  status: string;
  outputVideoUrl: string | null;
};

/** Parse `final-vN.mp4` / `clean-vN.mp4` (N=0 for unversioned `final.mp4` / `clean.mp4`). */
export function parseMotionBlobVersionFromUrl(url: string | null | undefined): number | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const pathname = new URL(trimmed).pathname;
    const versioned = pathname.match(/\/(?:final|clean)-v(\d+)\.mp4$/i);
    if (versioned?.[1]) {
      const n = Number.parseInt(versioned[1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (/\/(?:final|clean)\.mp4$/i.test(pathname)) {
      return 0;
    }
  } catch {
    const versioned = trimmed.match(/\/(?:final|clean)-v(\d+)\.mp4/i);
    if (versioned?.[1]) {
      const n = Number.parseInt(versioned[1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (/\/(?:final|clean)\.mp4/i.test(trimmed)) {
      return 0;
    }
  }
  return null;
}

export function renderSegmentSnapshotMatchesTransitions(
  snapshot: RenderSegmentSnapshotEntry[] | null | undefined,
  transitions: TransitionClipRow[]
): boolean {
  if (!snapshot?.length || snapshot.length !== transitions.length) {
    return false;
  }
  const sorted = [...transitions].sort((a, b) => a.order - b.order);
  return snapshot.every((entry, index) => {
    const row = sorted[index];
    if (!row) {
      return false;
    }
    return (
      entry.order === row.order &&
      entry.transitionId === row.id &&
      entry.status === row.status &&
      (entry.outputVideoUrl?.trim() ?? null) === (row.outputVideoUrl?.trim() ?? null)
    );
  });
}

export function isCleanUrlAlignedWithRenderVersion(
  cleanUrl: string | null | undefined,
  renderVersionNumber: number
): boolean {
  const version = parseMotionBlobVersionFromUrl(cleanUrl);
  if (version === null) {
    return renderVersionNumber <= 1;
  }
  return version === renderVersionNumber;
}

export type RepairOutputAlignmentInput = {
  projectStatus: string;
  exportStatus: string | null;
  exportOutputUrl: string | null;
  previousFinalVideoUrl: string | null;
  projectCleanUrl: string | null;
  transitions: TransitionClipRow[];
  pendingRenderVersionNumber: number | null;
  pendingSegmentSnapshot: RenderSegmentSnapshotEntry[] | null;
  auditJson: unknown;
};

export type RepairOutputAlignment = {
  aligned: boolean;
  reason?: string;
};

/** Repair must not succeed when export still points at a previous fallback or clips diverged. */
export function assessRepairOutputAlignment(input: RepairOutputAlignmentInput): RepairOutputAlignment {
  const exportUrl = input.exportOutputUrl?.trim() ?? null;
  if (!hasPlayableOutputVideoUrl(exportUrl)) {
    return { aligned: false, reason: "no_playable_export" };
  }

  if (isOverlayFailureStatus(input.projectStatus, input.exportStatus)) {
    return { aligned: false, reason: "overlay_failed" };
  }

  const previous = input.previousFinalVideoUrl?.trim() ?? null;
  if (previous && exportUrl && urlsReferToSameAsset(exportUrl, previous)) {
    if (input.pendingRenderVersionNumber != null || isFullRerenderInProgress(input.auditJson)) {
      return { aligned: false, reason: "export_matches_archived_previous" };
    }
    if (input.exportStatus === "completed" && input.projectStatus === "completed") {
      return { aligned: false, reason: "export_restored_previous_fallback" };
    }
  }

  if (input.pendingRenderVersionNumber != null) {
    const finalVersion = parseMotionBlobVersionFromUrl(exportUrl);
    if (
      finalVersion !== null &&
      finalVersion !== input.pendingRenderVersionNumber
    ) {
      return { aligned: false, reason: "final_blob_version_mismatch" };
    }
    const cleanVersion = parseMotionBlobVersionFromUrl(input.projectCleanUrl);
    if (
      cleanVersion !== null &&
      cleanVersion !== input.pendingRenderVersionNumber
    ) {
      return { aligned: false, reason: "clean_blob_version_mismatch" };
    }
    if (
      input.pendingSegmentSnapshot &&
      !renderSegmentSnapshotMatchesTransitions(input.pendingSegmentSnapshot, input.transitions)
    ) {
      return { aligned: false, reason: "segment_snapshot_mismatch" };
    }
  }

  return { aligned: true };
}

function findDefaultCompletedRenderVersion(
  rows: RenderVersionDisplayRow[] | undefined
): RenderVersionDisplayRow | null {
  if (!rows?.length) {
    return null;
  }
  const completed = rows.filter(
    (row) => row.status === "completed" && Boolean(row.finalVideoUrl?.trim())
  );
  const flagged = completed.find((row) => row.isDefault);
  if (flagged) {
    return flagged;
  }
  return (
    [...completed].sort((a, b) => b.renderVersionNumber - a.renderVersionNumber)[0] ?? null
  );
}

function findPendingRenderVersion(rows: RenderVersionDisplayRow[] | undefined): RenderVersionDisplayRow | null {
  if (!rows?.length) {
    return null;
  }
  return (
    rows.find(
      (row) =>
        row.isDefault &&
        (row.status === "generating" || row.status === "pending" || row.status === "failed")
    ) ??
    rows.find((row) => row.status === "generating") ??
    null
  );
}

export function resolveProjectVideoDisplayState(params: {
  projectCleanUrl: string | null;
  exportOutputUrl: string | null;
  previousFinalVideoUrl: string | null;
  projectStatus: string;
  exportStatus: string | null;
  renderVersions?: RenderVersionDisplayRow[];
  auditJson?: unknown;
  rerenderInProgress?: boolean;
}): ProjectVideoDisplayState {
  const exportUrl = params.exportOutputUrl?.trim() ?? null;
  const previous = params.previousFinalVideoUrl?.trim() ?? null;
  const projectClean = params.projectCleanUrl?.trim() ?? null;
  const overlayFailed = isOverlayFailureStatus(params.projectStatus, params.exportStatus);
  const rerenderRunning =
    Boolean(params.rerenderInProgress) || isFullRerenderInProgress(params.auditJson);
  const pendingRow = findPendingRenderVersion(params.renderVersions);
  const defaultRow = findDefaultCompletedRenderVersion(params.renderVersions);

  const exportMatchesPrevious =
    Boolean(exportUrl && previous && urlsReferToSameAsset(exportUrl, previous));
  const exportMissing = !hasPlayableOutputVideoUrl(exportUrl);

  const finalIsArchivedFallback =
    exportMissing && Boolean(previous) ||
    (exportMatchesPrevious && Boolean(previous)) ||
    overlayFailed;

  const primaryFinalUrl = hasPlayableOutputVideoUrl(exportUrl) && !exportMatchesPrevious
    ? exportUrl
    : previous ?? defaultRow?.finalVideoUrl?.trim() ?? null;

  if (rerenderRunning && !overlayFailed) {
    return {
      primaryFinalUrl,
      finalIsArchivedFallback: Boolean(previous) && exportMissing,
      cleanUrl: null,
      cleanIsStale: Boolean(projectClean),
      cleanIsLatestBareOnly: false,
    };
  }

  const pendingVersion = pendingRow?.renderVersionNumber ?? null;
  const cleanAlignedWithPending =
    pendingVersion != null && isCleanUrlAlignedWithRenderVersion(projectClean, pendingVersion);
  const cleanFromDefault = defaultRow?.cleanVideoUrl?.trim() ?? null;
  const defaultCleanAligned =
    defaultRow != null &&
    isCleanUrlAlignedWithRenderVersion(projectClean, defaultRow.renderVersionNumber);

  const cleanIsLatestBareOnly =
    overlayFailed ||
    (exportMissing && cleanAlignedWithPending) ||
    (finalIsArchivedFallback &&
      Boolean(projectClean) &&
      (cleanAlignedWithPending ||
        (pendingVersion != null && parseMotionBlobVersionFromUrl(projectClean) === pendingVersion)));

  let cleanUrl: string | null = null;
  if (cleanIsLatestBareOnly && projectClean) {
    cleanUrl = projectClean;
  } else if (defaultCleanAligned && projectClean) {
    cleanUrl = projectClean;
  } else if (cleanFromDefault) {
    cleanUrl = cleanFromDefault;
  } else if (!finalIsArchivedFallback && projectClean) {
    cleanUrl = projectClean;
  }

  const cleanIsStale = Boolean(projectClean && !cleanUrl);

  return {
    primaryFinalUrl,
    finalIsArchivedFallback,
    cleanUrl,
    cleanIsStale,
    cleanIsLatestBareOnly: Boolean(cleanUrl && cleanIsLatestBareOnly),
  };
}
