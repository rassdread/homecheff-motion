import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTypographyToTheme,
  breakTextIntoLines,
  computeAvailableSpace,
  estimateTextLineWidthPx,
  isSideZone,
  LEGACY_HERO_SIZE_MAIN,
  resolveAdaptiveTypography,
  resolveTypographyFromPlacement,
} from "@/server/animation-export/adaptive-typography";
import { defaultV2OverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import { placementForZone } from "@/server/animation-export/safe-zone-placement";
import { buildHeroLines } from "@/lib/story-overlay-templates";
import { buildSequenceTiming } from "@/lib/story-overlay-templates";
import { resolveObjectAwarePlacement } from "@/server/animation-export/object-aware-placement";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import { analyzeSafeZonesFromBuffer } from "@/server/animation-export/safe-zone-placement";

const W = 1080;
const H = 1920;

function placement(zoneId: "TOP_CENTER" | "CENTER_RIGHT" | "TOP_RIGHT", score: number) {
  return placementForZone(zoneId, score, W, H);
}

describe("adaptive typography V1", () => {
  it("wide zone keeps short hero on one line", () => {
    const result = resolveAdaptiveTypography({
      text: "Hidden talent",
      template: "hero",
      frameWidth: W,
      frameHeight: H,
      selectedZone: "TOP_CENTER",
      safeZoneScore: 82,
      textWidthFraction: 0.9,
    });
    assert.equal(result.lines.length, 1);
    assert.ok(result.lines[0]!.includes("HIDDEN"));
    assert.ok(result.fontSize >= 100);
  });

  it("medium zone splits into two clean lines", () => {
    const p = placement("TOP_CENTER", 55);
    const space = computeAvailableSpace({
      frameWidth: W,
      frameHeight: H,
      selectedZone: p.zoneId,
      safeZoneScore: p.zoneScore,
      textWidthFraction: 0.55,
    });
    const lines = breakTextIntoLines({
      text: "Hidden talent is everywhere.",
      template: "hero",
      fontSize: 96,
      maxTextWidthPx: space.maxTextWidthPx,
    });
    assert.ok(lines.length >= 2);
    assert.ok(lines.join(" ").includes("HIDDEN"));
    assert.ok(lines.join(" ").includes("EVERYWHERE"));
  });

  it("narrow zone stacks words", () => {
    const p = placement("CENTER_RIGHT", 48);
    const result = resolveTypographyFromPlacement({
      text: "Hidden talent is everywhere.",
      template: "hero",
      placement: p,
      frameWidth: W,
      frameHeight: H,
      textWidthFraction: 0.38,
    });
    assert.ok(result.lines.length >= 2);
    assert.ok(isSideZone(p.zoneId));
  });

  it("hero finale creates dramatic multi-line layout", () => {
    const p = placement("TOP_CENTER", 72);
    const result = resolveTypographyFromPlacement({
      text: "THIS ISN'T JUST AN APP. IT'S A MOVEMENT.",
      template: "hero_finale",
      placement: p,
      frameWidth: W,
      frameHeight: H,
    });
    assert.ok(result.lines.length >= 3);
    assert.ok(result.lines.length <= 4);
  });

  it("never splits protected brand tokens", () => {
    const p = placement("TOP_CENTER", 70);
    const space = computeAvailableSpace({
      frameWidth: W,
      frameHeight: H,
      selectedZone: p.zoneId,
      safeZoneScore: 70,
      textWidthFraction: 0.4,
    });
    const lines = breakTextIntoLines({
      text: "Join HomeCheff today",
      template: "hero",
      fontSize: 72,
      maxTextWidthPx: space.maxTextWidthPx,
    });
    const joined = lines.join(" ");
    assert.ok(joined.includes("HOMECHEFF"));
    assert.equal(joined.includes("HOME CHEFF"), false);
  });

  it("reduces font before truncating long text", () => {
    const p = placement("TOP_CENTER", 60);
    const longText =
      "THIS IS A LONG HERO MESSAGE THAT SHOULD STILL FIT WITHOUT DROPPING WORDS";
    const result = resolveTypographyFromPlacement({
      text: longText,
      template: "hero",
      placement: p,
      frameWidth: W,
      frameHeight: H,
    });
    const allWords = longText.split(/\s+/);
    const rendered = result.lines.join(" ");
    for (const word of allWords) {
      assert.ok(rendered.includes(word), `missing word ${word}`);
    }
    assert.ok(result.fontSize <= LEGACY_HERO_SIZE_MAIN);
  });

  it("busy zone increases backdrop strength", () => {
    const p = placement("TOP_CENTER", 40);
    const calm = resolveAdaptiveTypography({
      text: "Earn more locally",
      template: "hero",
      frameWidth: W,
      frameHeight: H,
      selectedZone: p.zoneId,
      safeZoneScore: 75,
      isBusy: false,
    });
    const busy = resolveAdaptiveTypography({
      text: "Earn more locally",
      template: "hero",
      frameWidth: W,
      frameHeight: H,
      selectedZone: p.zoneId,
      safeZoneScore: 40,
      isBusy: true,
    });
    assert.equal(calm.backdropMode, "none");
    assert.ok(busy.backdropMode === "soft" || busy.backdropMode === "strong");
    assert.ok(
      busy.outlineStrength === "medium" || busy.outlineStrength === "strong"
    );
  });

  it("high confidence zone allows larger font", () => {
    const low = resolveAdaptiveTypography({
      text: "Earn",
      template: "hero",
      frameWidth: W,
      frameHeight: H,
      selectedZone: "TOP_CENTER",
      safeZoneScore: 42,
      textWidthFraction: 0.72,
    });
    const high = resolveAdaptiveTypography({
      text: "Earn",
      template: "hero",
      frameWidth: W,
      frameHeight: H,
      selectedZone: "TOP_CENTER",
      safeZoneScore: 82,
      textWidthFraction: 0.86,
    });
    assert.ok(high.fontSize >= low.fontSize);
  });

  it("sequence timing unchanged", () => {
    const slots = buildSequenceTiming(1, 9, 3);
    assert.equal(slots.length, 3);
    assert.ok(Math.abs(slots[0]!.start - 1) < 0.2);
    assert.ok(Math.abs(slots[2]!.end - 9) < 0.2);
  });

  it("falls back to buildHeroLines when adaptive input empty", () => {
    const legacy = buildHeroLines("ONE TWO THREE FOUR");
    assert.ok(legacy.length >= 1);
    const empty = breakTextIntoLines({
      text: "",
      template: "hero",
      fontSize: 100,
      maxTextWidthPx: 400,
    });
    assert.deepEqual(empty, []);
  });

  it("preserves accent phrase on one line when possible", () => {
    const p = placement("TOP_CENTER", 70);
    const space = computeAvailableSpace({
      frameWidth: W,
      frameHeight: H,
      selectedZone: p.zoneId,
      safeZoneScore: 70,
      textWidthFraction: 0.7,
    });
    const lines = breakTextIntoLines({
      text: "Hidden talent wins",
      template: "hero",
      fontSize: 100,
      maxTextWidthPx: space.maxTextWidthPx,
      accentWords: ["TALENT"],
    });
    const rendered = lines.join(" ");
    assert.ok(rendered.includes("HIDDEN") && rendered.includes("TALENT"));
    if (lines.length === 1) {
      assert.ok(lines[0]!.includes("HIDDEN TALENT"));
    }
  });

  it("applyTypographyToTheme strengthens outline on busy scenes", () => {
    const base = defaultV2OverlayTheme();
    const updated = applyTypographyToTheme(base, {
      fontSize: 90,
      lineHeight: 100,
      maxTextWidthPx: 600,
      maxLines: 3,
      lines: ["TEST"],
      alignment: "center",
      backdropMode: "strong",
      outlineStrength: "strong",
      confidence: 0.8,
      reason: "test",
    });
    assert.ok(updated.useBackdrop);
    assert.ok(updated.outline >= 8);
  });

  it("estimateTextLineWidthPx scales with font size", () => {
    const small = estimateTextLineWidthPx("HELLO", 40);
    const large = estimateTextLineWidthPx("HELLO", 80);
    assert.ok(large > small);
  });
});

describe("accent-aware object placement", () => {
  function makeQuietBuffer(): Buffer {
    const width = 63;
    const height = 63;
    const data = Buffer.alloc(width * height * 4, 0);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100;
      data[i + 1] = 100;
      data[i + 2] = 100;
      data[i + 3] = 255;
    }
    return data;
  }

  it("accent word Earn prefers device-adjacent zone when device detected", () => {
    const v1 = analyzeSafeZonesFromBuffer(makeQuietBuffer(), 63, 63, 4);
    const detection: SceneDetectionContext = {
      safeZoneV1: v1,
      mediaPipeDetections: [],
      objectDetections: [],
      combinedAvoidBoxes: [
        {
          label: "cell phone",
          confidence: 0.88,
          x: 0.55,
          y: 0.35,
          width: 0.2,
          height: 0.25,
        },
      ],
      objectLabels: ["cell phone"],
      failedDetectors: [],
    };
    const placement = resolveObjectAwarePlacement({
      sceneText: "Local marketplace story",
      accentWords: ["Earn"],
      template: "hero",
      detectionContext: detection,
      enhancedAnalysis: v1,
      width: W,
      height: H,
    });
    assert.ok(
      placement.placementReason.includes("accent") ||
        placement.placementReason.includes("earnings")
    );
  });

  it("low confidence falls back to safe zone", () => {
    const v1 = analyzeSafeZonesFromBuffer(makeQuietBuffer(), 63, 63, 4);
    const detection: SceneDetectionContext = {
      safeZoneV1: v1,
      mediaPipeDetections: [],
      objectDetections: [],
      combinedAvoidBoxes: [],
      objectLabels: [],
      failedDetectors: [],
    };
    const placement = resolveObjectAwarePlacement({
      sceneText: "Quiet scene",
      accentWords: ["Earn"],
      template: "hero",
      detectionContext: detection,
      enhancedAnalysis: v1,
      width: W,
      height: H,
    });
    assert.equal(placement.placementReason, "safe_zone_v1_fallback");
  });

  it("empty accentWords behave as before", () => {
    const v1 = analyzeSafeZonesFromBuffer(makeQuietBuffer(), 63, 63, 4);
    const detection: SceneDetectionContext = {
      safeZoneV1: v1,
      mediaPipeDetections: [],
      objectDetections: [],
      combinedAvoidBoxes: [],
      objectLabels: [],
      failedDetectors: [],
    };
    const withAccent = resolveObjectAwarePlacement({
      sceneText: "Food market",
      accentWords: [],
      template: "hero",
      detectionContext: detection,
      enhancedAnalysis: v1,
      width: W,
      height: H,
    });
    const without = resolveObjectAwarePlacement({
      sceneText: "Food market",
      template: "hero",
      detectionContext: detection,
      enhancedAnalysis: v1,
      width: W,
      height: H,
    });
    assert.equal(withAccent.zoneId, without.zoneId);
  });
});
