/**
 * S.7C — Creative Director voice performance guidance (recommend only, never force).
 */

import type { StudioVoiceEmotion } from "@/lib/studio-voice-emotion";
import type { StudioVoiceStyle } from "@/lib/studio-voice-style";
import type { StudioDialogueConversationMode } from "@/lib/studio-dialogue-system";

export type StudioVoicePerformanceGuidance = {
  emotion: StudioVoiceEmotion | null;
  delivery: string | null;
  pace: "slow" | "medium" | "fast" | null;
  energy: "low" | "medium" | "high" | null;
  dramaticLevel: "low" | "medium" | "high" | null;
  toneHints: string[];
  /** Director never forces — UI may ignore */
  forced: false;
};

const STYLE_GUIDANCE: Partial<
  Record<StudioVoiceStyle, Omit<StudioVoicePerformanceGuidance, "forced">>
> = {
  podcast: {
    emotion: "friendly",
    delivery: "conversational",
    pace: "medium",
    energy: "medium",
    dramaticLevel: "low",
    toneHints: ["podcast", "natural"],
  },
  commercial: {
    emotion: "motivational",
    delivery: "clear_and_confident",
    pace: "medium",
    energy: "high",
    dramaticLevel: "medium",
    toneHints: ["commercial", "business"],
  },
  restaurant: {
    emotion: "friendly",
    delivery: "warm_host",
    pace: "medium",
    energy: "medium",
    dramaticLevel: "low",
    toneHints: ["restaurant", "hospitality"],
  },
  homecheff: {
    emotion: "friendly",
    delivery: "home_cook_warm",
    pace: "medium",
    energy: "medium",
    dramaticLevel: "low",
    toneHints: ["homecheff", "culinary"],
  },
  documentary: {
    emotion: "calm",
    delivery: "documentary_narration",
    pace: "slow",
    energy: "low",
    dramaticLevel: "medium",
    toneHints: ["documentary", "cinematic"],
  },
  movie: {
    emotion: "storytelling",
    delivery: "cinematic",
    pace: "medium",
    energy: "medium",
    dramaticLevel: "high",
    toneHints: ["cinematic", "dramatic"],
  },
  training: {
    emotion: "professional",
    delivery: "educational",
    pace: "slow",
    energy: "medium",
    dramaticLevel: "low",
    toneHints: ["educational", "training"],
  },
  presentation: {
    emotion: "professional",
    delivery: "business_clear",
    pace: "medium",
    energy: "medium",
    dramaticLevel: "low",
    toneHints: ["business", "presentation"],
  },
  audiobook: {
    emotion: "storytelling",
    delivery: "narrative",
    pace: "medium",
    energy: "low",
    dramaticLevel: "medium",
    toneHints: ["audiobook", "storytelling"],
  },
};

export function recommendVoicePerformance(input: {
  style?: StudioVoiceStyle | null;
  conversationMode?: StudioDialogueConversationMode | null;
  sceneEmotion?: string | null;
}): StudioVoicePerformanceGuidance {
  const fromStyle = input.style ? STYLE_GUIDANCE[input.style] : null;
  const base = fromStyle ?? {
    emotion: "neutral" as StudioVoiceEmotion,
    delivery: "natural",
    pace: "medium" as const,
    energy: "medium" as const,
    dramaticLevel: "low" as const,
    toneHints: [] as string[],
  };

  if (input.conversationMode === "interview") {
    base.delivery = "interview_turn_taking";
    base.toneHints = [...base.toneHints, "interview"];
  }
  if (input.conversationMode === "podcast") {
    base.toneHints = [...new Set([...base.toneHints, "podcast"])];
  }

  return { ...base, forced: false };
}
