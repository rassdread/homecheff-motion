import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import {
  normalizeVoiceIdentityLanguage,
  resolveCharacterVoiceIdentity,
} from "@/lib/studio-voice-identity-resolver";
import { buildMotionVoiceIdentityHandoffPlan } from "@/lib/studio-voice-identity-director";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionCharacterResolvedVoiceHandoff } from "@/types/studio-voice-identity";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachVoiceIdentityToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const voiceIdentityPlan = buildMotionVoiceIdentityHandoffPlan(options.storyboard);
  const storyLang = normalizeVoiceIdentityLanguage(options.storyboard.voiceLanguage ?? "en");
  const characters = collectStoryboardCharacters(options.storyboard);

  const characterResolvedVoices: MotionCharacterResolvedVoiceHandoff[] = characters.map(
    (character) => {
      const identity = resolveCharacterVoiceIdentity({ character, language: storyLang });
      return {
        characterId: character.id,
        characterName: character.name,
        voiceProfile: identity.voiceProfile,
        voiceLanguage: String(identity.language),
        displayLabel: identity.displayLabel,
        voiceLock: identity.voiceLock,
        presetLabelKey: identity.presetLabelKey,
      };
    }
  );

  const resolvedByChar = new Map(characterResolvedVoices.map((r) => [r.characterId, r]));

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const storyboardScene = options.storyboard.scenes.find((s) => s.id === scene.sceneId);
    const primary = storyboardScene?.characters[0];
    const resolved = primary ? resolvedByChar.get(primary.id) : undefined;
    return {
      ...scene,
      resolvedVoiceProfile: resolved?.voiceProfile ?? scene.resolvedVoiceProfile,
      studioContext: {
        ...scene.studioContext,
        voiceIdentity: resolved?.displayLabel ?? scene.studioContext.voiceIdentity,
      },
    };
  });

  return {
    ...payload,
    voiceIdentityPlan,
    lockedVoiceAssignments: voiceIdentityPlan.lockedVoiceAssignments,
    resolvedVoiceProfiles: voiceIdentityPlan.resolvedVoiceProfiles,
    voiceIdentityWarnings: voiceIdentityPlan.voiceIdentityWarnings,
    characterResolvedVoices,
    scenes,
  };
}
