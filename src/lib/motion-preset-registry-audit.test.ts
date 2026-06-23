import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditMotionPresetRegistry,
  getAllMotionActionPresetIds,
  MOTION_PRESET_CANONICAL_COUNT,
} from "@/lib/motion-preset-registry-audit";
import { validateActionPresetRequirementProfiles } from "@/lib/action-preset-requirements";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";

describe("motion preset registry audit", () => {
  it("validates all canonical presets", () => {
    const report = auditMotionPresetRegistry();
    assert.equal(report.presetCount, MOTION_PRESET_CANONICAL_COUNT);
    assert.equal(report.entries.length, MOTION_PRESET_CANONICAL_COUNT);
    assert.equal(report.duplicateIds.length, 0);
    assert.equal(report.ok, true, report.errors.join("; "));
  });

  it("requirement profiles cover every preset", () => {
    const profileErrors = validateActionPresetRequirementProfiles();
    assert.equal(profileErrors.length, 0, profileErrors.join("; "));
    const ids = getAllMotionActionPresetIds();
    assert.equal(ids.length, getAllMotionActionPresets().length);
  });

  it("every preset has prefill, storyboard, and intelligence", () => {
    const report = auditMotionPresetRegistry();
    for (const entry of report.entries) {
      assert.equal(entry.hasPreset, true, entry.presetId);
      assert.equal(entry.hasRequirementProfile, true, entry.presetId);
      assert.equal(entry.hasIntelligenceProfile, true, entry.presetId);
      assert.equal(entry.hasStoryboard, true, entry.presetId);
      assert.equal(entry.hasPrefill, true, entry.presetId);
      assert.equal(entry.hasVisualRequirements, true, entry.presetId);
      assert.ok(entry.storyboardSceneCount >= 4, entry.presetId);
    }
  });
});
