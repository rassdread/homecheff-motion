import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePremiumPolishProfile,
  parsePremiumPolishSettings,
} from "@/lib/premium-polish-settings";
import { DEFAULT_ANIMATION_STYLE_ID } from "@/lib/animation-style-presets";
import { DEFAULT_PREMIUM_POLISH_PRESET_ID } from "@/lib/premium-polish-presets";

describe("premium polish settings", () => {
  it("defaults to cartoon animation profile", () => {
    const profile = resolvePremiumPolishProfile(null);
    assert.equal(profile.animationStyleId, DEFAULT_ANIMATION_STYLE_ID);
    assert.equal(profile.premiumPresetId, DEFAULT_PREMIUM_POLISH_PRESET_ID);
    assert.equal(profile.motionEnergy, "expressive");
    assert.equal(profile.segmentTransitionType, "capcut_smooth");
    assert.equal(profile.assemblyMode, "raw_motion_concat");
    assert.equal(profile.textPreservation, true);
    assert.equal(profile.minimalCompositorPolish, false);
  });

  it("merges overrides with animation style from legacy preset", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      premiumPresetId: "luxury_glow",
      motionEnergy: "cinematic",
    });
    assert.equal(profile.animationStyleId, "product_showcase");
    assert.equal(profile.motionEnergy, "cinematic");
    assert.equal(profile.minimalCompositorPolish, true);
    assert.equal(profile.segmentTransitionType, "capcut_smooth");
  });

  it("parses manual foreground regions", () => {
    const parsed = parsePremiumPolishSettings({
      version: 1,
      manualForegroundRegions: [
        {
          id: "r1",
          role: "foreground_mascot",
          regionKind: "animated",
          bbox: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
        },
      ],
    });
    assert.equal(parsed.manualForegroundRegions?.length, 1);
    assert.equal(parsed.manualForegroundRegions?.[0]?.role, "foreground_mascot");
  });
});
