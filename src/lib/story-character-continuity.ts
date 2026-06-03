/**
 * Story Mode character identity — per-frame roles and strict continuity for Vidu multiframe.
 */

import type { NormalizedSceneText } from "@/lib/story-overlay-templates";
import { sceneEmotionTextBlob } from "@/lib/animation-scene-emotions";

export type StoryCharacterRoleId =
  | "SERGIO_PRESENTER"
  | "CHEF_MASCOT"
  | "GARDEN_MASCOT"
  | "DESIGNER_MASCOT"
  | "MIXED_GROUP"
  | "UNKNOWN";

export type StoryContinuityStrength = "normal" | "strong" | "strict";

export const DEFAULT_STORY_CONTINUITY_STRENGTH: StoryContinuityStrength = "strict";

export type StoryFrameCharacterAssignment = {
  sceneIndex: number;
  roleId: StoryCharacterRoleId;
  label: string;
  confidence: number;
};

const ROLE_KEYWORDS: { roleId: StoryCharacterRoleId; patterns: RegExp[] }[] = [
  {
    roleId: "SERGIO_PRESENTER",
    patterns: [/\bsergio\b/i, /\bpresenter\b/i, /\bhost\b/i, /\bhuman\b/i, /\bman\b/i, /\bwoman\b/i],
  },
  {
    roleId: "CHEF_MASCOT",
    patterns: [/\bchef\b/i, /\bkok\b/i, /\bcook\b/i, /\bkeuken\b/i, /\bchef\s+mascot\b/i],
  },
  {
    roleId: "GARDEN_MASCOT",
    patterns: [/\bgarden\b/i, /\btuin\b/i, /\bplant\b/i, /\bgroen\b/i, /\bgarden\s+mascot\b/i, /\bharvest\b/i],
  },
  {
    roleId: "DESIGNER_MASCOT",
    patterns: [/\bdesigner\b/i, /\bdesign\b/i, /\bcreative\b/i, /\bstudio\b/i, /\bontwerp\b/i],
  },
  {
    roleId: "MIXED_GROUP",
    patterns: [
      /\btogether\b/i,
      /\bgroup\b/i,
      /\bteam\b/i,
      /\bcommunity\b/i,
      /\bpeople\b/i,
      /\bfriends?\b/i,
      /\bmovement\b/i,
      /\bfinale\b/i,
    ],
  },
];

export function normalizeStoryContinuityStrength(value: unknown): StoryContinuityStrength {
  if (value === "normal" || value === "strong" || value === "strict") {
    return value;
  }
  return DEFAULT_STORY_CONTINUITY_STRENGTH;
}

export function detectStoryCharacterRoleForScene(
  scene: Pick<NormalizedSceneText, "heroText" | "title" | "subtitle" | "heroFinaleText" | "finaleFooter" | "extraLines" | "lines">,
  sceneIndex: number,
  sceneCount: number
): StoryFrameCharacterAssignment {
  const blob = sceneEmotionTextBlob({
    heroText: scene.heroText,
    title: scene.title,
    subtitle: scene.subtitle,
    heroFinaleText: scene.heroFinaleText,
    finaleFooter: scene.finaleFooter,
    extraLines: scene.extraLines,
    lines: scene.lines.map((l) => l.text),
  });

  if (sceneIndex >= sceneCount - 1 && /\b(together|group|movement|finale|community)\b/i.test(blob)) {
    return { sceneIndex, roleId: "MIXED_GROUP", label: "mixed group finale", confidence: 0.88 };
  }

  for (const rule of ROLE_KEYWORDS) {
    if (rule.patterns.some((re) => re.test(blob))) {
      return {
        sceneIndex,
        roleId: rule.roleId,
        label: rule.roleId.replace(/_/g, " ").toLowerCase(),
        confidence: 0.82,
      };
    }
  }

  if (sceneIndex === 0) {
    return { sceneIndex, roleId: "SERGIO_PRESENTER", label: "opening presenter", confidence: 0.5 };
  }

  return { sceneIndex, roleId: "UNKNOWN", label: "unknown subject", confidence: 0.35 };
}

export function buildStoryFrameCharacterAssignments(
  scenes: NormalizedSceneText[],
  imageCount: number
): StoryFrameCharacterAssignment[] {
  const count = Math.max(0, imageCount);
  const out: StoryFrameCharacterAssignment[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(detectStoryCharacterRoleForScene(scenes[i] ?? scenes[scenes.length - 1]!, i, count));
  }
  return out;
}

function strengthPreamble(strength: StoryContinuityStrength): string {
  if (strength === "strict") {
    return "STRICT CHARACTER CONTINUITY (Story Mode — highest priority):";
  }
  if (strength === "strong") {
    return "STRONG CHARACTER CONTINUITY (Story Mode):";
  }
  return "CHARACTER CONTINUITY (Story Mode):";
}

const IDENTITY_LOCK_LINES = [
  "Keep every recurring character visually consistent across all keyframes and transitions.",
  "Sergio / human presenter: same face, hair, skin tone, sunglasses, clothing, and body proportions in every frame where he appears.",
  "Chef mascot: always the Chef mascot — same face, hat, apron, gloves, colors, and logo. Never become Garden or Designer.",
  "Garden mascot: always the Garden mascot — same face, outfit, greens, and silhouette. Never become Chef or Designer.",
  "Designer mascot: always the Designer mascot — stable face, outfit, and brand colors.",
  "Never transform Chef into Garden, Garden into Chef, or merge mascots into one hybrid character.",
  "Never replace one mascot with another between frames.",
  "If a new mascot appears in a later frame, introduce it as a new character — not as a morph of an earlier mascot.",
  "Keep face shape, outfit, color identity, apron/logo identity, and silhouette stable shot to shot.",
  "Do not morph, swap, or blend identities during transitions — animate motion only within each character's identity.",
];

export function buildStoryCharacterContinuityBlock(params: {
  assignments: StoryFrameCharacterAssignment[];
  strength?: StoryContinuityStrength;
  aspectRatio?: string;
}): string {
  const strength = params.strength ?? DEFAULT_STORY_CONTINUITY_STRENGTH;
  const lines = [strengthPreamble(strength), ...IDENTITY_LOCK_LINES];

  if (params.aspectRatio === "9:16") {
    lines.push(
      "Vertical 9:16: keep presenter and mascots in consistent screen regions; do not drift identity when camera moves."
    );
  }

  const perFrame = params.assignments
    .map((a) => `Frame ${a.sceneIndex + 1}: primary subject — ${a.label} (${a.roleId.replace(/_/g, " ")}).`)
    .join("\n");

  if (perFrame) {
    lines.push("Per-frame identity anchors (do not violate):", perFrame);
  }

  const rolesPresent = [...new Set(params.assignments.map((a) => a.roleId))];
  if (rolesPresent.includes("CHEF_MASCOT") && rolesPresent.includes("GARDEN_MASCOT")) {
    lines.push(
      "Chef and Garden both appear in this story: they are different characters — never interchange their faces, outfits, or silhouettes."
    );
  }

  return lines.join("\n");
}

export function buildPerSceneContinuityHint(
  assignment: StoryFrameCharacterAssignment,
  strength: StoryContinuityStrength
): string {
  const strict = strength === "strict" || strength === "strong";
  const base = `identity anchor: ${assignment.label}`;
  if (!strict) {
    return base;
  }
  switch (assignment.roleId) {
    case "CHEF_MASCOT":
      return `${base}; keep Chef mascot only — never morph into Garden or other mascots`;
    case "GARDEN_MASCOT":
      return `${base}; keep Garden mascot only — never morph into Chef or other mascots`;
    case "DESIGNER_MASCOT":
      return `${base}; keep Designer mascot only`;
    case "SERGIO_PRESENTER":
      return `${base}; keep Sergio / same human presenter`;
    case "MIXED_GROUP":
      return `${base}; preserve each visible character separately — no merged identities`;
    default:
      return `${base}; preserve visible subjects from the keyframe`;
  }
}
