/**
 * SERVER_ONLY — attaches audio mix plan to Motion handoff (Blob library read).
 * Do not import from `"use client"` graphs.
 */

import { buildStoryboardAudioMixPlan } from "@/lib/studio-audio-mix-resolve";
import { listUserAudioLibraryAssets } from "@/server/studio/studio-user-audio-library-blob";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export async function attachAudioMixToHandoffPayload(
  payload: MotionHandoffPayload,
  options: {
    storyboard: StudioStoryboardDetail;
    audioAssetMetadataJson?: unknown;
  }
): Promise<MotionHandoffPayload> {
  const userLibrary = await listUserAudioLibraryAssets(options.storyboard.ownerId);
  const mixPlan = buildStoryboardAudioMixPlan({
    storyboard: options.storyboard,
    userLibrary,
    voiceAudioUrl: payload.voiceMetadata?.audioUrl ?? null,
    audioAssetMetadataJson: options.audioAssetMetadataJson ?? options.storyboard.audioAssetLinks,
  });

  return {
    ...payload,
    audioMixPlan: mixPlan,
  };
}
