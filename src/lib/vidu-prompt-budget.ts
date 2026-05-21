/**
 * Vidu prompt length budget — compact premium polish under provider limits.
 */

import { getAnimationStyleIdentity } from "@/lib/animation-style-presets";
import { ANIMATION_STYLE_IDS, type AnimationStyleId } from "@/lib/animation-style-types";
import { buildCharacterRoleEnginePromptBlock } from "@/lib/character-role-engine";
import type { CharacterSceneRole } from "@/lib/character-role-engine";
import { buildFocusCycleForSegment, buildPrimarySharedGroupPlan } from "@/lib/primary-shared-group";
import { shouldUseSharedGroupDirecting } from "@/lib/animation-style-identity";
import { getEmotionalActingPreset } from "@/lib/premium-emotional-presets";
import { buildCharacterMotionDirectionBlock, PREMIUM_MOTION_PIPELINE } from "@/lib/premium-motion-engine";
import { buildSegmentTransitionContinuityBlock } from "@/lib/segment-transition-types";
import type { ResolvedPremiumPolishProfile } from "@/lib/premium-polish-settings";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";
import { deriveMotionMemoryState } from "@/lib/premium-motion-memory";
import { resolveMotionVariationPhase } from "@/lib/premium-motion-variation";
import { buildComicStripWorldTransitionBlock } from "@/lib/vidu-comic-strip-transitions";
import { buildHardTextLockPromptLine } from "@/lib/hard-text-lock";
import { buildCompactFacialActingLine } from "@/lib/premium-facial-acting";
import { buildGlobalMascotAnimationPromptBlock } from "@/lib/premium-mascot-animation-preset";
import { buildExactFrameContinuationPromptLine } from "@/lib/exact-frame-continuity";
import {
  DEEVID_ORCHESTRATION_LINE,
  VIDU_NEGATIVE_TEXT_SAFETY_LINE,
} from "@/lib/deevid-premium-polish";

/** Target max chars sent to Vidu (premium instant). */
export const VIDU_PROMPT_MAX_CHARS = 3500;

/** Absolute ceiling after compression; preflight fails above this. */
export const VIDU_PROMPT_HARD_MAX_CHARS = 4500;

export type ViduPromptPriority = 1 | 2 | 3;

export type ViduPromptBlock = {
  id: string;
  priority: ViduPromptPriority;
  text: string;
};

export type ViduPromptBudgetLog = {
  projectId?: string;
  segmentIndex?: number;
  charsBefore: number;
  charsAfter: number;
  maxChars: number;
  hardMaxChars: number;
  truncatedBlocks: string[];
  droppedBlocks: string[];
};

export type ViduPromptTooLongDebug = ViduPromptBudgetLog & {
  code: "VIDU_PROMPT_TOO_LONG";
  sampleTail: string;
};

/** Single canonical text/layout preservation line (dedupe target). */
export const COMPACT_TEXT_PRESERVATION_LINE =
  "Freeze all text, logos, UI, and speech bubbles — no redraw, morph, or drift. Animate foreground mascots, faces, hands, and products only.";

const DEDUPE_SIGNATURES: { key: string; re: RegExp }[] = [
  { key: "text_freeze", re: /\b(never|do not|don't).*(morph|redraw|regenerat|translat).*(text|logo|typography|ui)\b/i },
  { key: "text_freeze", re: /\bfreeze\b.*\b(text|logo|typography|ui)\b/i },
  { key: "text_freeze", re: /\bstatic\b.*\b(text|logo|typography)\b/i },
  { key: "vidu_primary", re: /\bvidu\b.*\b(primary|dominant|segment)\b/i },
  { key: "no_flicker", re: /\b(no |avoid )?(motion flicker|flicker|expression snap)/i },
  { key: "temporal_cont", re: /\b(temporal|continuity|coherent).*(motion|expression|across)\b/i },
  { key: "gesture_var", re: /\b(gesture variation|do not loop|repeated|identical).*(gesture|sway|wave)\b/i },
  { key: "cinematic_tone", re: /\bcinematic\b/i },
  { key: "expressive_act", re: /\bexpressive\b/i },
  { key: "global_mascot", re: /\bGLOBAL MASCOT \(HomeCheff\)/i },
];

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function lineSignatures(line: string): string[] {
  const keys: string[] = [];
  for (const { key, re } of DEDUPE_SIGNATURES) {
    if (re.test(line)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Remove duplicate lines and repeated semantic signatures across blocks. */
export function deduplicatePromptText(text: string, globalSeen?: Set<string>): string {
  const seen = globalSeen ?? new Set<string>();
  const lines = text.split("\n");
  const kept: string[] = [];

  for (const raw of lines) {
    const line = normalizeLine(raw);
    if (!line) {
      if (kept.length > 0 && kept[kept.length - 1] !== "") {
        kept.push("");
      }
      continue;
    }
    const norm = line.toLowerCase();
    if (seen.has(norm)) {
      continue;
    }
    const sigs = lineSignatures(line);
    if (sigs.length > 0 && sigs.every((s) => seen.has(`sig:${s}`))) {
      continue;
    }
    seen.add(norm);
    for (const s of sigs) {
      seen.add(`sig:${s}`);
    }
    kept.push(raw.trimEnd());
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMeaningfulLines(block: string, maxLines: number): string {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("CREATIVE IDENTITY") && !l.startsWith("CINEMATIC TONE"))
    .slice(0, maxLines)
    .join(" ");
}

function compactRoleSummary(roles: CharacterSceneRole[]): string {
  if (!roles.length) {
    return "lead foreground subject";
  }
  const verbose = buildCharacterRoleEnginePromptBlock(roles);
  if (!verbose) {
    return roles
      .slice(0, 3)
      .map((r) => r.roleId.replace(/_/g, " "))
      .join(", ");
  }
  const bullets = verbose
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .slice(0, 3)
    .map((l) => l.replace(/^- /, "").split(";")[0]?.trim() ?? l)
    .join("; ");
  return bullets || "detected characters";
}

/**
 * Compact premium motion stack — replaces verbose multi-block intelligence layers.
 */
export function buildCompactViduMotionPrompt(
  profile: ResolvedPremiumPolishProfile,
  options?: {
    sceneIntelligence?: SceneIntelligenceSnapshot | null;
    transitionOrder?: number;
    transitionTotal?: number;
    userIntent?: string | null;
    lockedTextRegionCount?: number;
    exactFrameContinuation?: boolean;
  }
): string {
  const scene = options?.sceneIntelligence;
  const roles = scene?.detectedRoles ?? [];
  const identity = getAnimationStyleIdentity(profile.animationStyleId);
  const transitionOrder = options?.transitionOrder ?? 0;
  const transitionTotal = Math.max(1, options?.transitionTotal ?? 1);
  const segmentPhase = resolveMotionVariationPhase(transitionOrder, transitionTotal);

  const emotional = profile.emotionalActingPreset
    ? getEmotionalActingPreset(profile.emotionalActingPreset)
    : null;

  const memory = deriveMotionMemoryState({
    animationStyleId: profile.animationStyleId,
    motionEnergy: profile.motionEnergy,
    transitionOrder,
    transitionTotal,
    roles,
    focusHint: scene?.focusHint,
    emotionalActingPreset: profile.emotionalActingPreset,
    focusCycle: buildPrimarySharedGroupPlan(roles).focusCycle,
  });

  const directingLine = firstMeaningfulLines(identity.directing.promptBlock, 2);
  const cinematicLine = firstMeaningfulLines(identity.cinematic.promptBlock, 1);
  const characterBlock = buildCharacterMotionDirectionBlock(profile.characterMotion);
  const characterCompact = characterBlock
    ? characterBlock.replace("CHARACTER MOTION DIRECTION:\n", "").replace(/\n- /g, "; ")
    : "";

  const sharedPlan = buildPrimarySharedGroupPlan(roles);
  let focusLine = "";
  if (shouldUseSharedGroupDirecting(profile.animationStyleId) && sharedPlan.isMultiLead) {
    const { dominantRole, phaseLabel } = buildFocusCycleForSegment({
      focusCycle: sharedPlan.focusCycle,
      transitionOrder,
      transitionTotal,
    });
    focusLine = `Shared focus: ${phaseLabel}; emphasize ${dominantRole.replace(/_/g, " ")} this segment.`;
  }

  const intentTrim = options?.userIntent?.trim();
  const lines = [
    "PREMIUM MOTION (compact):",
    COMPACT_TEXT_PRESERVATION_LINE,
    `Pipeline: ${PREMIUM_MOTION_PIPELINE.primarySource} primary; assembly ${PREMIUM_MOTION_PIPELINE.assemblyDefault}; no OCR redraw.`,
    `Animation style: ${profile.animationStyleId.replace(/_/g, " ")} — ${identity.cinematic.toneLabel}, ${identity.cinematic.pacingLabel}.`,
    directingLine ? `Directing: ${directingLine}` : "",
    cinematicLine ? `Tone: ${cinematicLine}` : "",
    intentTrim ? `Scene intent: ${intentTrim.slice(0, 280)}` : "",
    `Roles: ${compactRoleSummary(roles)}.`,
    `Motion energy: ${profile.motionEnergy}.`,
    emotional ? `Acting: ${emotional.actingPromptBlock.split("\n")[0]?.replace(/^- /, "") ?? profile.emotionalActingPreset}` : "",
    characterCompact ? `Character: ${characterCompact}` : "",
    (() => {
      const mascotLine = buildGlobalMascotAnimationPromptBlock({
        roles,
        scene,
        userIntent: options?.userIntent,
        compact: true,
      });
      if (mascotLine) {
        return mascotLine;
      }
      return buildCompactFacialActingLine(roles);
    })(),
    DEEVID_ORCHESTRATION_LINE,
    `Segment ${transitionOrder + 1}/${transitionTotal} (${segmentPhase}): gesture ${memory.activeGestureBeat.replace(/_/g, " ")}; avoid repeat loops.`,
    focusLine,
    "Variation: alternate gestures and timing; no robotic sway/hand loops.",
    "Continuity: smooth expression and pose flow; no flicker or snap.",
    buildSegmentTransitionContinuityBlock(profile.segmentTransitionType).split("\n")[0] ?? "",
    profile.cameraPreset !== "none" ? `Camera: ${profile.cameraPreset.replace(/_/g, " ")} — subtle, no shake.` : "",
    profile.fxPreset !== "none" ? `FX: ${profile.fxPreset.replace(/_/g, " ")} on subject only.` : "",
    buildComicStripWorldTransitionBlock({
      animationStyleId: profile.animationStyleId,
      transitionOrder,
      transitionTotal,
    }),
  ].filter(Boolean);

  const body = deduplicatePromptText(lines.join("\n"));
  const lockLine = buildHardTextLockPromptLine(
    profile.textLockMode,
    options?.lockedTextRegionCount ?? 0
  );
  const continuationLine = options?.exactFrameContinuation
    ? buildExactFrameContinuationPromptLine("continuation")
    : "";
  const negativeLine = VIDU_NEGATIVE_TEXT_SAFETY_LINE;
  return [body, lockLine, continuationLine, negativeLine].filter(Boolean).join("\n");
}

/** Shorter instant premium story template (P1 core). */
export function buildCompactInstantStoryBlock(params: {
  aspectRatio: string;
  duration: number;
  styleLine: string;
  chipSummary: string;
  continuityLine: string;
  userIntent: string;
}): string {
  const { aspectRatio, duration, styleLine, chipSummary, continuityLine, userIntent } = params;
  return deduplicatePromptText(
    [
      `Premium short-form video: images in upload order as keyframes. ${aspectRatio}, ${duration}s total.`,
      "One evolving story — no hard cuts; same subject identity and lighting.",
      `Style: ${styleLine}`,
      chipSummary !== "(none — rely on defaults above.)" ? `Motion chips: ${chipSummary}` : "",
      continuityLine,
      userIntent !== "(none — follow defaults and chip directions only.)" ? `User intent: ${userIntent}` : "",
      "Polished social-ready pacing; avoid chaotic or static sections.",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export function applyViduPromptBudget(params: {
  blocks: ViduPromptBlock[];
  maxChars?: number;
  hardMaxChars?: number;
  projectId?: string;
  segmentIndex?: number;
}): { prompt: string; log: ViduPromptBudgetLog } {
  const maxChars = params.maxChars ?? VIDU_PROMPT_MAX_CHARS;
  const hardMaxChars = params.hardMaxChars ?? VIDU_PROMPT_HARD_MAX_CHARS;
  const globalSeen = new Set<string>();
  const truncatedBlocks: string[] = [];
  const droppedBlocks: string[] = [];

  const sorted = [...params.blocks].sort((a, b) => a.priority - b.priority);
  const charsBefore = sorted.reduce((n, b) => n + b.text.length, 0);

  const included: string[] = [];

  for (const block of sorted) {
    const deduped = deduplicatePromptText(block.text, globalSeen);
    if (!deduped) {
      droppedBlocks.push(block.id);
      continue;
    }

    const separator = included.length > 0 ? "\n\n" : "";
    const candidate = included.join("\n\n") + separator + deduped;

    if (candidate.length <= maxChars) {
      included.push(deduped);
      continue;
    }

    const remaining = maxChars - included.join("\n\n").length - separator.length;
    if (remaining > 80 && block.priority <= 2) {
      const slice = deduped.slice(0, remaining).replace(/\s+\S*$/, "").trim();
      if (slice.length > 40) {
        included.push(slice);
        truncatedBlocks.push(block.id);
        continue;
      }
    }

    if (block.priority >= 3) {
      droppedBlocks.push(block.id);
      continue;
    }

    truncatedBlocks.push(block.id);
  }

  let prompt = included.join("\n\n").trim();
  if (prompt.length > hardMaxChars) {
    prompt = prompt.slice(0, hardMaxChars).replace(/\s+\S*$/, "").trim();
    truncatedBlocks.push("_hard_cap");
  }

  const log: ViduPromptBudgetLog = {
    projectId: params.projectId,
    segmentIndex: params.segmentIndex,
    charsBefore,
    charsAfter: prompt.length,
    maxChars,
    hardMaxChars,
    truncatedBlocks,
    droppedBlocks,
  };

  return { prompt, log };
}

export function logViduPromptBudget(log: ViduPromptBudgetLog): void {
  console.info("[vidu-prompt]", {
    projectId: log.projectId,
    segmentIndex: log.segmentIndex,
    charsBefore: log.charsBefore,
    charsAfter: log.charsAfter,
    maxChars: log.maxChars,
    truncatedBlocks: log.truncatedBlocks,
    droppedBlocks: log.droppedBlocks,
  });
}

export function validateViduPromptLength(
  prompt: string,
  hardMax: number = VIDU_PROMPT_HARD_MAX_CHARS
): { ok: true; chars: number } | { ok: false; debug: ViduPromptTooLongDebug } {
  const chars = prompt.length;
  if (chars <= hardMax) {
    return { ok: true, chars };
  }
  return {
    ok: false,
    debug: {
      code: "VIDU_PROMPT_TOO_LONG",
      charsBefore: chars,
      charsAfter: chars,
      maxChars: VIDU_PROMPT_MAX_CHARS,
      hardMaxChars: hardMax,
      truncatedBlocks: [],
      droppedBlocks: [],
      sampleTail: prompt.slice(-200),
    },
  };
}

export type BuildBudgetedViduPromptInput = {
  projectId?: string;
  segmentIndex?: number;
  storyBlock: string;
  motionBlock: string;
  preservationBlock?: string;
  segmentHint?: string;
  extraBlocks?: ViduPromptBlock[];
};

export function buildBudgetedViduPrompt(input: BuildBudgetedViduPromptInput): {
  prompt: string;
  log: ViduPromptBudgetLog;
} {
  const blocks: ViduPromptBlock[] = [
    ...(input.preservationBlock ?
      [{ id: "text_preservation", priority: 1 as const, text: input.preservationBlock }]
    : []),
    { id: "story", priority: 1, text: input.storyBlock },
    ...(input.motionBlock.trim() ?
      [{ id: "compact_motion", priority: 1 as const, text: input.motionBlock }]
    : []),
    ...(input.segmentHint ?
      [{ id: "segment_hint", priority: 2 as const, text: input.segmentHint }]
    : []),
    ...(input.extraBlocks ?? []),
  ];

  const result = applyViduPromptBudget({
    blocks,
    projectId: input.projectId,
    segmentIndex: input.segmentIndex,
  });
  logViduPromptBudget(result.log);
  return result;
}

/** Estimate budgeted length for admin debug (no project required). */
export function estimateBudgetedViduPromptLength(params: {
  storyBlock: string;
  motionBlock: string;
  segmentHint?: string;
}): { chars: number; log: ViduPromptBudgetLog } {
  const { prompt, log } = buildBudgetedViduPrompt({
    storyBlock: params.storyBlock,
    motionBlock: params.motionBlock,
    segmentHint: params.segmentHint,
  });
  return { chars: prompt.length, log };
}

/** Worst-case length check for all animation style presets at preflight. */
export function validateAllPresetViduPromptLengths(
  buildPromptForStyle: (styleId: AnimationStyleId) => string
):
  | { ok: true }
  | { ok: false; debug: ViduPromptTooLongDebug & { animationStyleId: AnimationStyleId } } {
  for (const id of ANIMATION_STYLE_IDS) {
    const prompt = buildPromptForStyle(id);
    const check = validateViduPromptLength(prompt);
    if (!check.ok) {
      return { ok: false, debug: { ...check.debug, animationStyleId: id } };
    }
  }
  return { ok: true };
}
