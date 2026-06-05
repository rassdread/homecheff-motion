export type InstantPremiumStylePreset = "food_promo" | "clean_business" | "social_boost";

export type InstantPremiumAspectRatio = "9:16" | "16:9";

export type InstantPremiumDurationSeconds = number;
export type InstantPremiumContinuityStrength = "balanced" | "strict";

/** Stable ids sent from client / stored in DB */
import { BAKED_TEXT_CLEANED_PROMPT_BLOCK } from "@/lib/baked-text-protection";
import {
  DEEVID_CRITICAL_TYPOGRAPHY_PROMPT_BLOCK,
  HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK,
  type TextRenderMode,
  usesCriticalTypographyPrompt,
  usesPosterMotionPreserve,
} from "@/lib/hybrid-motion-overlay";
import { premiumMotionProfileFromPosterSettings } from "@/lib/premium-motion-engine";
import { buildCompactViduMotionPrompt, buildCompactInstantStoryBlock } from "@/lib/vidu-prompt-budget";
import {
  buildComicStripSegmentBridgeHint,
  COMIC_STRIP_POWER_LINE,
  shouldUseComicStripWorldTransitions,
} from "@/lib/vidu-comic-strip-transitions";
import { buildExactFrameContinuationPromptLine } from "@/lib/exact-frame-continuity";
import type { AnimationStyleId } from "@/lib/animation-style-types";
import {
  parsePremiumPolishSettings,
  resolvePremiumPolishProfile,
} from "@/lib/premium-polish-settings";
import type { PremiumMotionProfile } from "@/lib/premium-motion-engine";
import {
  filterVisualOnlyChips,
  LOCKED_TEXT_SAFETY_BLOCK,
  isTextImplyingChipId,
} from "@/lib/locked-text-layer";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { heroSourceText, normalizeSceneText } from "@/lib/story-overlay-templates";
import {
  buildSceneEmotionPromptLineForScene,
  resolveSceneEmotionId,
  resolveStoryActingIntensity,
  shouldUseSubtleMotionOnly,
  VIDU_MULTI_IMAGE_EMOTION_DIRECTOR_BLOCK,
  type SceneActingIntensity,
} from "@/lib/animation-scene-emotions";
import { buildCharacterRoleEnginePromptBlock, detectCharacterRoles } from "@/lib/character-role-engine";
import {
  buildPerSceneContinuityHint,
  buildStoryCharacterContinuityBlock,
  buildStoryFrameCharacterAssignments,
  DEFAULT_STORY_CONTINUITY_STRENGTH,
  normalizeStoryContinuityStrength,
  type StoryContinuityStrength,
  type StoryFrameCharacterAssignment,
} from "@/lib/story-character-continuity";
import { buildCompactFacialActingLine } from "@/lib/premium-facial-acting";
import {
  buildBudgetedViduPrompt,
  type ViduPromptBudgetLog,
} from "@/lib/vidu-prompt-budget";

export type InstantPremiumChipId =
  | "slow_zoom_in"
  | "cinematic_soft"
  | "subtle_pan"
  | "close_up_focus"
  | "focus_details"
  | "subject_centered"
  | "food_appetizing"
  | "more_dynamic"
  | "ai_decide";

export const INSTANT_PREMIUM_CHIP_IDS: readonly InstantPremiumChipId[] = [
  "slow_zoom_in",
  "cinematic_soft",
  "subtle_pan",
  "close_up_focus",
  "focus_details",
  "subject_centered",
  "food_appetizing",
  "more_dynamic",
  "ai_decide",
] as const;

export { isTextImplyingChipId, LOCKED_TEXT_SAFETY_BLOCK, filterVisualOnlyChips };

export const INSTANT_PREMIUM_STYLE_LABELS: Record<InstantPremiumStylePreset, string> = {
  food_promo: "Food Promo",
  clean_business: "Clean Business",
  social_boost: "Social Boost",
};

const STYLE_PROMPTS: Record<InstantPremiumStylePreset, string> = {
  food_promo:
    "Use a warm cinematic food style with soft lighting, appetizing tones, and a premium homemade feel.",
  clean_business:
    "Use a clean, minimal, modern style with smooth motion and professional pacing.",
  social_boost:
    "Use a slightly more dynamic and energetic style while staying controlled and premium.",
};

const CHIP_INSTRUCTIONS: Record<InstantPremiumChipId, string> = {
  slow_zoom_in: "Apply a slow, smooth zoom-in on each scene.",
  cinematic_soft:
    "Use gentle cinematic camera motion with subtle zoom and soft parallax.",
  subtle_pan: "Apply a subtle horizontal camera pan to create natural movement.",
  close_up_focus: "Emphasize close-up framing and focus on key elements.",
  focus_details: "Highlight fine details and textures.",
  subject_centered: "Keep the main subject centered and clearly visible.",
  food_appetizing:
    "Enhance food visuals with warmth, freshness, and texture emphasis.",
  more_dynamic:
    "Increase pacing slightly with more noticeable motion while staying smooth.",
  ai_decide: "",
};

export function isInstantPremiumChipId(value: string): value is InstantPremiumChipId {
  return (INSTANT_PREMIUM_CHIP_IDS as readonly string[]).includes(value) && !isTextImplyingChipId(value);
}

export function isInstantPremiumStylePreset(value: string): value is InstantPremiumStylePreset {
  return value === "food_promo" || value === "clean_business" || value === "social_boost";
}

export function chipInstructionLines(chipIds: string[]): string[] {
  const lines: string[] = [];
  for (const id of chipIds) {
    if (!isInstantPremiumChipId(id)) {
      continue;
    }
    const text = CHIP_INSTRUCTIONS[id].trim();
    if (text) {
      lines.push(text);
    }
  }
  return lines;
}

export type BuildInstantVideoPromptInput = {
  stylePreset: InstantPremiumStylePreset;
  duration: InstantPremiumDurationSeconds;
  aspectRatio: InstantPremiumAspectRatio;
  userIntent: string | null;
  selectedChips: string[];
  continuityStrength?: InstantPremiumContinuityStrength;
  /** When true (default for instant premium), append Vidu text-safety rules. */
  lockedTextMode?: boolean;
  /** When true, source images had baked-in text masked before Vidu. */
  bakedTextProtectionActive?: boolean;
  /** Hybrid overlay pipeline: scene-only AI + post reprojection. */
  hybridOverlayActive?: boolean;
  /** DeeVid-style / text-safe: critical Vidu typography rules. */
  textRenderMode?: TextRenderMode;
  /** Poster base preserved; Vidu animates foreground only. */
  posterMotionActive?: boolean;
  /** Phase 1 premium motion direction (defaults to expressive). */
  motionProfile?: PremiumMotionProfile;
  /** Full premium polish profile (preset, camera, FX, comic). */
  polishSettingsRaw?: unknown;
  /** Per-segment directing (multi-character focus cycle). */
  transitionOrder?: number;
  transitionTotal?: number;
  /** Segment B starts on same keyframe as segment A ended — continuation mode. */
  exactFrameContinuation?: boolean;
};

const CONTINUITY_MARKER_RE = /^\[hc_continuity:(balanced|strict)\]\s*\n?/i;

export function normalizeInstantPremiumContinuityStrength(
  value: unknown
): InstantPremiumContinuityStrength {
  return value === "strict" ? "strict" : "balanced";
}

export function composeStoredInstantUserIntent(params: {
  continuityStrength: InstantPremiumContinuityStrength;
  text: string;
}): string {
  const marker = `[hc_continuity:${params.continuityStrength}]`;
  const clean = params.text.trim();
  return clean ? `${marker}\n${clean}` : marker;
}

export function parseStoredInstantUserIntent(raw: string | null | undefined): {
  continuityStrength: InstantPremiumContinuityStrength;
  text: string;
} {
  const input = raw?.trim() ?? "";
  if (!input) {
    return { continuityStrength: "balanced", text: "" };
  }
  const match = input.match(CONTINUITY_MARKER_RE);
  if (!match) {
    return { continuityStrength: "balanced", text: input };
  }
  const continuityStrength = normalizeInstantPremiumContinuityStrength(match[1]?.toLowerCase());
  const text = input.replace(CONTINUITY_MARKER_RE, "").trim();
  return { continuityStrength, text };
}

/**
 * Single structured prompt for instant premium multi-image video (used as base for each transition segment).
 */
export function buildInstantVideoPrompt(input: BuildInstantVideoPromptInput): string {
  const styleLine = STYLE_PROMPTS[input.stylePreset];
  const visualChips = filterVisualOnlyChips(input.selectedChips);
  const chipLines = chipInstructionLines(visualChips);
  const chipBlock =
    chipLines.length > 0 ? chipLines.map((l) => `- ${l}`).join(" ") : "(none — rely on defaults above.)";

  const intentTrimmed = input.userIntent?.trim() ?? "";
  const intentBlock =
    intentTrimmed.length > 0
      ? intentTrimmed
      : "(none — follow defaults and chip directions only.)";
  const continuityStrength = normalizeInstantPremiumContinuityStrength(input.continuityStrength);
  const continuityLine =
    continuityStrength === "strict"
      ? "Strict continuity across keyframes."
      : "Balanced continuity with subtle variation.";

  const polishProfile = resolvePremiumPolishProfile(
    input.polishSettingsRaw ?? input.motionProfile
  );
  const motionProfile =
    input.motionProfile ??
    premiumMotionProfileFromPosterSettings(input.polishSettingsRaw);
  const parsedPolish = parsePremiumPolishSettings(input.polishSettingsRaw);
  const premiumMotionBlock = buildCompactViduMotionPrompt(
    {
      ...polishProfile,
      motionEnergy: motionProfile.motionEnergy,
      characterMotion: motionProfile.characterMotion ?? polishProfile.characterMotion,
    },
    {
      sceneIntelligence: parsedPolish.sceneIntelligence,
      transitionOrder: input.transitionOrder,
      transitionTotal: input.transitionTotal,
      userIntent: input.userIntent,
      exactFrameContinuation: input.exactFrameContinuation,
    }
  );

  const storyBlock = buildCompactInstantStoryBlock({
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    styleLine,
    chipSummary: chipBlock,
    continuityLine,
    userIntent: intentBlock,
  });

  const usePosterPreserve =
    input.posterMotionActive || (input.textRenderMode && usesPosterMotionPreserve(input.textRenderMode));

  const tailBlocks: string[] = [];
  if (!usePosterPreserve && input.lockedTextMode !== false) {
    tailBlocks.push(LOCKED_TEXT_SAFETY_BLOCK.split("\n").slice(0, 3).join("\n"));
  }
  if (
    input.bakedTextProtectionActive &&
    input.textRenderMode &&
    usesCriticalTypographyPrompt(input.textRenderMode)
  ) {
    tailBlocks.push(DEEVID_CRITICAL_TYPOGRAPHY_PROMPT_BLOCK.split("\n").slice(0, 4).join("\n"));
  } else if (input.hybridOverlayActive) {
    tailBlocks.push(HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK.split("\n").slice(0, 3).join("\n"));
  } else if (input.bakedTextProtectionActive) {
    tailBlocks.push(BAKED_TEXT_CLEANED_PROMPT_BLOCK.split("\n").slice(0, 3).join("\n"));
  }

  const transitionTotal = Math.max(1, input.transitionTotal ?? 1);
  const powerLine =
    shouldUseComicStripWorldTransitions(polishProfile.animationStyleId, transitionTotal) ?
      COMIC_STRIP_POWER_LINE
    : "";

  return [storyBlock, premiumMotionBlock, ...tailBlocks, powerLine].filter(Boolean).join("\n\n");
}

/** When source frames still contain intentional UI/card text (not pre-masked for Vidu). */
export const STORY_MODE_BAKED_UI_PRESERVATION_BLOCK = `BAKED UI IN SOURCE FRAMES:
- Preserve existing visible UI text already printed in the uploaded images (message boxes, city names, location labels, dashboard labels, stats cards, app cards).
- Keep those elements stable, readable, and visually consistent during motion.
- Do not rewrite, translate, replace, or invent new on-frame UI copy.`;

export const STORY_GENERAL_ANTI_ARTIFACT_BLOCK = `GENERAL STABILITY (preserve the source frames):
- No extra people appearing in the foreground.
- No duplicate faces or duplicated mascot heads.
- No floating limbs, distorted fingers, or warped hands.
- No melting clothing, warped food plates, or unreadable text morphing inside the video.`;

export const STORY_CHARACTER_ANATOMY_PRESERVATION_BLOCK = `CHARACTER & ANATOMY PRESERVATION:
- Preserve the exact number of visible hands, arms, fingers, and bodies from each source image.
- Do not invent extra hands, arms, fingers, shoulders, or limbs.
- Do not create new body parts between people and mascots.
- Do not merge hands or arms between different characters.
- Keep hands attached only to their correct visible owner.
- Keep physical contact simple and believable.
- Avoid adding hands in gaps between characters; if a hand is unclear, keep it subtle or hidden instead of inventing anatomy.
- Keep mascots clean, toy-like, and stable; do not deform mascot faces, eyes, mouths, gloves, aprons, hats, or props.
- Keep real human faces and sunglasses stable.
- Maintain original pose and body structure.
- Animate with subtle motion only: gentle camera move, small smiles, subtle head movement, light environmental motion.`;

export type StoryPromptSceneSignals = {
  hasPeopleCues: boolean;
  hasMascotCues: boolean;
  hasGroupOrFinaleCues: boolean;
};

export function resolveStoryPromptSceneSignals(
  sceneTexts: InstantSceneText[],
  imageCount: number
): StoryPromptSceneSignals {
  const chunks: string[] = [];
  for (let i = 0; i < imageCount; i += 1) {
    const scene = normalizeSceneText(sceneTexts[i]);
    chunks.push(
      scene.heroText,
      scene.title,
      scene.subtitle,
      scene.heroFinaleText,
      ...scene.lines.map((l) => l.text)
    );
  }
  const blob = chunks.join(" ").toLowerCase();
  const peopleCue =
    /\b(person|people|human|man|woman|chef|host|presenter|friends?|team|group|shoulder|hand|hands|together|hug|arm)\b/i.test(
      blob
    );
  const mascotCue =
    /\b(mascot|cartoon|character|toy|bear|bunny|rabbit|chef\s+mascot|garden\s+mascot)\b/i.test(
      blob
    );
  const lastScene = normalizeSceneText(sceneTexts[imageCount - 1]);
  const groupFinaleCue =
    imageCount >= 3 ||
    Boolean(lastScene.heroFinaleText.trim()) ||
    lastScene.lines.length >= 2 ||
    /\b(finale|together|group|movement|join)\b/i.test(
      [lastScene.title, lastScene.subtitle, lastScene.heroFinaleText].join(" ")
    );
  return {
    hasPeopleCues: peopleCue,
    hasMascotCues: mascotCue,
    hasGroupOrFinaleCues: groupFinaleCue,
  };
}

const STORY_CONTINUITY_MARKER_RE = /^\[hc_story_continuity:(normal|strong|strict)\]\s*\n?/i;

export function parseStoredStoryContinuityStrength(
  raw: string | null | undefined
): StoryContinuityStrength {
  const input = raw?.trim() ?? "";
  const match = input.match(STORY_CONTINUITY_MARKER_RE);
  if (match) {
    return normalizeStoryContinuityStrength(match[1]?.toLowerCase());
  }
  return DEFAULT_STORY_CONTINUITY_STRENGTH;
}

export function composeStoredStoryUserIntent(params: {
  continuityStrength: StoryContinuityStrength;
  text: string;
}): string {
  const marker = `[hc_story_continuity:${params.continuityStrength}]`;
  const clean = params.text.replace(STORY_CONTINUITY_MARKER_RE, "").trim();
  return clean ? `${marker}\n${clean}` : marker;
}

export type StoryScenePromptMeta = {
  sceneIndex: number;
  resolvedEmotion: ReturnType<typeof resolveSceneEmotionId>;
  emotionMode: "auto" | "manual";
  actingIntensity: SceneActingIntensity;
  characterRole: StoryFrameCharacterAssignment;
  continuityHint: string;
};

export type BuildInstantStoryModePromptInput = {
  userIntent: string | null;
  imageCount: number;
  sceneTexts: InstantSceneText[];
  transitionSeconds: number;
  stylePreset?: InstantPremiumStylePreset;
  aspectRatio?: InstantPremiumAspectRatio;
  /** True when any keyframe was pre-masked for baked-text protection before Vidu. */
  bakedTextProtectionActive?: boolean;
  continuityStrength?: StoryContinuityStrength;
  projectActingIntensity?: SceneActingIntensity;
  /** V30: Studio execution prompts per scene index (handoff v11). */
  studioExecutionPrompts?: Array<string | null>;
  /** V45: Studio motion direction lines per scene (blocking, composition, arc). */
  studioMotionInstructions?: Array<string | null>;
};

export type BuildInstantStoryModePromptResult = {
  prompt: string;
  characterContinuityBlock: string;
  continuityStrength: StoryContinuityStrength;
  sceneMeta: StoryScenePromptMeta[];
  actingIntensityDefault: SceneActingIntensity;
};

/**
 * Single Vidu multiframe prompt — scene titles are narrative context only, never rendered in-video.
 */
export function buildInstantStoryModePrompt(input: BuildInstantStoryModePromptInput): string {
  return buildInstantStoryModePromptDetailed(input).prompt;
}

export function buildInstantStoryModePromptDetailed(
  input: BuildInstantStoryModePromptInput
): BuildInstantStoryModePromptResult {
  const styleLine =
    input.stylePreset && isInstantPremiumStylePreset(input.stylePreset) ?
      STYLE_PROMPTS[input.stylePreset]
    : STYLE_PROMPTS.food_promo;

  const continuityStrength =
    input.continuityStrength ??
    parseStoredStoryContinuityStrength(input.userIntent);
  const normalizedScenes = Array.from({ length: input.imageCount }, (_, i) =>
    normalizeSceneText(input.sceneTexts[i])
  );
  const assignments = buildStoryFrameCharacterAssignments(normalizedScenes, input.imageCount);
  const characterContinuityBlock = buildStoryCharacterContinuityBlock({
    assignments,
    strength: continuityStrength,
    aspectRatio: input.aspectRatio,
  });

  const actingIntensityDefault = resolveStoryActingIntensity({
    projectDefault: input.projectActingIntensity,
  });
  const anyActiveActing = normalizedScenes.some(
    (scene) =>
      !shouldUseSubtleMotionOnly(
        resolveStoryActingIntensity({
          sceneActingIntensity: scene.actingIntensity,
          projectDefault: input.projectActingIntensity,
        })
      )
  );

  const sceneMeta: StoryScenePromptMeta[] = [];
  const sceneLines: string[] = [];
  for (let i = 0; i < input.imageCount; i += 1) {
    const scene = normalizedScenes[i]!;
    const assignment = assignments[i]!;
    const actingIntensity = resolveStoryActingIntensity({
      sceneActingIntensity: scene.actingIntensity,
      projectDefault: input.projectActingIntensity,
    });
    const resolvedEmotion = resolveSceneEmotionId({
      emotionMode: scene.emotionMode,
      emotion: scene.emotion,
      autoEmotion: scene.autoEmotion,
      sceneIndex: i,
      sceneCount: input.imageCount,
      textSignals: {
        heroText: scene.heroText,
        title: scene.title,
        subtitle: scene.subtitle,
        heroFinaleText: scene.heroFinaleText,
        finaleFooter: scene.finaleFooter,
        extraLines: scene.extraLines,
        lines: scene.lines.map((line) => line.text),
      },
    });
    sceneMeta.push({
      sceneIndex: i,
      resolvedEmotion,
      emotionMode: scene.emotionMode,
      actingIntensity,
      characterRole: assignment,
      continuityHint: buildPerSceneContinuityHint(assignment, continuityStrength),
    });

    const parts: string[] = [buildPerSceneContinuityHint(assignment, continuityStrength)];
    const hero = heroSourceText(scene);
    if (hero) {
      parts.push(`story beat: ${hero}`);
    }
    if (scene.title) {
      parts.push(`title context: ${scene.title}`);
    }
    if (scene.subtitle) {
      parts.push(`subtitle context: ${scene.subtitle}`);
    }
    if (scene.lines.length > 0) {
      const sequenceContext = scene.lines.map((l) => l.text).join(" → ");
      parts.push(`timed overlay sequence (post-production only): ${sequenceContext}`);
    }
    if (scene.heroFinaleText.trim()) {
      parts.push(`hero finale overlay context: ${scene.heroFinaleText.trim()}`);
    }
    if (typeof scene.durationSeconds === "number") {
      parts.push(`intended scene pacing: ~${scene.durationSeconds}s`);
    }
    const emotionLine = buildSceneEmotionPromptLineForScene({
      emotionMode: scene.emotionMode,
      emotion: scene.emotion,
      autoEmotion: scene.autoEmotion,
      sceneIndex: i,
      sceneCount: input.imageCount,
      actingIntensity,
      textSignals: {
        heroText: scene.heroText,
        title: scene.title,
        subtitle: scene.subtitle,
        heroFinaleText: scene.heroFinaleText,
        finaleFooter: scene.finaleFooter,
        extraLines: scene.extraLines,
        lines: scene.lines.map((line) => line.text),
      },
    });
    if (emotionLine) {
      parts.push(`emotion & acting: ${emotionLine}`);
    }
    const studioExecution = input.studioExecutionPrompts?.[i]?.trim();
    if (studioExecution) {
      parts.push(`Studio execution (director, world, characters): ${studioExecution}`);
    }
    const studioMotion = input.studioMotionInstructions?.[i]?.trim();
    if (studioMotion) {
      parts.push(`Studio motion direction: ${studioMotion.replace(/\n/g, "; ")}`);
    }
    const context =
      parts.length > 0 ? parts.join("; ") : "visual continuity from the keyframe only";
    sceneLines.push(`Scene ${i + 1}: ${context}`);
  }

  const intentClean = (input.userIntent ?? "").replace(STORY_CONTINUITY_MARKER_RE, "").trim();
  const intentBlock =
    intentClean ?
      `User direction: ${intentClean}`
    : "Follow cinematic defaults and preserve subject identity across all keyframes.";

  const bakedTextTail = input.bakedTextProtectionActive ?
    BAKED_TEXT_CLEANED_PROMPT_BLOCK.split("\n").slice(0, 4).join("\n")
  : STORY_MODE_BAKED_UI_PRESERVATION_BLOCK.split("\n").slice(0, 4).join("\n");

  const sceneSignals = resolveStoryPromptSceneSignals(input.sceneTexts, input.imageCount);
  const anatomyBlocks: string[] = [STORY_GENERAL_ANTI_ARTIFACT_BLOCK];
  if (
    sceneSignals.hasPeopleCues ||
    sceneSignals.hasMascotCues ||
    sceneSignals.hasGroupOrFinaleCues
  ) {
    const anatomy = STORY_CHARACTER_ANATOMY_PRESERVATION_BLOCK.split("\n");
    const filteredAnatomy =
      anyActiveActing ?
        anatomy.filter((line) => !/subtle motion only/i.test(line))
      : anatomy;
    anatomyBlocks.push(filteredAnatomy.join("\n"));
  }
  if (sceneSignals.hasGroupOrFinaleCues) {
    anatomyBlocks.push(
      "Final frames with multiple characters: keep spacing between people and mascots clear; do not fill gaps with extra limbs or hands; preserve each character's original silhouette."
    );
  }

  const corpus = normalizedScenes
    .map((s) => [s.heroText, s.title, s.subtitle, s.heroFinaleText].join(" "))
    .join(" ");
  const roles = detectCharacterRoles({ corpus, imageCount: input.imageCount });
  const roleBlock = buildCharacterRoleEnginePromptBlock(roles);
  const facialLine = buildCompactFacialActingLine(roles);

  const prompt = [
    characterContinuityBlock,
    VIDU_MULTI_IMAGE_EMOTION_DIRECTOR_BLOCK,
    anyActiveActing ?
      "FACIAL ACTING: expressions must be clearly visible on mobile — active smiles, eyebrow movement, eye openness, and readable reactions."
    : "",
    "Create one continuous cinematic video using the uploaded images in the exact order as storyboard scenes.",
    "Treat each image as a fixed visual anchor — animate motion within each identity; do not morph one character into another.",
    "Use the uploaded images in order. Some scenes may last longer for emotional beats. Keep motion natural and cinematic.",
    "Smoothly transition between consecutive keyframes without identity swaps.",
    "Hero, title, subtitle, sequence lines, and hero finale strings are FFmpeg overlay copy added after generation — never render them inside the Vidu video.",
    "The following scene list is narrative context for motion and pacing only.",
    "Do not generate new visible captions, hero lines, subtitles, or marketing overlay typography inside the video.",
    "Keep motion cinematic, natural, and coherent.",
    "The full video should feel like one complete story from beginning to end.",
    roleBlock,
    facialLine,
    styleLine,
    intentBlock,
    `Target pacing: approximately ${input.transitionSeconds} seconds per transition between keyframes.`,
    "Scene list (FFmpeg overlay context only — do not render these words as visible text):",
    ...sceneLines,
    bakedTextTail,
    ...anatomyBlocks,
    LOCKED_TEXT_SAFETY_BLOCK.split("\n").slice(0, 3).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    prompt,
    characterContinuityBlock,
    continuityStrength,
    sceneMeta,
    actingIntensityDefault,
  };
}

/** Story Mode prompt with priority budgeting (identity first). */
export function buildStoryModeBudgetedViduPrompt(params: {
  projectId?: string;
  detailed: BuildInstantStoryModePromptResult;
}): { prompt: string; log: ViduPromptBudgetLog } {
  const continuity = params.detailed.characterContinuityBlock.trim();
  const storyBody = params.detailed.prompt
    .replace(continuity, "")
    .replace(/^\n{2,}/, "")
    .trim();
  return buildBudgetedViduPrompt({
    projectId: params.projectId,
    segmentIndex: 0,
    preservationBlock: continuity,
    storyBlock: storyBody,
    motionBlock: "",
  });
}

export function instantPremiumTransitionSegmentHint(params: {
  transitionOrder: number;
  transitionTotal: number;
  imageCount: number;
  animationStyleId?: AnimationStyleId;
  exactFrameContinuation?: boolean;
}): string {
  const { transitionOrder, transitionTotal, imageCount } = params;
  const from = transitionOrder + 1;
  const to = transitionOrder + 2;
  const base = `Segment ${transitionOrder + 1}/${transitionTotal}: image ${from}→${to} of ${imageCount}. Continue prior motion; seamless next frame.`;
  const comicBridge =
    params.animationStyleId ?
      buildComicStripSegmentBridgeHint({
        animationStyleId: params.animationStyleId,
        transitionOrder,
        transitionTotal,
      })
    : "";
  const continuation =
    params.exactFrameContinuation ?
      buildExactFrameContinuationPromptLine("continuation")
    : "";
  return [base, comicBridge, continuation].filter(Boolean).join(" ");
}
