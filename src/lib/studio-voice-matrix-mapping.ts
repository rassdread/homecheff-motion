/**
 * S.7C — Map dialogue / Voice Studio into AudioSpecification (Matrix-ready).
 * Does not add provider syntax.
 */

import {
  emptyAudioSpecification,
  type AudioSpecification,
} from "@/lib/studio-audio-specification";
import {
  dialogueLineToAudioIntent,
  type StudioDialogueLine,
  type StudioDialoguePlan,
} from "@/lib/studio-dialogue-system";
import type { CharacterVoiceStudioContract } from "@/lib/studio-character-voice-studio";
import type { StudioVoiceStyle } from "@/lib/studio-voice-style";

export function audioSpecificationFromDialogueLine(
  line: StudioDialogueLine,
  style?: StudioVoiceStyle | null
): AudioSpecification {
  const intent = dialogueLineToAudioIntent(line);
  const spec = emptyAudioSpecification(
    "VOICE_TTS",
    intent.characterId ? "CHARACTER_VOICE" : "NARRATION"
  );
  spec.script = intent.script;
  spec.emotion = intent.emotion;
  spec.language = intent.language;
  if (intent.characterId) {
    spec.characterVoice = {
      characterId: intent.characterId,
      voiceProfile: intent.voiceProfile,
      voiceProvider: "elevenlabs",
      language: intent.language,
      locked: intent.locked,
    };
  } else {
    spec.narratorVoice = {
      voiceProfile: intent.voiceProfile,
      voiceProvider: "elevenlabs",
      language: intent.language,
    };
  }
  if (style || line.style) {
    spec.pace = null;
  }
  return spec;
}

export function audioSpecificationsFromDialoguePlan(
  plan: StudioDialoguePlan
): AudioSpecification[] {
  return plan.lines.map((line) =>
    audioSpecificationFromDialogueLine(line, plan.lines[0]?.style ?? null)
  );
}

export function audioSpecificationFromCharacterVoiceStudio(
  studio: CharacterVoiceStudioContract,
  script?: string | null
): AudioSpecification {
  const spec = emptyAudioSpecification("VOICE_TTS", "CHARACTER_VOICE");
  spec.characterVoice = {
    characterId: studio.characterId,
    voiceProfile: studio.identity.voiceProfile,
    voiceProvider: studio.identity.voiceProvider,
    language: String(studio.identity.language),
    locked: studio.identity.voiceLock,
  };
  spec.language = String(studio.identity.language);
  spec.script = script?.trim() || null;
  spec.emotion = studio.characteristics.emotionDefaults;
  return spec;
}
