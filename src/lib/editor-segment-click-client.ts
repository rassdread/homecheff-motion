/** Client POST to segment/click with explicit timeout (avoids hanging UI). */

export const EDITOR_SEGMENT_CLICK_CLIENT_TIMEOUT_MS = 28_000;

export async function postEditorSegmentClick(
  body: Record<string, unknown>
): Promise<{ response: Response; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EDITOR_SEGMENT_CLICK_CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/editor/segment/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { response, timedOut: false };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        response: new Response(
          JSON.stringify({
            code: "replicate_timeout",
            error: "Segmentation timed out on client.",
          }),
          { status: 504, headers: { "Content-Type": "application/json" } }
        ),
        timedOut: true,
      };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
