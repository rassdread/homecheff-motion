/**
 * S.7C — Voice continuity checks (metadata only — no provider I/O).
 */

import { resolveVoiceIdentity } from "@/lib/studio-audio-voice-resolver";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

export type VoiceContinuityHop =
  | "character"
  | "scene"
  | "storyboard"
  | "motion"
  | "render";

export type VoiceContinuityCheckResult = {
  ok: boolean;
  characterId: string;
  expectedProfile: string;
  hops: Array<{ hop: VoiceContinuityHop; voiceProfile: string | null; match: boolean }>;
  driftDetected: boolean;
};

/**
 * Verify locked Character voice is not silently replaced by narrator across planning hops.
 */
export function checkCharacterVoiceContinuity(input: {
  character: StudioCharacterListItem;
  storyboard: StudioStoryboardDetail;
  motionResolvedProfile?: string | null;
  renderResolvedProfile?: string | null;
}): VoiceContinuityCheckResult {
  const base = resolveVoiceIdentity({
    role: "character",
    character: input.character,
    language: input.storyboard.voiceLanguage,
    storyboardVoiceProfile: input.storyboard.voiceProfile,
    storyboardVoiceLanguage: input.storyboard.voiceLanguage,
  });

  const expected = base.voiceProfile;
  const hops: VoiceContinuityCheckResult["hops"] = [
    { hop: "character", voiceProfile: expected, match: true },
    {
      hop: "storyboard",
      voiceProfile: base.voiceProfile,
      match: !base.overrideBlocked || base.voiceProfile === expected,
    },
  ];

  if (input.motionResolvedProfile != null) {
    hops.push({
      hop: "motion",
      voiceProfile: input.motionResolvedProfile,
      match: input.motionResolvedProfile === expected,
    });
  }
  if (input.renderResolvedProfile != null) {
    hops.push({
      hop: "render",
      voiceProfile: input.renderResolvedProfile,
      match: input.renderResolvedProfile === expected,
    });
  }

  const driftDetected = hops.some((h) => !h.match);
  return {
    ok: !driftDetected,
    characterId: input.character.id,
    expectedProfile: expected,
    hops,
    driftDetected,
  };
}
