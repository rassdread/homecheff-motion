/** Extract a stable error code from a Vidu/segment failure message for UI. */
export function parseInstantSegmentErrorCode(errorMessage: string | null | undefined): string | null {
  const raw = errorMessage?.trim();
  if (!raw) {
    return null;
  }
  const prefixed = raw.match(/^([A-Z][A-Z0-9_]+):/);
  if (prefixed?.[1]) {
    return prefixed[1];
  }
  if (raw.includes("VIDU_PROMPT_TOO_LONG")) {
    return "VIDU_PROMPT_TOO_LONG";
  }
  if (raw.toLowerCase().includes("provider")) {
    return "PROVIDER_ERROR";
  }
  return "SEGMENT_RENDER_FAILED";
}
