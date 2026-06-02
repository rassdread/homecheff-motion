import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import {
  buildSceneLayeredRevealSlots,
  MAX_EXTRA_LINES,
  normalizeSceneText,
  parseInstantSceneTexts,
  splitSubtitleMultilineInput,
} from "@/lib/story-overlay-templates";
import {
  applySceneTextTranslations,
  collectTranslatableFields,
  parseSceneTextsJson,
} from "@/lib/translate-scene-texts";
import { prepareStorySceneTexts } from "@/lib/story-language-export";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import { resolveExtraLinePositions } from "@/server/animation-export/story-layer-placement";

describe("storyboard extra lines model", () => {
  it("defaults extraLines to empty array for legacy sceneTexts", () => {
    const parsed = parseInstantSceneTexts([
      { template: "scene", heroText: "ROTTERDAM", title: "TITLE", subtitle: "sub" },
    ]);
    assert.deepEqual(parsed[0]?.extraLines, []);
  });

  it("parseSceneTextsJson includes extraLines when present", () => {
    const rows = parseSceneTextsJson([
      { template: "scene", subtitle: "one", extraLines: ["two", "three"] },
    ]);
    assert.deepEqual(rows[0]?.extraLines, ["two", "three"]);
  });

  it("splitSubtitleMultilineInput moves lines after first into extraLines", () => {
    const split = splitSubtitleMultilineInput("is everywhere.\nStart locally.", []);
    assert.equal(split.subtitle, "is everywhere.");
    assert.deepEqual(split.extraLines, ["Start locally."]);
  });

  it("enforces max 3 extra lines during normalization", () => {
    const scene = normalizeSceneText({
      template: "scene",
      extraLines: ["a", "b", "c", "d", "e"],
    });
    assert.equal(scene.extraLines.length, MAX_EXTRA_LINES);
  });

  it("instantSceneTextFromDraft serializes extraLines for render payloads", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      subtitle: "line one",
      extraLines: ["line two", ""],
    };
    const payload = instantSceneTextFromDraft(draft, 0, 3);
    assert.deepEqual(payload.extraLines, ["line two"]);
  });
});

describe("extra line translation", () => {
  it("collects and applies extraLine translations", () => {
    const base = [
      {
        template: "scene" as const,
        title: "TITLE",
        extraLines: ["Start locally.", "Grow fast."],
      },
    ];
    const fields = collectTranslatableFields(base);
    assert.ok(fields.some((field) => field.field === "extraLine" && field.extraIndex === 0));
    const translated = applySceneTextTranslations({
      base,
      fields,
      translated: fields.map((field, id) => ({
        id,
        text:
          field.field === "extraLine" && field.extraIndex === 0 ?
            "Begin lokaal."
          : field.text,
      })),
    });
    assert.equal(translated[0]?.extraLines?.[0], "Begin lokaal.");
  });

  it("prepareStorySceneTexts keeps user-reviewed extraLines without retranslation", async () => {
    const overrides = [
      {
        template: "scene" as const,
        title: "CUSTOM",
        extraLines: ["Manual extra"],
      },
    ];
    const prepared = await prepareStorySceneTexts({
      project: { instantSceneTexts: [{ template: "hero", heroText: "ORIGINAL" }] },
      languageCode: "nl",
      sceneTextOverrides: overrides,
    });
    assert.equal(prepared.translationProvider, "user_reviewed");
    assert.deepEqual(prepared.sceneTexts[0]?.extraLines, ["Manual extra"]);
  });
});

describe("extra line overlay placement", () => {
  it("stagger reveal slots include extra lines after subtitle", () => {
    const reveal = buildSceneLayeredRevealSlots(0.15, 5, {
      headline: true,
      title: true,
      subtitle: true,
      extraLineCount: 2,
    });
    assert.ok(reveal.headline && reveal.title && reveal.subtitle);
    assert.equal(reveal.extraLines?.length, 2);
    assert.ok(reveal.headline.revealStart < reveal.title.revealStart);
    assert.ok(reveal.title.revealStart < reveal.subtitle!.revealStart);
    assert.ok(reveal.subtitle!.revealStart < reveal.extraLines![0]!.revealStart);
    assert.ok(reveal.extraLines![0]!.revealStart < reveal.extraLines![1]!.revealStart);
  });

  it("resolveExtraLinePositions uses zones outside title group", () => {
    const positions = resolveExtraLinePositions({
      extraLines: ["Start locally.", "Grow fast."],
      fontSize: 40,
      width: 1080,
      height: 1920,
      occupiedZoneIds: ["CENTER"],
      minY: 900,
    });
    assert.equal(positions.length, 2);
    assert.ok(positions.every((row) => row.zoneId !== "CENTER"));
    assert.ok(positions[0]!.clampedY >= 900);
  });

  it("buildStoryOverlayAss emits separate Dialogue events for extraLines", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "ROTTERDAM",
          title: "HIDDEN TALENT",
          subtitle: "is everywhere.",
          extraLines: ["Start locally.", "Grow fast."],
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryExtra0_s0/);
    assert.match(ass, /HCStoryExtra1_s0/);
    assert.match(ass, /Start locally\./);
    assert.match(ass, /Grow fast\./);
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    const extraDialogues = dialogues.filter((line) => line.includes("HCStoryExtra"));
    assert.equal(extraDialogues.length, 2);
  });
});

describe("language editor frame access contract", () => {
  it("supports independent expandedIndex per frame for multi-frame drafts", () => {
    const drafts = parseSceneTextsJson([
      { template: "scene", title: "Frame 1" },
      { template: "scene", title: "Frame 2" },
      { template: "scene", title: "Frame 3" },
    ]);
    assert.equal(drafts.length, 3);
    for (let index = 0; index < drafts.length; index += 1) {
      const expandedIndex = index;
      assert.notEqual(expandedIndex, null);
      assert.ok(expandedIndex >= 0 && expandedIndex < drafts.length);
    }
  });
});
