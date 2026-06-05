import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  footerLinesForEditor,
  hasFooterContent,
  MAX_FOOTER_LINES,
  moveFooterLine,
  parseFooterLinesFromScene,
  syncFooterPersistence,
} from "@/lib/footer-lines";
import { buildStoryboardOverlayPreviewLines } from "@/lib/storyboard-overlay-preview";
import { emptySceneTextDraft } from "@/lib/instant-scene-text-draft-model";
import {
  instantSceneTextFromDraft,
  instantSceneTextsFromDrafts,
} from "@/lib/instant-scene-text-draft";
import { sceneTextToDraft } from "@/lib/instant-scene-text-editor";
import {
  applySceneTextTranslations,
  collectTranslatableFields,
  parseSceneTextsJson,
} from "@/lib/translate-scene-texts";
import { normalizeSceneText } from "@/lib/story-overlay-templates";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

describe("footer-lines", () => {
  it("maps legacy finaleFooter to a single footer line", () => {
    const lines = parseFooterLinesFromScene({ finaleFooter: "homecheff.eu Join the movement." });
    assert.deepEqual(lines, ["homecheff.eu Join the movement."]);
  });

  it("prefers footerLines over legacy finaleFooter", () => {
    const lines = parseFooterLinesFromScene({
      finaleFooter: "legacy",
      footerLines: ["homecheff.eu", "Join the movement."],
    });
    assert.deepEqual(lines, ["homecheff.eu", "Join the movement."]);
  });

  it("ignores empty footer lines and trims whitespace", () => {
    const synced = syncFooterPersistence(["  homecheff.eu  ", "", "  ", "Join the movement."]);
    assert.deepEqual(synced.footerLines, ["homecheff.eu", "Join the movement."]);
    assert.equal(synced.finaleFooter, "homecheff.eu");
  });

  it("caps footer lines at six", () => {
    const synced = syncFooterPersistence(
      Array.from({ length: 8 }, (_, index) => `Line ${index + 1}`)
    );
    assert.equal(synced.footerLines.length, MAX_FOOTER_LINES);
    assert.equal(synced.footerLines[0], "Line 1");
    assert.equal(synced.footerLines[5], "Line 6");
  });

  it("reorders footer lines", () => {
    const next = moveFooterLine(["a", "b", "c"], 2, 0);
    assert.deepEqual(next, ["c", "a", "b"]);
  });

  it("editor shows one empty row when no footer content", () => {
    assert.deepEqual(footerLinesForEditor({}), [""]);
  });

  it("preview emits one line per footer row on final frame", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      footerLines: ["homecheff.eu", "Join the movement.", "Create. Share. Earn."],
      finaleFooter: "homecheff.eu",
    };
    const preview = buildStoryboardOverlayPreviewLines(draft, { isFinalFrame: true });
    const footerPreview = preview.filter((line) => line.kind === "footer");
    assert.equal(footerPreview.length, 3);
    assert.equal(footerPreview[0]?.text, "homecheff.eu");
    assert.equal(footerPreview[2]?.text, "Create. Share. Earn.");
  });

  it("overlay renders stacked footer lines in one dialogue event", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", title: "ONE" },
        {
          template: "scene",
          title: "FINAL",
          footerLines: ["homecheff.eu", "Join the movement."],
        },
      ],
      durationSeconds: 10,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /homecheff\.eu\\NJoin the movement\./);
  });

  it("draft round-trip persists footerLines and legacy finaleFooter", () => {
    const draft = sceneTextToDraft(
      normalizeSceneText({
        template: "scene",
        footerLines: ["homecheff.eu", "Join the movement."],
      })
    );
    assert.deepEqual(draft.footerLines, ["homecheff.eu", "Join the movement."]);
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.deepEqual(payload.footerLines, ["homecheff.eu", "Join the movement."]);
    assert.equal(payload.finaleFooter, "homecheff.eu");
    const parsed = parseSceneTextsJson([payload]);
    assert.deepEqual(parsed[0]?.footerLines, ["homecheff.eu", "Join the movement."]);
  });

  it("language export translates each footer line", () => {
    const fields = collectTranslatableFields([
      {
        template: "scene",
        footerLines: ["Download the app", "Join the movement."],
      },
    ]);
    assert.equal(fields.filter((field) => field.field === "footerLine").length, 2);
    const translated = applySceneTextTranslations({
      base: [
        {
          template: "scene",
          footerLines: ["Download the app", "Join the movement."],
        },
      ],
      fields,
      translated: [
        { id: 0, text: "Download de app" },
        { id: 1, text: "Doe mee met de beweging." },
      ],
    });
    assert.deepEqual(translated[0]?.footerLines, [
      "Download de app",
      "Doe mee met de beweging.",
    ]);
    assert.equal(translated[0]?.finaleFooter, "Download de app");
  });

  it("copy-as-draft style multi-scene payload keeps footer lines on last frame", () => {
    const drafts = instantSceneTextsFromDrafts(
      [
        { ...emptySceneTextDraft(5), template: "scene", title: "ONE" },
        {
          ...emptySceneTextDraft(5),
          template: "scene",
          title: "TWO",
          footerLines: ["homecheff.eu", "Powered by Motion Studio."],
          finaleFooter: "homecheff.eu",
        },
      ],
      2
    );
    assert.equal(drafts[0]?.footerLines, undefined);
    assert.deepEqual(drafts[1]?.footerLines, [
      "homecheff.eu",
      "Powered by Motion Studio.",
    ]);
  });

  it("hasFooterContent is false for empty scenes", () => {
    assert.equal(hasFooterContent({}), false);
    assert.equal(hasFooterContent({ footerLines: ["", "  "] }), false);
    assert.equal(hasFooterContent({ finaleFooter: "site.com" }), true);
  });
});
