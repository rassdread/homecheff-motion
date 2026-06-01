import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHeroLines,
  chooseTemplate,
  detectAccentWords,
  hasSceneOverlayContent,
  normalizeSceneText,
  sceneOverlayTiming,
} from "@/lib/story-overlay-templates";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

describe("story-overlay-templates", () => {
  it("auto chooses hero for short heroText", () => {
    const scene = normalizeSceneText({
      template: "auto",
      heroText: "Most people trade time for money",
    });
    assert.equal(chooseTemplate(scene), "hero");
  });

  it("auto chooses scene when title is set", () => {
    const scene = normalizeSceneText({
      template: "auto",
      title: "THE SYSTEM",
      subtitle: "Most people trade time for money",
    });
    assert.equal(chooseTemplate(scene), "scene");
  });

  it("auto chooses hero for short subtitle-only punchline", () => {
    const scene = normalizeSceneText({
      template: "auto",
      subtitle: "Most people trade time for money",
    });
    assert.equal(chooseTemplate(scene), "hero");
  });

  it("skips empty scene", () => {
    assert.equal(chooseTemplate(normalizeSceneText({})), "skip");
    assert.equal(hasSceneOverlayContent({}), false);
  });

  it("detectAccentWords picks MONEY from phrase", () => {
    const words = detectAccentWords("Most people trade time for money", { accentWords: [] });
    assert.ok(words.includes("MONEY"));
  });

  it("respects manual accentWords first", () => {
    const words = detectAccentWords("Hello world", { accentWords: ["WORLD"] });
    assert.deepEqual(words, ["WORLD"]);
  });

  it("preserves manual line breaks in buildHeroLines", () => {
    const lines = buildHeroLines("MOST PEOPLE\nTRADE TIME\nFOR MONEY");
    assert.deepEqual(lines, ["MOST PEOPLE", "TRADE TIME", "FOR MONEY"]);
  });

  it("splits five words 2/3", () => {
    const lines = buildHeroLines("most people trade time for");
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "MOST PEOPLE");
    assert.equal(lines[1], "TRADE TIME FOR");
  });

  it("uses 0.15s timing edges", () => {
    const t = sceneOverlayTiming(0, 3, 9);
    assert.equal(t.start, 0.15);
    assert.equal(t.end, 3 - 0.15);
    assert.equal(t.sceneDuration, 3);
  });
});

describe("buildStoryOverlayAss V2", () => {
  it("renders hero with fade tags and gold accent", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "hero",
          heroText: "Most people trade time for money",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /\\fad\(250,250\)/);
    assert.match(ass, /\\t\(0,500,\\fscx103\\fscy103\)/);
    assert.match(ass, /HCHeroMain/);
    assert.match(ass, /\\c&H0000B7F5&/);
    assert.match(ass, /MONEY/);
    assert.match(ass, /PlayResX: 1080/);
    assert.match(ass, /MarginV, Encoding/);
  });

  it("keeps scene title/subtitle layout", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "THE SYSTEM", subtitle: "Line one" }],
      durationSeconds: 6,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryTitle/);
    assert.match(ass, /THE SYSTEM/);
    assert.match(ass, /HCStorySubtitle/);
  });

  it("supports legacy title/subtitle without template", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ title: "LEGACY", subtitle: "Still works" }],
      durationSeconds: 4,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /LEGACY/);
    assert.match(ass, /Still works/);
  });
});
