/**
 * S.7E — Map subtitle/translation studios into AudioSpecification (Matrix-ready).
 */

import {
  emptyAudioSpecification,
  type AudioSpecification,
} from "@/lib/studio-audio-specification";
import type { StudioSubtitleStudioContract } from "@/lib/studio-subtitle-studio";
import type { StudioTranslationStudioContract } from "@/lib/studio-translation-studio";

export function audioSpecificationFromSubtitleStudio(
  studio: StudioSubtitleStudioContract
): AudioSpecification {
  const track = studio.tracks[0];
  const spec = emptyAudioSpecification("SUBTITLE_TRANSCRIBE", "SUBTITLES");
  spec.language = track?.language ?? null;
  spec.subtitleIntent = {
    language: track?.language ?? null,
    burnIn: studio.visibility.burnInMode === "burn_in",
  };
  return spec;
}

export function audioSpecificationFromTranslationStudio(
  studio: StudioTranslationStudioContract
): AudioSpecification {
  const spec = emptyAudioSpecification("TRANSLATE_EXPORT", "TRANSLATION");
  spec.language = studio.sourceLanguage;
  spec.translationIntent = {
    mode: "overlay_export",
    targetLanguage: studio.targetLanguage,
  };
  return spec;
}
