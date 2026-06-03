import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beatsForEditor,
  parseTextBeats,
  pickBeatArraysForApi,
  resolveTextBeats,
  syncLegacyFieldFromBeats,
  trimBeats,
} from "@/lib/story-text-beats";
import {
  buildLayerBeatRevealSlots,
  normalizeSceneText,
} from "@/lib/story-overlay-templates";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import {
  assertNoDialogueOverlap,
  type FinalizeSceneDialoguesResult,
} from "@/server/animation-export/story-overlay-dialogue";

describe("story-text-beats", () => {
  it("resolves legacy string into single beat arrays", () => {
    const scene = normalizeSceneText({
      template: "scene",
      heroText: "Movement",
      title: "Built by people",
      subtitle: "Local creators",
    });
    assert.deepEqual(scene.headlineBeats, ["MOVEMENT"]);
    assert.deepEqual(scene.titleBeats, ["BUILT BY PEOPLE"]);
    assert.deepEqual(scene.subtitleBeats, ["Local creators"]);
  });

  it("prefers beat arrays over legacy strings", () => {
    const scene = normalizeSceneText({
      template: "scene",
      title: "OLD",
      titleBeats: ["BUILT BY PEOPLE", "POWERED BY COMMUNITY"],
    });
    assert.deepEqual(scene.titleBeats, ["BUILT BY PEOPLE", "POWERED BY COMMUNITY"]);
    assert.equal(scene.title, "BUILT BY PEOPLE");
  });

  it("serializes multi-beat arrays to API payload", () => {
    const draft = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      titleBeats: ["ONE", "TWO"],
      title: "ONE",
    };
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.deepEqual(payload.titleBeats, ["ONE", "TWO"]);
    assert.equal(payload.title, "ONE");
    assert.equal(pickBeatArraysForApi({ ...normalizeSceneText(payload) }).titleBeats?.length, 2);
  });

  it("buildLayerBeatRevealSlots staggers beats within a layer window", () => {
    const slots = buildLayerBeatRevealSlots(
      { index: 0, revealStart: 0, visibleEnd: 5 },
      2,
      5
    );
    assert.equal(slots.length, 2);
    assert.equal(slots[0]!.revealStart, 0);
    assert.ok(slots[1]!.revealStart > slots[0]!.revealStart);
    assert.equal(slots[0]!.visibleEnd, 5);
    assert.equal(slots[1]!.visibleEnd, 5);
  });

  it("syncLegacyFieldFromBeats returns first non-empty beat", () => {
    assert.equal(syncLegacyFieldFromBeats(["", "SECOND", "THIRD"]), "SECOND");
  });

  it("trimBeats removes empty rows", () => {
    assert.deepEqual(trimBeats([" A ", "", "B"]), ["A", "B"]);
  });

  it("beatsForEditor falls back to legacy field", () => {
    assert.deepEqual(beatsForEditor([], "Legacy"), ["Legacy"]);
  });

  it("parseTextBeats caps count", () => {
    assert.equal(parseTextBeats(["a", "b", "c", "d", "e", "f"]).length, 5);
  });
});

describe("buildStoryOverlayAss text beats", () => {
  function collect(results: FinalizeSceneDialoguesResult[]) {
    buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          headlineBeats: ["THIS IS", "THE MOVEMENT"],
          titleBeats: ["BUILT BY PEOPLE", "POWERED BY COMMUNITY"],
          subtitleBeats: ["Local creators", "Real opportunities"],
        },
      ],
      durationSeconds: 6,
      width: 1080,
      height: 1920,
      onSceneCollision: (_index, result) => {
        results.push(result);
      },
    });
  }

  it("renders multiple title/headline beats without overlap", () => {
    const results: FinalizeSceneDialoguesResult[] = [];
    collect(results);
    assert.equal(results.length, 1);
    const drafts = results[0]!.resolvedDrafts;
    const titleDrafts = drafts.filter((d) => d.kind === "title");
    const headlineDrafts = drafts.filter((d) => d.kind === "headline");
    assert.equal(titleDrafts.length, 2);
    assert.equal(headlineDrafts.length, 2);
    assert.equal(titleDrafts[0]!.end, 6);
    assert.equal(titleDrafts[1]!.end, 6);
    const overlap = assertNoDialogueOverlap(drafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
  });

  it("legacy single-string projects still render", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "LEGACY TITLE", subtitle: "Legacy sub" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /LEGACY TITLE/);
    assert.match(ass, /Legacy sub/);
  });
});
