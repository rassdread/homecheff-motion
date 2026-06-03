import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHeroLines,
  buildSceneFieldRevealSlots,
  buildSceneLayeredRevealSlots,
  buildSequenceTiming,
  buildStagedRevealSlots,
  chooseTemplate,
  detectAccentWords,
  getSceneHeadline,
  getSceneTimingWindows,
  hasLayeredSceneContent,
  hasSceneOverlayContent,
  normalizeSceneText,
  parseSequenceLines,
  resolveSequenceLineStyle,
  sceneOverlayTiming,
  splitSequenceSceneTiming,
  STAGED_REVEAL_STEP_SEC,
  STORY_FINALE_MIN_VISIBLE_SEC,
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

  it("uses 0s start on first scene and 0.15s edge on later scenes", () => {
    const t = sceneOverlayTiming(0, 3, 9);
    assert.equal(t.start, 0);
    assert.equal(t.end, 3 - 0.15);
    const mid = sceneOverlayTiming(1, 3, 9);
    assert.equal(mid.start, 3 + 0.15);
    const last = sceneOverlayTiming(2, 3, 9);
    assert.equal(last.end, 9);
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

  it("buildSceneLayeredRevealSlots staggers headline → title → subtitle but keeps all visible until scene end", () => {
    const slots = buildSceneLayeredRevealSlots(0.15, 4.85, {
      headline: true,
      title: true,
      subtitle: true,
    });
    assert.ok(slots.headline);
    assert.ok(slots.title);
    assert.ok(slots.subtitle);
    assert.equal(slots.headline!.revealStart, 0.15);
    assert.equal(slots.headline!.visibleEnd, 4.85);
    assert.equal(slots.title!.visibleEnd, 4.85);
    assert.equal(slots.subtitle!.visibleEnd, 4.85);
    assert.equal(slots.title!.revealStart, 0.15 + STAGED_REVEAL_STEP_SEC);
    assert.equal(slots.subtitle!.revealStart, 0.15 + STAGED_REVEAL_STEP_SEC * 2);
  });

  it("buildSceneFieldRevealSlots staggers title before subtitle on a 5s window", () => {
    const slots = buildSceneFieldRevealSlots(0.15, 4.85, { title: true, subtitle: true });
    assert.ok(slots.title);
    assert.ok(slots.subtitle);
    assert.equal(slots.title!.revealStart, 0.15);
    assert.equal(slots.subtitle!.revealStart, 0.15 + STAGED_REVEAL_STEP_SEC);
    assert.notEqual(slots.title!.revealStart, slots.subtitle!.revealStart);
  });

  it("auto chooses scene when koptekst + title + subtitle are filled", () => {
    const scene = normalizeSceneText({
      template: "auto",
      heroText: "Rotterdam",
      title: "Hidden talent",
      subtitle: "is everywhere.",
    });
    assert.equal(chooseTemplate(scene), "scene");
    assert.equal(getSceneHeadline(scene), "ROTTERDAM");
    assert.ok(hasLayeredSceneContent(scene));
  });

  it("scene template includes koptekst-only content", () => {
    const scene = normalizeSceneText({
      template: "scene",
      heroText: "LOCAL FOOD",
    });
    assert.equal(chooseTemplate(scene), "scene");
  });

  it("getSceneTimingWindows creates N windows for N storyboard frames", () => {
    const scenes = [
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      {},
    ];
    const windows = getSceneTimingWindows(scenes, 12, 3);
    assert.equal(windows.length, 3);
    assert.ok(windows[2]!.end > windows[2]!.start);
    assert.ok(windows[2]!.sceneDuration >= STORY_FINALE_MIN_VISIBLE_SEC - 0.01);
  });

  it("splitSequenceSceneTiming keeps hero finale at least 2s when possible", () => {
    const split = splitSequenceSceneTiming(0, 8, true);
    assert.ok(split.finaleEnd - split.finaleStart >= STORY_FINALE_MIN_VISIBLE_SEC - 0.01);
  });

  it("buildStagedRevealSlots compresses steps on short windows", () => {
    const slots = buildStagedRevealSlots(0, 2, 3);
    assert.equal(slots.length, 3);
    assert.ok(slots[1]!.revealStart - slots[0]!.revealStart < STAGED_REVEAL_STEP_SEC);
    assert.equal(slots[2]!.visibleEnd, 2);
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
    assert.match(ass, /\\fad\(220,0\)/);
    assert.match(ass, /\\move\(/);
    assert.match(ass, /\\t\(0,480,\\fscx102\\fscy102\)/);
    assert.match(ass, /HCHeroMain/);
    assert.match(ass, /\\c&H0000B7F5&/);
    assert.match(ass, /MONEY/);
    assert.match(ass, /PlayResX: 1080/);
    assert.match(ass, /MarginV, Encoding/);
  });

  it("renders koptekst + title + subtitle as three layers (Rotterdam case)", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "Rotterdam",
          title: "Hidden talent",
          subtitle: "is everywhere.",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryHeadline/);
    assert.match(ass, /ROTTERDAM/);
    assert.match(ass, /HIDDEN TALENT/);
    assert.match(ass, /is everywhere/);
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    assert.equal(
      dialogues.filter(
        (line) =>
          line.includes("ROTTERDAM") ||
          line.includes("HIDDEN TALENT") ||
          line.includes("is everywhere")
      ).length,
      3
    );
  });

  it("headline style is larger than title style", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "ROTTERDAM",
          title: "HIDDEN TALENT",
          subtitle: "is everywhere.",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const headlineStyle = ass
      .split("\n")
      .find((line) => line.startsWith("Style: HCStoryHeadline_s0"));
    const titleStyle = ass.split("\n").find((line) => line.startsWith("Style: HCStoryTitle_s0"));
    assert.ok(headlineStyle);
    assert.ok(titleStyle);
    const headlineSize = Number(headlineStyle!.split(",")[2]);
    const titleSize = Number(titleStyle!.split(",")[2]);
    assert.ok(headlineSize > titleSize);
  });

  it("keeps scene title/subtitle layout with staged reveal times", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "THE SYSTEM", subtitle: "Line one" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryTitle/);
    assert.match(ass, /THE SYSTEM/);
    assert.match(ass, /HCStorySubtitle/);
    assert.match(ass, /\\move\(/);
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    const titleLine = dialogues.find((line) => line.includes("THE SYSTEM"));
    const subtitleLine = dialogues.find((line) => line.includes("Line one"));
    assert.ok(titleLine);
    assert.ok(subtitleLine);
    const titleStart = titleLine!.split(",")[1]!;
    const subtitleStart = subtitleLine!.split(",")[1]!;
    assert.notEqual(titleStart, subtitleStart);
  });

  it("three-frame story creates three overlay timing windows", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { heroText: "ONE", title: "A", subtitle: "a" },
        { heroText: "TWO", title: "B", subtitle: "b" },
        { heroText: "THREE", title: "C", subtitle: "c" },
      ],
      durationSeconds: 9,
      width: 1080,
      height: 1920,
    });
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    assert.ok(dialogues.some((line) => line.includes("ONE")));
    assert.ok(dialogues.some((line) => line.includes("TWO")));
    assert.ok(dialogues.some((line) => line.includes("THREE")));
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

  it("staggers hero lines instead of one static block", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "hero",
          heroText: "MOST PEOPLE\nTRADE TIME\nFOR MONEY",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    assert.ok(dialogues.length >= 3);
    const starts = dialogues.map((line) => line.split(",")[1]!);
    assert.notEqual(starts[0], starts[1]);
    assert.notEqual(starts[1], starts[2]);
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
  it("staggers hero finale lines within the finale window", () => {
    const scene = normalizeSceneText({
      template: "sequence",
      lines: ["Build", "The", "Story"],
      heroFinaleText: "LINE ONE\nLINE TWO",
    });
    const events = buildSequenceAssEvents({
      scene,
      sceneStart: 0,
      sceneEnd: 5,
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
    const finaleEvents = events.filter((ev) => ev.text.includes("LINE"));
    assert.equal(finaleEvents.length, 2);
    assert.notEqual(finaleEvents[0]!.start, finaleEvents[1]!.start);
  });

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
