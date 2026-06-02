import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildSceneTextDraftsFromProject,
  sceneTextToDraft,
} from "@/lib/instant-scene-text-editor";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { chooseTemplate, normalizeSceneText } from "@/lib/story-overlay-templates";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import { postRebuildFinalVideo } from "@/lib/instant-export-client";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

describe("text rerender editor flow", () => {
  it("Teksten aanpassen opens editor component before render", () => {
    const src = readFileSync(
      join(__dirname, "../components/instant/text-rerender-editor-modal.tsx"),
      "utf8"
    );
    assert.match(src, /StoryboardEditor/);
    assert.match(src, /postRebuildFinalVideo\(projectId, \{ sceneTexts: payload \}\)/);
    assert.match(src, /instant\.textRerender\.render/);
  });

  it("progress and project pages open editor instead of immediate rebuild", () => {
    const progress = readFileSync(
      join(__dirname, "../app/animate/instant/progress/page.tsx"),
      "utf8"
    );
    const detail = readFileSync(join(__dirname, "../app/videos/[id]/page.tsx"), "utf8");
    assert.match(progress, /setTextRerenderEditorOpen\(true\)/);
    assert.match(detail, /setTextRerenderEditorOpen\(true\)/);
    assert.match(detail, /TextRerenderEditorModal/);
  });

  it("editor loads all frames from project scene texts including finaleFooter", () => {
    const drafts = buildSceneTextDraftsFromProject(
      [
        { template: "scene", title: "ONE" },
        { template: "scene", title: "TWO", finaleFooter: "homecheff.eu" },
      ],
      2
    );
    assert.equal(drafts.length, 2);
    assert.equal(drafts[0]!.title, "ONE");
    assert.equal(drafts[1]!.finaleFooter, "homecheff.eu");
  });

  it("postRebuildFinalVideo sends sceneTexts JSON body", () => {
    const src = readFileSync(join(__dirname, "instant-export-client.ts"), "utf8");
    assert.match(src, /sceneTexts\?: InstantSceneText\[\]/);
    assert.match(src, /JSON\.stringify\(\{ sceneTexts: options!\.sceneTexts \}\)/);
    assert.equal(typeof postRebuildFinalVideo, "function");
  });

  it("rebuild-final-video route persists sceneTexts before merge", () => {
    const route = readFileSync(
      join(
        __dirname,
        "../app/api/instant-premium/projects/[id]/rebuild-final-video/route.ts"
      ),
      "utf8"
    );
    assert.match(route, /persistInstantSceneTextsForProject/);
    assert.match(route, /sceneTextsPayload/);
  });

  it("user copy uses Edit texts / Teksten aanpassen and render secondary action", () => {
    assert.equal(en["instant.textRerender.cta"], "Edit texts");
    assert.equal(nl["instant.textRerender.cta"], "Teksten aanpassen");
    assert.equal(en["instant.textRerender.render"], "Render text version");
    assert.equal(nl["instant.textRerender.render"], "Tekstversie renderen");
  });
});

describe("finale footer render fix", () => {
  it("footer-only final scene is not skipped", () => {
    assert.equal(
      chooseTemplate(normalizeSceneText({ template: "scene", finaleFooter: "homecheff.eu" })),
      "scene"
    );
  });

  it("footer on hero final scene creates ASS footer event", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "LOCAL FOOD", finaleFooter: "homecheff.eu" }],
      durationSeconds: 6,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /homecheff\.eu/);
    assert.match(ass, /HCStoryFooter_s0/);
    const footer = ass.split("\n").find((line) => line.includes("homecheff.eu"));
    assert.ok(footer);
    assert.match(footer!, /0:00:06\.00/);
    assert.match(footer!, /\\fad\(220,0\)/);
  });

  it("clearing footer removes it from serialized rerender payload", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      finaleFooter: "",
    };
    const payload = instantSceneTextFromDraft(draft, 1, 2);
    assert.equal(payload.finaleFooter, undefined);
  });

  it("adding extraLine persists through draft serializer", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      extraLines: ["Extra insight"],
    };
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.deepEqual(payload.extraLines, ["Extra insight"]);
    const ass = buildStoryOverlayAss({
      sceneTexts: [payload],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /Extra insight/);
  });

  it("text rerender and repair paths do not call Vidu", () => {
    const root = join(__dirname, "..");
    for (const rel of [
      "server/instant-premium/rebuild-final-video.ts",
      "server/instant-premium/persist-instant-scene-texts.ts",
      "app/api/instant-premium/projects/[id]/rebuild-final-video/route.ts",
    ]) {
      const src = readFileSync(join(root, rel), "utf8");
      assert.ok(!src.includes("triggerVidu"), rel);
      assert.ok(!src.includes("viduClient"), rel);
    }
  });
});

describe("language editor draft round-trip", () => {
  it("sceneTextToDraft preserves user-reviewed footer text", () => {
    const draft = sceneTextToDraft(
      normalizeSceneText({
        template: "scene",
        title: "TITLE",
        finaleFooter: "homecheff.eu",
      })
    );
    assert.equal(draft.finaleFooter, "homecheff.eu");
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.equal(payload.finaleFooter, "homecheff.eu");
  });
});
