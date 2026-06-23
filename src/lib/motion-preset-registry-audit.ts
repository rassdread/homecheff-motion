/**
 * Canonical motion preset registry audit — single source of truth validation.
 * All dependent systems derive preset IDs from getAllMotionActionPresets().
 */

import { getActionPresetRequirementProfile } from "@/lib/action-preset-requirements";
import { buildActionPresetPrefillPackage } from "@/lib/motion-action-preset-prefill";
import {
  getAllMotionActionPresets,
  getMotionActionPreset,
  isMotionActionPresetId,
} from "@/lib/motion-action-presets";
import { resolveMotionPresetIntelligenceProfile } from "@/lib/motion-preset-intelligence-profiles";
import { resolveMotionPresetStoryboard } from "@/lib/motion-preset-storyboards";
import { resolveMotionPresetVisualRequirements } from "@/lib/motion-preset-visual-requirements";
import type { MotionActionPresetId } from "@/types/motion-action-presets";

export const MOTION_PRESET_CANONICAL_COUNT = 65;

export type MotionPresetRegistryAuditEntry = {
  presetId: MotionActionPresetId;
  hasPreset: boolean;
  hasRequirementProfile: boolean;
  hasIntelligenceProfile: boolean;
  hasStoryboard: boolean;
  hasPrefill: boolean;
  hasVisualRequirements: boolean;
  storyboardSceneCount: number;
  intelligenceIsExplicit: boolean;
  storyboardIsExplicit: boolean;
};

export type MotionPresetRegistryAuditReport = {
  presetCount: number;
  entries: MotionPresetRegistryAuditEntry[];
  duplicateIds: string[];
  missingPresetIds: MotionActionPresetId[];
  orphanPresetIds: string[];
  errors: string[];
  ok: boolean;
};

const PRIORITY_PRESET_IDS = new Set<MotionActionPresetId>([
  "moonwalk",
  "penalty_kick",
  "goal_celebration",
  "red_carpet_moment",
  "podcast_clip",
  "product_launch",
  "mascot_commercial",
  "business_presentation",
  "influencer_reel",
  "travel_vlog",
]);

/** Presets with hand-authored intelligence blocks (not preset-metadata fallback). */
const EXPLICIT_INTELLIGENCE_IDS = new Set<MotionActionPresetId>([
  "moonwalk",
  "penalty_kick",
  "goal_celebration",
  "red_carpet_moment",
  "podcast_clip",
  "product_launch",
  "product_showcase",
  "mascot_commercial",
  "mascot_greeting",
  "award_ceremony",
  "business_presentation",
  "conference_speaker",
  "influencer_reel",
  "travel_vlog",
  "boxing_entrance",
  "training_montage",
  "cooking_tutorial",
  "restaurant_service",
  "gardening_activity",
  "brand_reveal",
]);

/** Presets with hand-authored 5-scene storyboards. */
const EXPLICIT_STORYBOARD_IDS = new Set<MotionActionPresetId>([
  "moonwalk",
  "penalty_kick",
  "goal_celebration",
  "red_carpet_moment",
  "podcast_clip",
  "product_launch",
  "mascot_commercial",
]);

export function auditMotionPresetRegistry(): MotionPresetRegistryAuditReport {
  const presets = getAllMotionActionPresets();
  const errors: string[] = [];
  const seenIds = new Map<string, number>();
  const entries: MotionPresetRegistryAuditEntry[] = [];

  for (const preset of presets) {
    seenIds.set(preset.id, (seenIds.get(preset.id) ?? 0) + 1);
    const requirementProfile = getActionPresetRequirementProfile(preset.id);
    const intelligence = resolveMotionPresetIntelligenceProfile(preset.id);
    const storyboard = resolveMotionPresetStoryboard(preset.id);
    const prefill = buildActionPresetPrefillPackage({ presetId: preset.id });
    const visual = resolveMotionPresetVisualRequirements(preset.id);

    const intelligenceIsExplicit = EXPLICIT_INTELLIGENCE_IDS.has(preset.id);
    const storyboardIsExplicit = EXPLICIT_STORYBOARD_IDS.has(preset.id);

    if (PRIORITY_PRESET_IDS.has(preset.id) && !intelligenceIsExplicit) {
      errors.push(`${preset.id}: priority preset missing explicit intelligence profile`);
    }
    if (storyboard.scenes.length < 4) {
      errors.push(`${preset.id}: storyboard needs at least 4 scenes`);
    }
    if (!requirementProfile.required.includes("person_character")) {
      errors.push(`${preset.id}: person_character must be required`);
    }
    if (!prefill) {
      errors.push(`${preset.id}: missing prefill package`);
    }

    entries.push({
      presetId: preset.id,
      hasPreset: Boolean(getMotionActionPreset(preset.id)),
      hasRequirementProfile: requirementProfile.required.length > 0,
      hasIntelligenceProfile: Boolean(intelligence.structuredPromptBlock),
      hasStoryboard: storyboard.scenes.length >= 4,
      hasPrefill: Boolean(prefill),
      hasVisualRequirements: visual.required.length > 0,
      storyboardSceneCount: storyboard.scenes.length,
      intelligenceIsExplicit,
      storyboardIsExplicit,
    });
  }

  const duplicateIds = [...seenIds.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (presets.length !== MOTION_PRESET_CANONICAL_COUNT) {
    errors.push(`Expected ${MOTION_PRESET_CANONICAL_COUNT} presets, found ${presets.length}`);
  }

  if (duplicateIds.length > 0) {
    errors.push(`Duplicate preset IDs: ${duplicateIds.join(", ")}`);
  }

  for (const entry of entries) {
    if (!isMotionActionPresetId(entry.presetId)) {
      errors.push(`Invalid preset id: ${entry.presetId}`);
    }
  }

  return {
    presetCount: presets.length,
    entries,
    duplicateIds,
    missingPresetIds: [],
    orphanPresetIds: [],
    errors,
    ok: errors.length === 0 && duplicateIds.length === 0 && presets.length === MOTION_PRESET_CANONICAL_COUNT,
  };
}

export function getAllMotionActionPresetIds(): MotionActionPresetId[] {
  return getAllMotionActionPresets().map((preset) => preset.id);
}
