/** Same-origin download URL; works when CDN/Blob URLs ignore the HTML `download` attribute. */
export function animationProjectDownloadUrl(
  projectId: string,
  options?: {
    segmentOrder?: number;
    languageCode?: string;
    languageExportId?: string;
    variant?: "clean" | "previous_final";
  }
): string {
  const params = new URLSearchParams();
  if (options?.segmentOrder !== undefined) {
    params.set("segment", String(options.segmentOrder));
  }
  if (options?.languageCode?.trim()) {
    params.set("lang", options.languageCode.trim());
  }
  if (options?.languageExportId?.trim()) {
    params.set("exportId", options.languageExportId.trim());
  }
  if (options?.variant === "clean") {
    params.set("variant", "clean");
  }
  if (options?.variant === "previous_final") {
    params.set("variant", "previous_final");
  }
  const query = params.toString();
  const base = `/api/animations/projects/${encodeURIComponent(projectId)}/download`;
  return query ? `${base}?${query}` : base;
}
