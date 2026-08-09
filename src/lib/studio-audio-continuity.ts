/**
 * S.7B — Build ContinuityAudioContext from storyboard / asset refs (no provider I/O).
 */

import type { ContinuityAudioContext, ContinuityVoiceIdentity } from "@/lib/studio-prompt-matrix/continuity-bundle";
import { resolveVoiceIdentity, toContinuityVoiceIdentity } from "@/lib/studio-audio-voice-resolver";

export function emptyContinuityAudioContext(
  partial?: Partial<ContinuityAudioContext>
): ContinuityAudioContext {
  return {
    narratorVoice: null,
    storyboardLanguage: null,
    projectMusicAssetId: null,
    sfxBedAssetId: null,
    sceneAudioIntent: null,
    brandAudio: {
      voiceAssetId: null,
      musicAssetId: null,
      jingleAssetId: null,
      wired: false,
    },
    ...partial,
  };
}

export function buildContinuityAudioContext(input: {
  storyboardVoiceProfile?: string | null;
  storyboardVoiceProvider?: string | null;
  storyboardVoiceLanguage?: string | null;
  projectMusicAssetId?: string | null;
  sfxBedAssetId?: string | null;
  sceneAudioIntent?: string | null;
}): ContinuityAudioContext {
  const narrator = resolveVoiceIdentity({
    role: "narrator",
    language: input.storyboardVoiceLanguage,
    storyboardVoiceProfile: input.storyboardVoiceProfile,
    storyboardVoiceProvider: input.storyboardVoiceProvider,
    storyboardVoiceLanguage: input.storyboardVoiceLanguage,
  });
  const narratorVoice: ContinuityVoiceIdentity = toContinuityVoiceIdentity(narrator);

  return emptyContinuityAudioContext({
    narratorVoice,
    storyboardLanguage: narrator.language,
    projectMusicAssetId: input.projectMusicAssetId?.trim() || null,
    sfxBedAssetId: input.sfxBedAssetId?.trim() || null,
    sceneAudioIntent: input.sceneAudioIntent?.trim() || null,
  });
}
