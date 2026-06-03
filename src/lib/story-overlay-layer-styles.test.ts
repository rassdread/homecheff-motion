import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasCustomOverlayLayerStyles,
  isLayerStyleCustomized,
  sanitizeOverlayLayerStyles,
  validateLayerStyleOverrides,
} from "@/lib/story-overlay-layer-styles";
import {
  applyLayerFontSize,
  enforceReadableTheme,
  mergeLayerStyleIntoTheme,
} from "@/lib/story-overlay-layer-styles-theme";
import { defaultV2OverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import { yForPositionPreference } from "@/server/animation-export/story-overlay-layout-bands";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";

describe("story overlay layer styles", () => {
  it("empty styles are not custom and sanitize to {}", () => {
    assert.equal(hasCustomOverlayLayerStyles({}), false);
    assert.equal(hasCustomOverlayLayerStyles(undefined), false);
    assert.deepEqual(sanitizeOverlayLayerStyles(null), {});
  });

  it("detects customized layer fields", () => {
    assert.equal(isLayerStyleCustomized({ fontSize: "smaller" }), true);
    assert.equal(isLayerStyleCustomized({ useAuto: true }), false);
    assert.equal(isLayerStyleCustomized({ position: "auto" }), false);
    assert.equal(isLayerStyleCustomized({ position: "top" }), true);
  });

  it("merges text color and backdrop off into theme", () => {
    const base = defaultV2OverlayTheme();
    const themed = mergeLayerStyleIntoTheme(base, {
      textColor: "#FF0000",
      backdropEnabled: false,
      shadow: "none",
      outline: "none",
    });
    assert.match(themed.primaryColorAss, /&H/i);
    assert.equal(themed.useBackdrop, false);
    const readable = enforceReadableTheme(themed);
    assert.ok(readable.outline > 0 || readable.shadow > 0);
  });

  it("scales font size presets and caps custom size", () => {
    const base = 60;
    const smaller = applyLayerFontSize(base, "title", { fontSize: "smaller" }, 1080, 1920);
    const larger = applyLayerFontSize(base, "title", { fontSize: "larger" }, 1080, 1920);
    assert.ok(smaller < larger);
    const custom = applyLayerFontSize(base, "title", { fontSize: "custom", fontSizeCustomPx: 200 }, 1080, 1920);
    assert.ok(custom <= 78);
  });

  it("position preference maps to band anchor Y", () => {
    const autoY = yForPositionPreference("auto", 500, 1920);
    assert.equal(autoY, 500);
    const topY = yForPositionPreference("top", 500, 1920);
    assert.ok(topY < 500);
    const bottomY = yForPositionPreference("bottom", 500, 1920);
    assert.ok(bottomY > 500);
  });

  it("warns on low contrast without backdrop helpers", () => {
    const warnings = validateLayerStyleOverrides(
      {
        title: { backdropEnabled: false, shadow: "none", outline: "none" },
      },
      1920
    );
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]!.code, "low_contrast_no_backdrop");
  });

  it("legacy projects without overlayLayerStyles render unchanged ASS", () => {
    const baseline = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          title: "Title line",
          subtitle: "Subtitle line",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const withEmptyStyles = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          title: "Title line",
          subtitle: "Subtitle line",
          overlayLayerStyles: {},
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.equal(baseline, withEmptyStyles);
  });

  it("custom title color appears in ASS style row", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          title: "Title line",
          subtitle: "Subtitle line",
          overlayLayerStyles: {
            title: { textColor: "#00FF00" },
          },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryTitle_s0/);
    assert.match(ass, /&H00FF00&|&H0000FF00&/i);
  });

  it("smaller headline font size is reflected in ASS", () => {
    const normal = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          title: "Title",
          overlayLayerStyles: { headline: { fontSize: "normal" } },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const smaller = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          title: "Title",
          overlayLayerStyles: { headline: { fontSize: "smaller" } },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const normalMatch = normal.match(/HCStoryHeadline_s0,Arial Black,(\d+)/);
    const smallerMatch = smaller.match(/HCStoryHeadline_s0,Arial Black,(\d+)/);
    assert.ok(normalMatch && smallerMatch);
    assert.ok(Number(smallerMatch[1]) < Number(normalMatch[1]));
  });

  it("includes overlayLayerStyles in first-render create payload when customized", () => {
    const draft = {
      ...emptySceneTextDraft(),
      heroText: "HEADLINE",
      title: "Title",
      overlayLayerStyles: { title: { textColor: "#FF00FF" } },
    };
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.deepEqual(payload.overlayLayerStyles, { title: { textColor: "#FF00FF" } });
  });
});
