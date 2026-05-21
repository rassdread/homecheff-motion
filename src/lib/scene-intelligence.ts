/**
 * Automatic scene understanding — heuristic analysis before render (no extra API calls).
 */

import { getAnimationStyleIdentity } from "@/lib/animation-style-identity";
import type { AnimationStyleId } from "@/lib/animation-style-types";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import { type CharacterSceneRole, detectCharacterRoles } from "@/lib/character-role-engine";
import { isHomeCheffMascotRole } from "@/lib/premium-mascot-animation-preset";

export type SceneFocusHint =
  | "mascot_trio"
  | "single_mascot"
  | "product_hero"
  | "human_presenter"
  | "marketplace_crowd"
  | "typography_heavy"
  | "mixed";

export type SceneIntelligenceSnapshot = {
  version: 1;
  focusHint: SceneFocusHint;
  detectedRoles: CharacterSceneRole[];
  hasTypography: boolean;
  hasProduct: boolean;
  hasCrowd: boolean;
  mascotCount: number;
  resolvedEmotionalPreset?: EmotionalActingPresetId;
  keywords: string[];
};

export type SceneIntelligenceInput = {
  animationStyleId: AnimationStyleId;
  userIntent?: string | null;
  imageCount: number;
  /** Filenames or alt text hints from uploads */
  imageHints?: string[];
  /** OCR / baked text block labels */
  textBlockHints?: string[];
};

function collectKeywords(input: SceneIntelligenceInput): string[] {
  const parts: string[] = [];
  if (input.userIntent?.trim()) {
    parts.push(input.userIntent.trim());
  }
  for (const h of input.imageHints ?? []) {
    if (h.trim()) {
      parts.push(h.trim());
    }
  }
  for (const t of input.textBlockHints ?? []) {
    if (t.trim()) {
      parts.push(t.trim());
    }
  }
  return parts;
}

function detectFocusHint(roles: CharacterSceneRole[], input: SceneIntelligenceInput): SceneFocusHint {
  const mascotRoles = roles.filter((r) => isHomeCheffMascotRole(r.roleId));
  if (mascotRoles.length >= 2) {
    return "mascot_trio";
  }
  if (input.textBlockHints && input.textBlockHints.length >= 3) {
    return "typography_heavy";
  }
  if (roles.some((r) => r.roleId === "AFFILIATE_SELLER") || input.animationStyleId === "product_showcase") {
    return "product_hero";
  }
  if (roles.some((r) => r.roleId === "MARKETPLACE_VISITOR") || input.animationStyleId === "marketplace_story") {
    return "marketplace_crowd";
  }
  if (roles.some((r) => r.roleId === "HUMAN_PRESENTER")) {
    return "human_presenter";
  }
  if (mascotRoles.length === 1) {
    return "single_mascot";
  }
  const strategy = getAnimationStyleIdentity(input.animationStyleId).directing.focusStrategy;
  if (strategy === "product_lead") {
    return "product_hero";
  }
  if (strategy === "shared_group" || strategy === "mascot_lead") {
    return mascotRoles.length >= 2 ? "mascot_trio" : "single_mascot";
  }
  if (strategy === "minimal_static") {
    return "typography_heavy";
  }
  if (strategy === "social_punch") {
    return "human_presenter";
  }
  if (strategy === "character_expressive") {
    return "single_mascot";
  }
  return "mixed";
}

function resolveEmotionalPresetForScene(
  animationStyleId: AnimationStyleId,
  focusHint: SceneFocusHint,
  roles: CharacterSceneRole[]
): EmotionalActingPresetId {
  const identityPreset = getAnimationStyleIdentity(animationStyleId).emotionalActingPreset;
  if (identityPreset !== "auto_detect") {
    return identityPreset;
  }
  if (focusHint === "mascot_trio") {
    return "playful_mascot";
  }
  if (focusHint === "product_hero") {
    return "confident_presenter";
  }
  if (roles.some((r) => r.roleId === "CHEF_HOST")) {
    return "excited_seller";
  }
  if (roles.some((r) => r.roleId === "GARDEN_GUIDE")) {
    return "confident_presenter";
  }
  if (roles.some((r) => r.roleId === "DESIGN_CREATOR")) {
    return "energetic_creator";
  }
  return "confident_presenter";
}

/** Analyze scene from intent + filenames — runs client or server without vision API. */
export function analyzeSceneIntelligence(input: SceneIntelligenceInput): SceneIntelligenceSnapshot {
  const keywords = collectKeywords(input);
  const corpus = keywords.join(" ").toLowerCase();
  const detectedRoles = detectCharacterRoles({ corpus, imageCount: input.imageCount });
  const focusHint = detectFocusHint(detectedRoles, input);
  const mascotCount = detectedRoles.filter((r) =>
    ["CHEF_HOST", "GARDEN_GUIDE", "DESIGN_CREATOR"].includes(r.roleId)
  ).length;
  const hasTypography = (input.textBlockHints?.length ?? 0) > 0 || /\btext\b|\blogo\b|\bui\b/i.test(corpus);
  const hasProduct = /\bproduct\b|\bitem\b|\bprijs\b/i.test(corpus) || input.animationStyleId === "product_showcase";
  const hasCrowd = focusHint === "marketplace_crowd" || /\bcrowd\b|\bcommunity\b/i.test(corpus);

  return {
    version: 1,
    focusHint,
    detectedRoles,
    hasTypography,
    hasProduct,
    hasCrowd,
    mascotCount,
    resolvedEmotionalPreset: resolveEmotionalPresetForScene(
      input.animationStyleId,
      focusHint,
      detectedRoles
    ),
    keywords: keywords.slice(0, 12),
  };
}
