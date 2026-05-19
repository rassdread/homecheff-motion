import {
  assertVideoRenderingReadyForLockedText,
  FFMPEG_DRAWTEXT_REQUIRED_CODE,
  payloadRequiresLockedTextOverlay,
  VIDEO_TEXT_RENDERING_UNAVAILABLE,
} from "@/lib/video-ffmpeg-capability";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

export type VideoRenderingGuardResult =
  | { ok: true }
  | { ok: false; error: string; status: number; code: string };

export async function guardInstantPremiumVideoRendering(
  payload: InstantPremiumCreatePayload
): Promise<VideoRenderingGuardResult> {
  if (!payloadRequiresLockedTextOverlay(payload)) {
    return { ok: true };
  }
  const check = await assertVideoRenderingReadyForLockedText();
  if (check.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    error: check.error,
    status: 503,
    code: check.code,
  };
}

export { FFMPEG_DRAWTEXT_REQUIRED_CODE, VIDEO_TEXT_RENDERING_UNAVAILABLE };
