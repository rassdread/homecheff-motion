/** Bounded fetch for editor segmentation I/O (image / mask URLs). */

export const EDITOR_SEGMENT_IMAGE_FETCH_TIMEOUT_MS = 8_000;
export const EDITOR_SEGMENT_MASK_FETCH_TIMEOUT_MS = 8_000;

export async function fetchWithEditorSegmentTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
