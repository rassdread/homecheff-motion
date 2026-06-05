/** Same-origin download URL; works when CDN/Blob URLs ignore the HTML `download` attribute. */
export function animationProjectDownloadUrl(
  projectId: string,
  options?: {
    segmentOrder?: number;
    languageCode?: string;
    languageExportId?: string;
    renderVersionId?: string;
    variant?: "clean" | "previous_final" | "without_voice" | "voice_audio" | "subtitles_srt";
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
  if (options?.renderVersionId?.trim()) {
    params.set("renderVersionId", options.renderVersionId.trim());
  }
  if (options?.variant === "clean") {
    params.set("variant", "clean");
  }
  if (options?.variant === "previous_final") {
    params.set("variant", "previous_final");
  }
  if (
    options?.variant === "without_voice" ||
    options?.variant === "voice_audio" ||
    options?.variant === "subtitles_srt"
  ) {
    params.set("variant", options.variant);
  }
  const query = params.toString();
  const base = `/api/animations/projects/${encodeURIComponent(projectId)}/download`;
  return query ? `${base}?${query}` : base;
}
