/** Terminal states for Instant Premium merge/overlay (no secrets). */
export function isOverlayFailureStatus(
  projectStatus: string,
  exportStatus?: string | null
): boolean {
  return projectStatus === "failed_overlay" || exportStatus === "failed_overlay";
}

export function isInstantPremiumExportCompleted(
  projectStatus: string,
  exportStatus?: string | null
): boolean {
  return projectStatus === "completed" && exportStatus === "completed";
}
