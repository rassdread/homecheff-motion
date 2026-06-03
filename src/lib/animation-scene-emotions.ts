/**
 * Vidu multi-image scene emotions — per-shot acting direction (HomeCheff storyboard guide).
 */

import type { InstantMode } from "@/lib/instant-premium-mode-types";

export const ANIMATION_SCENE_EMOTION_IDS = [
  "enthusiastic",
  "surprised",
  "proud",
  "motivated",
  "cheerful",
  "inviting",
  "collaborating",
  "celebration",
] as const;

export type AnimationSceneEmotionId = (typeof ANIMATION_SCENE_EMOTION_IDS)[number];

/** @deprecated Legacy single field — use emotionMode + emotion/autoEmotion. */
export type AnimationSceneEmotionSelection = AnimationSceneEmotionId | "auto";

export type SceneEmotionMode = "auto" | "manual";

export const DEFAULT_SCENE_EMOTION_MODE: SceneEmotionMode = "auto";

export type SceneEmotionTextSignals = {
  heroText?: string;
  title?: string;
  subtitle?: string;
  heroFinaleText?: string;
  finaleFooter?: string;
  extraLines?: string[];
  lines?: string[];
};

export type SceneStoryPosition = "first" | "early" | "middle" | "penultimate" | "final";

export type RecommendSceneEmotionInput = SceneEmotionTextSignals & {
  sceneIndex: number;
  sceneCount: number;
  instantMode?: InstantMode;
};

export type SceneEmotionFields = {
  emotionMode: SceneEmotionMode;
  emotion?: AnimationSceneEmotionId;
  autoEmotion?: AnimationSceneEmotionId;
};

export type AnimationSceneEmotionConfig = {
  id: AnimationSceneEmotionId;
  labelKey: string;
  descriptionKey: string;
  actingLine: string;
};

export const ANIMATION_SCENE_EMOTIONS: Record<
  AnimationSceneEmotionId,
  AnimationSceneEmotionConfig
> = {
  enthusiastic: {
    id: "enthusiastic",
    labelKey: "instant.storyboard.emotion.enthusiastic",
    descriptionKey: "instant.storyboard.emotion.enthusiasticHint",
    actingLine:
      "Enthusiastic: broad smile, open eyes, raised eyebrows, open arms, energetic talking.",
  },
  surprised: {
    id: "surprised",
    labelKey: "instant.storyboard.emotion.surprised",
    descriptionKey: "instant.storyboard.emotion.surprisedHint",
    actingLine:
      "Surprised: wide eyes, open mouth, raised eyebrows, hands lifted in reaction.",
  },
  proud: {
    id: "proud",
    labelKey: "instant.storyboard.emotion.proud",
    descriptionKey: "instant.storyboard.emotion.proudHint",
    actingLine:
      "Proud: confident smile, chin up, chest out, thumbs up or celebratory fist.",
  },
  motivated: {
    id: "motivated",
    labelKey: "instant.storyboard.emotion.motivated",
    descriptionKey: "instant.storyboard.emotion.motivatedHint",
    actingLine:
      "Motivated: determined look, leaning forward, speaking with conviction, purposeful gestures.",
  },
  cheerful: {
    id: "cheerful",
    labelKey: "instant.storyboard.emotion.cheerful",
    descriptionKey: "instant.storyboard.emotion.cheerfulHint",
    actingLine:
      "Cheerful: laughing, big smile, crinkled eyes, head tilted with warmth.",
  },
  inviting: {
    id: "inviting",
    labelKey: "instant.storyboard.emotion.inviting",
    descriptionKey: "instant.storyboard.emotion.invitingHint",
    actingLine:
      "Inviting: hand extended, nodding, warm smile, direct eye contact with camera.",
  },
  collaborating: {
    id: "collaborating",
    labelKey: "instant.storyboard.emotion.collaborating",
    descriptionKey: "instant.storyboard.emotion.collaboratingHint",
    actingLine:
      "Collaborating: high five, hands together, looking at each other, shared laughter.",
  },
  celebration: {
    id: "celebration",
    labelKey: "instant.storyboard.emotion.celebration",
    descriptionKey: "instant.storyboard.emotion.celebrationHint",
    actingLine:
      "Celebration: cheering, arms raised, laughing, energetic movement and joy.",
  },
};

const EMOTION_KEYWORD_RULES: {
  emotion: AnimationSceneEmotionId;
  keywords: string[];
}[] = [
  {
    emotion: "enthusiastic",
    keywords: ["first", "start", "begin", "idea", "seed"],
  },
  {
    emotion: "surprised",
    keywords: ["discover", "what if", "new", "unlock"],
  },
  {
    emotion: "motivated",
    keywords: ["build", "grow", "create", "move", "future"],
  },
  {
    emotion: "proud",
    keywords: ["proof", "result", "success", "built"],
  },
  {
    emotion: "collaborating",
    keywords: ["together", "community", "people", "local", "connect"],
  },
  {
    emotion: "inviting",
    keywords: ["join", "start now", "share", "invite"],
  },
  {
    emotion: "celebration",
    keywords: ["movement", "celebrate", "powered by", "finale"],
  },
];

export const VIDU_MULTI_IMAGE_EMOTION_DIRECTOR_BLOCK = `VIDU MULTI-IMAGE DIRECTING (all scenes):
- Keep the same face, hair, clothing, mascot identity, and style in every shot.
- Use active, believable facial expressions and body language that match each scene emotion.
- Characters look at, talk to, and react to each other; motion stays logical shot to shot.
- Place overlay copy in empty sky/wall/background only — never over faces, hands, logos, or mascots.
- High optimistic energy; no static lifeless expressions; no illogical pose jumps between shots.`;

export function isAnimationSceneEmotionId(value: string): value is AnimationSceneEmotionId {
  return (ANIMATION_SCENE_EMOTION_IDS as readonly string[]).includes(value);
}

export function normalizeSceneEmotionMode(value: unknown): SceneEmotionMode {
  if (value === "manual" || value === "auto") {
    return value;
  }
  return DEFAULT_SCENE_EMOTION_MODE;
}

export function normalizeAnimationSceneEmotionId(
  value: unknown
): AnimationSceneEmotionId | undefined {
  if (typeof value === "string" && isAnimationSceneEmotionId(value.trim())) {
    return value.trim() as AnimationSceneEmotionId;
  }
  return undefined;
}

export function normalizeSceneEmotionFields(raw: {
  emotionMode?: unknown;
  emotion?: unknown;
  autoEmotion?: unknown;
}): SceneEmotionFields {
  const legacyEmotion =
    typeof raw.emotion === "string" ? raw.emotion.trim() : undefined;
  const explicitMode =
    raw.emotionMode === "manual" || raw.emotionMode === "auto"
      ? raw.emotionMode
      : undefined;
  const manualEmotion = normalizeAnimationSceneEmotionId(raw.emotion);
  const storedAuto = normalizeAnimationSceneEmotionId(raw.autoEmotion);

  if (explicitMode) {
    return {
      emotionMode: explicitMode,
      emotion: explicitMode === "manual" ? manualEmotion : undefined,
      autoEmotion: explicitMode === "auto" ? storedAuto : undefined,
    };
  }

  if (legacyEmotion && legacyEmotion !== "auto" && isAnimationSceneEmotionId(legacyEmotion)) {
    return {
      emotionMode: "manual",
      emotion: legacyEmotion,
    };
  }

  return {
    emotionMode: "auto",
    autoEmotion: storedAuto,
  };
}

export function resolveSceneStoryPosition(
  sceneIndex: number,
  sceneCount: number
): SceneStoryPosition {
  if (sceneCount <= 1 || sceneIndex <= 0) {
    return "first";
  }
  if (sceneIndex >= sceneCount - 1) {
    return "final";
  }
  if (sceneIndex === sceneCount - 2) {
    return "penultimate";
  }
  const earlyBoundary = Math.max(1, Math.ceil(sceneCount * 0.35));
  if (sceneIndex < earlyBoundary) {
    return "early";
  }
  return "middle";
}

export function sceneEmotionTextBlob(signals: SceneEmotionTextSignals): string {
  return [
    signals.heroText,
    signals.title,
    signals.subtitle,
    signals.heroFinaleText,
    signals.finaleFooter,
    ...(signals.extraLines ?? []),
    ...(signals.lines ?? []),
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .toLowerCase();
}

function defaultEmotionForPosition(position: SceneStoryPosition): AnimationSceneEmotionId {
  switch (position) {
    case "first":
      return "enthusiastic";
    case "early":
      return "surprised";
    case "middle":
      return "motivated";
    case "penultimate":
      return "inviting";
    case "final":
      return "celebration";
  }
}

function scoreKeywordEmotions(blob: string): Partial<Record<AnimationSceneEmotionId, number>> {
  const scores: Partial<Record<AnimationSceneEmotionId, number>> = {};
  for (const rule of EMOTION_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (blob.includes(keyword.toLowerCase())) {
        scores[rule.emotion] = (scores[rule.emotion] ?? 0) + 1;
      }
    }
  }
  return scores;
}

export function recommendSceneEmotion(input: RecommendSceneEmotionInput): AnimationSceneEmotionId {
  const position = resolveSceneStoryPosition(input.sceneIndex, input.sceneCount);
  const positionDefault = defaultEmotionForPosition(position);
  const blob = sceneEmotionTextBlob(input);

  if (!blob.trim()) {
    return positionDefault;
  }

  const scores = scoreKeywordEmotions(blob);
  let bestEmotion: AnimationSceneEmotionId | null = null;
  let bestScore = 0;

  for (const emotion of ANIMATION_SCENE_EMOTION_IDS) {
    const score = scores[emotion] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  }

  if (bestEmotion && bestScore > 0) {
    return bestEmotion;
  }

  return positionDefault;
}

export function resolveSceneEmotionId(params: {
  emotionMode?: SceneEmotionMode;
  emotion?: AnimationSceneEmotionId;
  autoEmotion?: AnimationSceneEmotionId;
  sceneIndex: number;
  sceneCount: number;
  textSignals?: SceneEmotionTextSignals;
  instantMode?: InstantMode;
  legacyEmotion?: AnimationSceneEmotionSelection;
}): AnimationSceneEmotionId {
  const normalized = normalizeSceneEmotionFields({
    emotionMode: params.emotionMode,
    emotion: params.emotion ?? params.legacyEmotion,
    autoEmotion: params.autoEmotion,
  });

  if (normalized.emotionMode === "manual" && normalized.emotion) {
    return normalized.emotion;
  }

  return recommendSceneEmotion({
    sceneIndex: params.sceneIndex,
    sceneCount: params.sceneCount,
    instantMode: params.instantMode,
    ...(params.textSignals ?? {}),
  });
}

export function withAutoSceneEmotionPatch<
  T extends SceneEmotionTextSignals & SceneEmotionFields,
>(scene: T, sceneIndex: number, sceneCount: number, instantMode?: InstantMode): T {
  if (scene.emotionMode === "manual") {
    return scene;
  }
  return {
    ...scene,
    emotionMode: "auto",
    autoEmotion: recommendSceneEmotion({
      ...scene,
      sceneIndex,
      sceneCount,
      instantMode,
    }),
  };
}

export function buildSceneEmotionPromptLine(emotionId: AnimationSceneEmotionId): string {
  return ANIMATION_SCENE_EMOTIONS[emotionId]?.actingLine ?? "";
}

export const SCENE_ACTING_INTENSITIES = ["subtle", "normal", "active", "very_active"] as const;

export type SceneActingIntensity = (typeof SCENE_ACTING_INTENSITIES)[number];

export const DEFAULT_STORY_ACTING_INTENSITY: SceneActingIntensity = "active";

const ACTING_INTENSITY_SUFFIX: Record<SceneActingIntensity, string> = {
  subtle: "Keep motion restrained; readable but soft expression.",
  normal: "Natural expressive acting; clear on mobile screens.",
  active:
    "Visible smile, open eyes, expressive eyebrows, clear gestures — expressions must read clearly on mobile.",
  very_active:
    "Strong visible smile, wide eyes, bold eyebrows, proud posture, celebration energy — maximum readable expression on mobile.",
};

export function normalizeSceneActingIntensity(value: unknown): SceneActingIntensity {
  if (
    value === "subtle" ||
    value === "normal" ||
    value === "active" ||
    value === "very_active"
  ) {
    return value;
  }
  return DEFAULT_STORY_ACTING_INTENSITY;
}

export function resolveStoryActingIntensity(params: {
  sceneActingIntensity?: SceneActingIntensity;
  projectDefault?: SceneActingIntensity;
}): SceneActingIntensity {
  return normalizeSceneActingIntensity(
    params.sceneActingIntensity ?? params.projectDefault ?? DEFAULT_STORY_ACTING_INTENSITY
  );
}

export function shouldUseSubtleMotionOnly(intensity: SceneActingIntensity): boolean {
  return intensity === "subtle";
}

export function buildSceneEmotionPromptLineForScene(params: {
  emotionMode?: SceneEmotionMode;
  emotion?: AnimationSceneEmotionId;
  autoEmotion?: AnimationSceneEmotionId;
  legacyEmotion?: AnimationSceneEmotionSelection;
  sceneIndex: number;
  sceneCount: number;
  textSignals?: SceneEmotionTextSignals;
  instantMode?: InstantMode;
  actingIntensity?: SceneActingIntensity;
}): string {
  const resolved = resolveSceneEmotionId(params);
  const base = buildSceneEmotionPromptLine(resolved);
  const intensity = resolveStoryActingIntensity({ sceneActingIntensity: params.actingIntensity });
  const suffix = ACTING_INTENSITY_SUFFIX[intensity];
  return base ? `${base} ${suffix}` : suffix;
}

export function normalizeAnimationSceneEmotion(
  value: unknown
): AnimationSceneEmotionSelection {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "auto" || trimmed === "") {
      return "auto";
    }
    if (isAnimationSceneEmotionId(trimmed)) {
      return trimmed;
    }
  }
  return "auto";
}
