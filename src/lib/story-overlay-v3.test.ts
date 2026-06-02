import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSceneLayeredRevealSlots,
  getSceneTimingWindows,
  normalizeSceneText,
  resolveSceneOverlayVisibleEnd,
  STAGED_REVEAL_STEP_SEC,
} from "@/lib/story-overlay-templates";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import {
  applySceneTextTranslations,
  collectTranslatableFields,
  parseSceneTextsJson,
} from "@/lib/translate-scene-texts";
import { prepareStorySceneTexts } from "@/lib/story-language-export";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import { resolveExtraLinePositions } from "@/server/animation-export/story-layer-placement";
import {
  VIDEO_PREVIEW_MAIN_FRAME_CLASS,
  VIDEO_PREVIEW_VERSION_FRAME_CLASS,
} from "@/components/ui/video-preview";

describe("story overlay v3 timing", () => {
  it("headline starts at sceneStart and stays until sceneEnd", () => {
    const slots = buildSceneLayeredRevealSlots(0, 5, {
      headline: true,
      title: true,
      subtitle: true,
    });
    assert.equal(slots.headline!.revealStart, 0);
    assert.equal(slots.headline!.visibleEnd, 5);
    assert.equal(slots.title!.revealStart, STAGED_REVEAL_STEP_SEC);
    assert.equal(slots.subtitle!.revealStart, STAGED_REVEAL_STEP_SEC * 2);
  });

  it("resolveSceneOverlayVisibleEnd extends final scene to video end", () => {
    assert.equal(
      resolveSceneOverlayVisibleEnd({
        sceneIndex: 2,
        sceneCount: 3,
        sceneEnd: 8.85,
        videoEnd: 9,
      }),
      9
    );
    assert.equal(
      resolveSceneOverlayVisibleEnd({
        sceneIndex: 0,
        sceneCount: 3,
        sceneEnd: 2.85,
        videoEnd: 9,
      }),
      2.85
    );
  });

  it("final scene ASS dialogue ends at video duration", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", title: "FRAME ONE" },
        { template: "scene", title: "FINALE", subtitle: "LAST" },
      ],
      durationSeconds: 10,
      width: 1080,
      height: 1920,
    });
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:") && line.includes("FINALE"));
    assert.ok(dialogues.length > 0);
    for (const line of dialogues) {
      const end = line.match(/^Dialogue: 0,\d+:\d+:\d+\.\d+,(\d+:\d+:\d+\.\d+),/)?.[1];
      assert.equal(end, "0:00:10.00");
    }
  });
});

describe("story overlay v3 finale footer", () => {
  it("renders finale footer on final scene only", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", heroText: "HOMECHEFF", title: "LOCAL TALENT", subtitle: "IS EVERYWHERE." },
        {
          template: "scene",
          heroText: "HOMECHEFF",
          title: "LOCAL TALENT",
          subtitle: "IS EVERYWHERE.",
          finaleFooter: "homecheff.eu",
        },
      ],
      durationSeconds: 10,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HCStoryFooter_s1/);
    assert.match(ass, /homecheff\.eu/);
    const footerLines = ass
      .split("\n")
      .filter((line) => line.startsWith("Dialogue:") && line.includes("HCStoryFooter_s1"));
    assert.equal(footerLines.length, 1);
    assert.match(footerLines[0]!, /0:00:10\.00/);
  });

  it("extraLines avoid bottom footer zones when finaleFooter is set", () => {
    const positions = resolveExtraLinePositions({
      extraLines: ["Start local.", "Grow fast."],
      fontSize: 40,
      width: 1080,
      height: 1920,
      occupiedZoneIds: ["CENTER", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"],
      minY: 400,
    });
    assert.ok(positions.every((row) => !row.zoneId.startsWith("BOTTOM_")));
  });

  it("translates finaleFooter and preserves user-reviewed footer", async () => {
    const fields = collectTranslatableFields([
      { template: "scene", finaleFooter: "Download the app" },
    ]);
    assert.ok(fields.some((field) => field.field === "finaleFooter"));
    const translated = applySceneTextTranslations({
      base: [{ template: "scene", finaleFooter: "Download the app" }],
      fields,
      translated: [{ id: 0, text: "Download de app" }],
    });
    assert.equal(translated[0]?.finaleFooter, "Download de app");

    const prepared = await prepareStorySceneTexts({
      project: { instantSceneTexts: [{ template: "scene", finaleFooter: "Original" }] },
      languageCode: "nl",
      sceneTextOverrides: [{ template: "scene", finaleFooter: "homecheff.eu" }],
    });
    assert.equal(prepared.sceneTexts[0]?.finaleFooter, "homecheff.eu");
  });

  it("language export payload includes finaleFooter", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      finaleFooter: "homecheff.eu",
    };
    const payload = instantSceneTextFromDraft(draft, 2, 3);
    assert.equal(payload.finaleFooter, "homecheff.eu");
    const parsed = parseSceneTextsJson([payload]);
    assert.equal(parsed[0]?.finaleFooter, "homecheff.eu");
  });

  it("legacy sceneTexts without finaleFooter still render", () => {
    const scene = normalizeSceneText({ template: "scene", title: "LEGACY" });
    assert.equal(scene.finaleFooter, "");
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "LEGACY" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /LEGACY/);
    assert.doesNotMatch(ass, /HCStoryFooter/);
  });
});

describe("video preview viewport caps v3", () => {
  it("uses 60vh mobile, 50vh tablet, 40vh desktop caps", () => {
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /max-h-\[60vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /md:max-h-\[50vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /lg:max-h-\[40vh\]/);
    assert.match(VIDEO_PREVIEW_VERSION_FRAME_CLASS, /lg:max-h-\[40vh\]/);
  });

  it("getSceneTimingWindows last window ends at total duration", () => {
    const windows = getSceneTimingWindows(
      [{ template: "scene" }, { template: "scene" }, { template: "scene" }],
      12,
      3
    );
    assert.equal(windows[2]!.end, 12);
  });
});
