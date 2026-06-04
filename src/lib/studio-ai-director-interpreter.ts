/**
 * Studio V26 — interpret natural-language director briefs (planning only, no LLM).
 */

import {
  DEFAULT_STUDIO_DIRECTOR_PROFILE,
  type StudioDirectorProfile,
} from "@/lib/studio-director-profiles";
import {
  DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";

export const AI_DIRECTOR_MOOD_KEYWORDS = [
  "inspirational",
  "premium",
  "energetic",
  "emotional",
  "cinematic",
] as const;

export type AiDirectorMoodKeyword = (typeof AI_DIRECTOR_MOOD_KEYWORDS)[number];

export const AI_DIRECTOR_STYLE_STRENGTHS = ["subtle", "balanced", "strong"] as const;

export type AiDirectorStyleStrength = (typeof AI_DIRECTOR_STYLE_STRENGTHS)[number];

export const DEFAULT_AI_DIRECTOR_STYLE_STRENGTH: AiDirectorStyleStrength = "balanced";

export type InterpretedDirectorStyle = {
  directorProfile: StudioDirectorProfile;
  promptStyleProfile: StudioPromptStyleProfile;
  moodKeywords: AiDirectorMoodKeyword[];
  cameraLanguageKey: string;
  movementStyleKey: string;
  energyProfileKey: string;
  pacingKey: string;
  visualRhythmKey: string;
  matchedPresetKey: string | null;
};

type PresetRule = {
  id: string;
  patterns: RegExp[];
  profile: StudioDirectorProfile;
  promptStyleProfile?: StudioPromptStyleProfile;
  moods: AiDirectorMoodKeyword[];
  cameraLanguageKey: string;
  movementStyleKey: string;
  energyProfileKey: string;
  pacingKey: string;
  visualRhythmKey: string;
};

const PRESETS: PresetRule[] = [
  {
    id: "netflix_documentary",
    patterns: [/netflix/i, /documentary/i, /docu/i],
    profile: "documentary",
    promptStyleProfile: "documentary",
    moods: ["cinematic", "emotional"],
    cameraLanguageKey: "studio.aiDirector.language.documentary",
    movementStyleKey: "studio.aiDirector.movement.natural",
    energyProfileKey: "studio.aiDirector.energy.observational",
    pacingKey: "studio.aiDirector.pacing.documentary",
    visualRhythmKey: "studio.aiDirector.rhythm.authentic",
  },
  {
    id: "apple_commercial",
    patterns: [/apple/i, /minimal/i, /product launch/i],
    profile: "commercial",
    promptStyleProfile: "commercial",
    moods: ["premium", "cinematic"],
    cameraLanguageKey: "studio.aiDirector.language.luxury",
    movementStyleKey: "studio.aiDirector.movement.controlled",
    energyProfileKey: "studio.aiDirector.energy.premium",
    pacingKey: "studio.aiDirector.pacing.luxury",
    visualRhythmKey: "studio.aiDirector.rhythm.clean",
  },
  {
    id: "nike_campaign",
    patterns: [/nike/i, /sports/i, /campaign/i, /athletic/i],
    profile: "cinematic",
    moods: ["energetic", "inspirational"],
    cameraLanguageKey: "studio.aiDirector.language.hero",
    movementStyleKey: "studio.aiDirector.movement.dynamic",
    energyProfileKey: "studio.aiDirector.energy.high",
    pacingKey: "studio.aiDirector.pacing.cinematic",
    visualRhythmKey: "studio.aiDirector.rhythm.escalation",
  },
  {
    id: "tiktok_social",
    patterns: [/tiktok/i, /viral/i, /reels/i, /short form/i, /social/i],
    profile: "social_media",
    promptStyleProfile: "social_media",
    moods: ["energetic"],
    cameraLanguageKey: "studio.aiDirector.language.social",
    movementStyleKey: "studio.aiDirector.movement.fast",
    energyProfileKey: "studio.aiDirector.energy.attention",
    pacingKey: "studio.aiDirector.pacing.social",
    visualRhythmKey: "studio.aiDirector.rhythm.punchy",
  },
  {
    id: "founder_story",
    patterns: [/founder/i, /startup/i, /origin story/i, /founding/i],
    profile: "storytelling",
    moods: ["emotional", "inspirational"],
    cameraLanguageKey: "studio.aiDirector.language.intimate",
    movementStyleKey: "studio.aiDirector.movement.emotional",
    energyProfileKey: "studio.aiDirector.energy.narrative",
    pacingKey: "studio.aiDirector.pacing.story",
    visualRhythmKey: "studio.aiDirector.rhythm.journey",
  },
  {
    id: "luxury_launch",
    patterns: [/luxury/i, /premium/i, /brand launch/i, /high end/i],
    profile: "cinematic",
    moods: ["premium", "cinematic"],
    cameraLanguageKey: "studio.aiDirector.language.luxury",
    movementStyleKey: "studio.aiDirector.movement.slow",
    energyProfileKey: "studio.aiDirector.energy.premium",
    pacingKey: "studio.aiDirector.pacing.luxury",
    visualRhythmKey: "studio.aiDirector.rhythm.elegant",
  },
  {
    id: "emotional_story",
    patterns: [/emotional/i, /heartfelt/i, /touching/i, /tear/i],
    profile: "storytelling",
    moods: ["emotional", "cinematic"],
    cameraLanguageKey: "studio.aiDirector.language.intimate",
    movementStyleKey: "studio.aiDirector.movement.emotional",
    energyProfileKey: "studio.aiDirector.energy.warm",
    pacingKey: "studio.aiDirector.pacing.story",
    visualRhythmKey: "studio.aiDirector.rhythm.journey",
  },
];

const MOOD_SIGNALS: Array<{ mood: AiDirectorMoodKeyword; patterns: RegExp[] }> = [
  { mood: "inspirational", patterns: [/inspir/i, /uplift/i, /motivat/i, /hero/i] },
  { mood: "premium", patterns: [/premium/i, /luxury/i, /elegant/i, /apple/i] },
  { mood: "energetic", patterns: [/energetic/i, /dynamic/i, /fast/i, /nike/i, /viral/i] },
  { mood: "emotional", patterns: [/emotional/i, /intimate/i, /founder/i, /human/i] },
  { mood: "cinematic", patterns: [/cinematic/i, /film/i, /movie/i, /drama/i] },
];

export function normalizeAiDirectorStyleStrength(
  value: string | undefined | null
): AiDirectorStyleStrength {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (trimmed === "subtle" || trimmed === "strong") {
    return trimmed;
  }
  return DEFAULT_AI_DIRECTOR_STYLE_STRENGTH;
}

export function isAiDirectorStyleStrength(value: string): value is AiDirectorStyleStrength {
  return (AI_DIRECTOR_STYLE_STRENGTHS as readonly string[]).includes(value);
}

function detectMoods(text: string, presetMoods: AiDirectorMoodKeyword[]): AiDirectorMoodKeyword[] {
  const found = new Set<AiDirectorMoodKeyword>(presetMoods);
  for (const signal of MOOD_SIGNALS) {
    if (signal.patterns.some((p) => p.test(text))) {
      found.add(signal.mood);
    }
  }
  if (found.size === 0) {
    found.add("cinematic");
  }
  return [...found].slice(0, 4);
}

function fallbackInterpretation(text: string): InterpretedDirectorStyle {
  const lower = text.toLowerCase();
  let profile: StudioDirectorProfile = DEFAULT_STUDIO_DIRECTOR_PROFILE;
  if (/documentary|observ/i.test(lower)) {
    profile = "documentary";
  } else if (/social|tiktok|viral|reel/i.test(lower)) {
    profile = "social_media";
  } else if (/story|founder|emotional/i.test(lower)) {
    profile = "storytelling";
  } else if (/cinematic|film|drama|luxury|premium/i.test(lower)) {
    profile = "cinematic";
  } else if (/education|explain|tutorial/i.test(lower)) {
    profile = "educational";
  }

  const moods = detectMoods(lower, []);
  return {
    directorProfile: profile,
    promptStyleProfile: DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
    moodKeywords: moods,
    cameraLanguageKey: "studio.aiDirector.language.balanced",
    movementStyleKey: "studio.aiDirector.movement.balanced",
    energyProfileKey: "studio.aiDirector.energy.balanced",
    pacingKey: "studio.aiDirector.pacing.balanced",
    visualRhythmKey: "studio.aiDirector.rhythm.balanced",
    matchedPresetKey: null,
  };
}

/**
 * Map a user brief to director profile, mood tags, and pacing language keys.
 */
export function interpretAiDirectorPrompt(prompt: string): InterpretedDirectorStyle {
  const text = prompt.trim();
  if (!text) {
    return {
      directorProfile: DEFAULT_STUDIO_DIRECTOR_PROFILE,
      promptStyleProfile: DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
      moodKeywords: ["cinematic"],
      cameraLanguageKey: "studio.aiDirector.language.balanced",
      movementStyleKey: "studio.aiDirector.movement.balanced",
      energyProfileKey: "studio.aiDirector.energy.balanced",
      pacingKey: "studio.aiDirector.pacing.balanced",
      visualRhythmKey: "studio.aiDirector.rhythm.balanced",
      matchedPresetKey: null,
    };
  }

  for (const preset of PRESETS) {
    if (preset.patterns.some((p) => p.test(text))) {
      return {
        directorProfile: preset.profile,
        promptStyleProfile: preset.promptStyleProfile ?? DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
        moodKeywords: detectMoods(text, preset.moods),
        cameraLanguageKey: preset.cameraLanguageKey,
        movementStyleKey: preset.movementStyleKey,
        energyProfileKey: preset.energyProfileKey,
        pacingKey: preset.pacingKey,
        visualRhythmKey: preset.visualRhythmKey,
        matchedPresetKey: `studio.aiDirector.preset.${preset.id}`,
      };
    }
  }

  return fallbackInterpretation(text);
}
