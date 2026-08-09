import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import { resolveVoiceIdentity } from "@/lib/studio-audio-voice-resolver";
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
  const storyboardOverride = options.storyboard.voiceProfile?.trim() || null;

  const characterResolvedVoices: MotionCharacterResolvedVoiceHandoff[] = characters.map(
    (character) => {
      // Canonical S.7B precedence: locked Character voice cannot be silently replaced.
      const resolved = resolveVoiceIdentity({
        role: "character",
        character,
        language: storyLang,
        storyboardVoiceProfile: storyboardOverride,
        storyboardVoiceLanguage: storyLang,
      });
      const identity = resolveCharacterVoiceIdentity({
        character,
        language: storyLang,
        attemptedOverrideProfile: storyboardOverride,
      });
      return {
        characterId: character.id,
        characterName: character.name,
        voiceProfile: resolved.voiceProfile,
        voiceLanguage: String(resolved.language),
        displayLabel: identity.displayLabel,
        voiceLock: resolved.voiceLock,
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
