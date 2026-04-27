/** Whether the latest export row can still be cancelled (worker not finished). */
export function exportRecordIsCancellable(ex: { status: string } | null | undefined): boolean {
  if (!ex) {
    return false;
  }
  const s = ex.status.toLowerCase();
  return s === "idle" || s === "queued" || s === "rendering" || s === "processing";
}
