/**
 * S.7C — Thin workspace adapter: expose Character Voice Studio without UI redesign.
 */

import { buildCharacterVoiceStudio } from "@/lib/studio-character-voice-studio";
import { buildStoryboardDialoguePlan } from "@/lib/studio-dialogue-system";
import { buildStoryboardVoiceCastingPlan } from "@/lib/studio-voice-casting";
import { recommendVoicePerformance } from "@/lib/studio-voice-performance-guidance";
import { normalizeStudioVoiceStyle } from "@/lib/studio-voice-style";
import { listStudioVoiceExperiencePacks } from "@/lib/studio-voice-experience-packs";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

/** First-class voice entity payload for existing Workspace panels. */
export function buildWorkspaceVoiceEntity(input: {
  character?: StudioCharacterListItem | null;
  storyboard?: StudioStoryboardDetail | null;
  language?: string | null;
}) {
  const voiceStudio = input.character
    ? buildCharacterVoiceStudio(input.character, input.language)
    : null;
  const casting = input.storyboard
    ? buildStoryboardVoiceCastingPlan(input.storyboard, input.language)
    : null;
  const dialogue = input.storyboard
    ? buildStoryboardDialoguePlan(input.storyboard, { language: input.language })
    : null;
  const style = input.storyboard
    ? normalizeStudioVoiceStyle(input.storyboard.voiceStyle, "presentation")
    : null;
  const performance = recommendVoicePerformance({
    style,
    conversationMode: dialogue?.conversationMode ?? null,
  });

  return {
    version: "7c.1" as const,
    voiceStudio,
    casting,
    dialogue,
    performance,
    experiencePacks: listStudioVoiceExperiencePacks(),
    /** Existing panels remain; this is additive metadata */
    redesignsWorkspace: false as const,
  };
}
