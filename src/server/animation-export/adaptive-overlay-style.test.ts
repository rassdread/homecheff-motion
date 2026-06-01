import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseAdaptiveOverlayTheme,
  defaultV2OverlayTheme,
  hexToAssColor,
  resolveSceneOverlayTheme,
  type AdaptiveOverlayTheme,
} from "@/server/animation-export/adaptive-overlay-style";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

describe("adaptive-overlay-style", () => {
  it("hexToAssColor converts HomeCheff green to BGR ASS", () => {
    assert.equal(hexToAssColor("#006D52"), "&H00526D00&");
  });

  it("hexToAssColor converts gold accent", () => {
    assert.equal(hexToAssColor("#F5B700"), "&H0000B7F5&");
  });

  it("chooseAdaptiveOverlayTheme dark luma", () => {
    const theme = chooseAdaptiveOverlayTheme({ luma: 80, stddev: 30, avgR: 0, avgG: 0, avgB: 0 });
    assert.equal(theme.mode, "dark");
    assert.equal(theme.primaryColorAss, "&H00FFFFFF");
    assert.equal(theme.accentColorAss, "&H0000B7F5");
    assert.equal(theme.outlineColorAss, "&H00526D00");
    assert.equal(theme.useBackdrop, false);
  });

  it("chooseAdaptiveOverlayTheme light luma", () => {
    const theme = chooseAdaptiveOverlayTheme({
      luma: 190,
      stddev: 30,
      avgR: 200,
      avgG: 200,
      avgB: 200,
    });
    assert.equal(theme.mode, "light");
    assert.equal(theme.primaryColorAss, "&H00111111");
    assert.equal(theme.accentColorAss, "&H00B16700");
    assert.equal(theme.outlineColorAss, "&H00FFFFFF");
  });

  it("chooseAdaptiveOverlayTheme mixed luma", () => {
    const theme = chooseAdaptiveOverlayTheme({
      luma: 120,
      stddev: 40,
      avgR: 100,
      avgG: 100,
      avgB: 100,
    });
    assert.equal(theme.mode, "mixed");
    assert.equal(theme.primaryColorAss, "&H00FFFFFF");
  });

  it("chooseAdaptiveOverlayTheme busy contrast enables backdrop", () => {
    const theme = chooseAdaptiveOverlayTheme({
      luma: 80,
      stddev: 60,
      avgR: 0,
      avgG: 0,
      avgB: 0,
    });
    assert.equal(theme.isBusy, true);
    assert.equal(theme.useBackdrop, true);
    assert.ok(theme.outline >= 6);
  });

  it("mixed high contrast gets subtle backdrop", () => {
    const theme = chooseAdaptiveOverlayTheme({
      luma: 130,
      stddev: 58,
      avgR: 0,
      avgG: 0,
      avgB: 0,
    });
    assert.equal(theme.mode, "mixed");
    assert.equal(theme.useBackdrop, true);
    assert.ok(theme.backdropOpacity > 0);
  });

  it("resolveSceneOverlayTheme falls back to V2 without throwing", () => {
    const theme = resolveSceneOverlayTheme(undefined, 0);
    const v2 = defaultV2OverlayTheme();
    assert.equal(theme.primaryColorAss, v2.primaryColorAss);
    assert.equal(theme.accentColorAss, v2.accentColorAss);
  });

  it("resolveSceneOverlayTheme uses null entry as V2 fallback", () => {
    const map = new Map<number, AdaptiveOverlayTheme | null>([[0, null]]);
    const theme = resolveSceneOverlayTheme(map, 0);
    assert.equal(theme.primaryColorAss, defaultV2OverlayTheme().primaryColorAss);
  });
});

describe("buildStoryOverlayAss adaptive colors", () => {
  it("uses per-scene adaptive styles in ASS", () => {
    const lightTheme = chooseAdaptiveOverlayTheme({
      luma: 200,
      stddev: 20,
      avgR: 0,
      avgG: 0,
      avgB: 0,
    });
    const themeByIndex = new Map([[0, lightTheme]]);
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "TRADE TIME FOR MONEY" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      themeByIndex,
    });
    assert.match(ass, /HCHeroMain_s0/);
    assert.match(ass, /&H00111111&/);
    assert.match(ass, /&H00B16700&/);
    assert.match(ass, /\\fad\(250,250\)/);
    assert.match(ass, /PlayResX: 1080/);
    assert.match(ass, /MarginV, Encoding/);
  });

  it("busy theme uses BorderStyle 3 boxed backdrop", () => {
    const busy = chooseAdaptiveOverlayTheme({
      luma: 70,
      stddev: 62,
      avgR: 0,
      avgG: 0,
      avgB: 0,
    });
    assert.equal(busy.useBackdrop, true);
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "TEST", subtitle: "LINE" }],
      durationSeconds: 6,
      width: 1080,
      height: 1920,
      themeByIndex: new Map([[0, busy]]),
    });
    assert.match(ass, /,3,/);
    assert.match(ass, /&H80000000/);
  });
});
