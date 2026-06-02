import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHeroLines,
  buildSequenceTiming,
  chooseTemplate,
  detectAccentWords,
  hasSceneOverlayContent,
  normalizeSceneText,
  parseSequenceLines,
  resolveSequenceLineStyle,
  sceneOverlayTiming,
} from "@/lib/story-overlay-templates";
import { defaultV2OverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import { buildSequenceAssEvents } from "@/server/animation-export/story-sequence-overlay";
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

  it("buildSequenceTiming splits scene evenly with padding", () => {
    const slots = buildSequenceTiming(0, 5, 4);
    assert.equal(slots.length, 4);
    assert.equal(slots[0]!.lineDuration, 1.25);
    assert.equal(slots[0]!.start, 0.1);
    assert.equal(slots[0]!.end, 1.15);
    assert.equal(slots[3]!.start, 3.85);
    assert.equal(slots[3]!.end, 4.9);
  });

  it("auto template chooses sequence when multiple lines", () => {
    const scene = normalizeSceneText({
      template: "auto",
      lines: ["People know people.", "People know customers."],
    });
    assert.equal(chooseTemplate(scene), "sequence");
  });

  it("single line in auto resolves to hero not sequence", () => {
    const scene = normalizeSceneText({
      template: "auto",
      lines: ["People know people."],
    });
    assert.equal(chooseTemplate(scene), "hero");
  });

  it("hero finale promotes last line to hero and earlier to hero small", () => {
    const scene = normalizeSceneText({
      template: "sequence",
      lines: ["One", "Two", "Three", "Finale line here"],
      heroFinale: true,
    });
    assert.equal(
      resolveSequenceLineStyle(scene.lines[0]!, 0, 4, scene),
      "hero_small"
    );
    assert.equal(
      resolveSequenceLineStyle(scene.lines[3]!, 3, 4, scene),
      "hero"
    );
  });

  it("autoSequenceLineStyle maps word counts", () => {
    const scene = normalizeSceneText({
      template: "sequence",
      lines: ["People know people."],
      heroFinale: false,
    });
    assert.equal(
      resolveSequenceLineStyle(scene.lines[0]!, 0, 1, scene),
      "hero"
    );
    const long = normalizeSceneText({
      template: "sequence",
      lines: [
        "Your community is more valuable than you ever think possible.",
        "Second line",
      ],
      heroFinale: false,
    });
    assert.equal(
      resolveSequenceLineStyle(long.lines[0]!, 0, 2, long),
      "scene"
    );
    const longSingle = normalizeSceneText({
      template: "sequence",
      lines: ["Your community is more valuable than you ever think possible."],
      heroFinale: false,
    });
    assert.equal(
      resolveSequenceLineStyle(longSingle.lines[0]!, 0, 1, longSingle),
      "scene"
    );
  });

  it("parseSequenceLines ignores empty entries", () => {
    const lines = parseSequenceLines(["", "  ", "Keep me", { text: "" }, { text: "Also" }]);
    assert.equal(lines.length, 2);
    assert.equal(lines[0]!.text, "Keep me");
    assert.equal(lines[1]!.text, "Also");
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

  it("renders sequence template with staggered dialogue times", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "sequence",
          lines: [
            "People know people.",
            "People know customers.",
            "Your community is more valuable than you think.",
          ],
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const dialogues = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    assert.ok(dialogues.length >= 3);
    assert.match(ass, /PEOPLE KNOW/);
    assert.match(ass, /CUSTOMERS/);
    assert.match(ass, /COMMUNITY/);
    assert.match(ass, /HCHeroSmall_s0/);
    assert.match(ass, /HCHeroMain_s0/);
  });

  it("sequence inherits per-scene adaptive style names", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "sequence",
          lines: ["Line one.", "Line two."],
        },
      ],
      durationSeconds: 4,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCHeroMain_s0/);
    assert.match(ass, /HCHeroSmall_s0/);
    assert.match(ass, /HCStoryTitle_s0/);
  });
});

describe("buildSequenceAssEvents", () => {
  it("emits one event per non-empty line", () => {
    const scene = normalizeSceneText({
      template: "sequence",
      lines: ["Alpha", "", "Beta"],
    });
    const events = buildSequenceAssEvents({
      scene,
      sceneStart: 0,
      sceneEnd: 3,
      width: 1080,
      height: 1920,
      styleNames: {
        heroMain: "HCHeroMain_s0",
        heroSmall: "HCHeroSmall_s0",
        title: "HCStoryTitle_s0",
        subtitle: "HCStorySubtitle_s0",
      },
      theme: defaultV2OverlayTheme(),
      assTime: (s) => String(s),
      escapeAssText: (t) => t,
      heroLineWithAccents: (line) => line,
      motionTags: () => "",
    });
    assert.equal(events.length, 2);
    assert.ok(events[0]!.end <= events[1]!.start + 0.01);
  });
});
