/**
 * S.7E — Thin workspace adapter for Subtitle & Translation Studios (no redesign).
 */

import { buildSubtitleStudio } from "@/lib/studio-subtitle-studio";
import { buildTranslationStudio } from "@/lib/studio-translation-studio";
import { buildLanguageIdentity } from "@/lib/studio-language-identity";
import { buildLocalizationPlan } from "@/lib/studio-localization";
import {
  recommendSubtitleDirection,
  recommendTranslationDirection,
} from "@/lib/studio-subtitle-translation-direction";
import { listStudioSubtitleExperiencePacks } from "@/lib/studio-subtitle-experience-packs";
import { listStudioTranslationExperiencePacks } from "@/lib/studio-translation-experience-packs";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export function buildWorkspaceSubtitleTranslateEntity(input: {
  storyboardId: string;
  voiceLanguage?: string | null;
  subtitleTracks?: Array<{
    language: string;
    status?: string | null;
    entries?: SubtitleTrackEntry[] | null;
  }>;
  targetLanguage?: string | null;
  translationQuality?: string | null;
  burnInMode?: "off" | "burn_in" | "metadata_only" | null;
  subtitleStyle?: string | null;
}) {
  const subtitleStudio = buildSubtitleStudio({
    storyboardId: input.storyboardId,
    tracks: input.subtitleTracks ?? [
      { language: input.voiceLanguage ?? "en", status: "draft", entries: [] },
    ],
    style: input.subtitleStyle,
    burnInMode: input.burnInMode,
  });
  const translationStudio = buildTranslationStudio({
    sourceLanguage: input.voiceLanguage,
    targetLanguage: input.targetLanguage,
    quality: input.translationQuality,
  });
  const languageIdentity = buildLanguageIdentity({
    voiceLanguage: input.voiceLanguage,
    subtitleLanguage: subtitleStudio.tracks[0]?.language,
    exportLanguages: input.targetLanguage ? [input.targetLanguage] : [],
  });
  const localization = buildLocalizationPlan({
    sourceLanguage: languageIdentity.primaryLanguage,
    targetLanguage: input.targetLanguage,
  });

  return {
    version: "7e.1" as const,
    subtitleStudio,
    translationStudio,
    languageIdentity,
    localization,
    subtitleDirection: recommendSubtitleDirection({
      style: subtitleStudio.style,
      accessibility: subtitleStudio.style === "accessibility",
    }),
    translationDirection: recommendTranslationDirection({
      quality: translationStudio.quality,
    }),
    subtitlePacks: listStudioSubtitleExperiencePacks(),
    translationPacks: listStudioTranslationExperiencePacks(),
    redesignsWorkspace: false as const,
  };
}
