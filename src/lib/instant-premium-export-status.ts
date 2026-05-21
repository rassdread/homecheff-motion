import { isProjectPlayablyComplete } from "@/lib/project-display-status";

/** Terminal states for Instant Premium merge/overlay (no secrets). */
export function isOverlayFailureStatus(
  projectStatus: string,
  exportStatus?: string | null
): boolean {
  return projectStatus === "failed_overlay" || exportStatus === "failed_overlay";
}

export function isInstantPremiumExportCompleted(
  projectStatus: string,
  exportStatus?: string | null,
  outputVideoUrl?: string | null
): boolean {
  if (projectStatus === "completed" && exportStatus === "completed") {
    return true;
  }
  return isProjectPlayablyComplete({
    projectStatus,
    exportStatus,
    outputVideoUrl,
  });
}
