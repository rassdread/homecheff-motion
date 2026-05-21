/** Same-origin download URL; works when CDN/Blob URLs ignore the HTML `download` attribute. */
export function animationProjectDownloadUrl(
  projectId: string,
  options?: { segmentOrder?: number; languageCode?: string }
): string {
  const params = new URLSearchParams();
  if (options?.segmentOrder !== undefined) {
    params.set("segment", String(options.segmentOrder));
  }
  if (options?.languageCode?.trim()) {
    params.set("lang", options.languageCode.trim());
  }
  const query = params.toString();
  const base = `/api/animations/projects/${encodeURIComponent(projectId)}/download`;
  return query ? `${base}?${query}` : base;
}
