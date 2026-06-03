import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import {
  assertNoDialogueOverlap,
  makeDialogueDraft,
  resolveSceneDialogueCollisions,
} from "@/server/animation-export/story-overlay-dialogue";
import { STORY_TITLE_ASS_ALIGNMENT } from "@/server/animation-export/story-layer-placement";
import type { FinalizeSceneDialoguesResult } from "@/server/animation-export/story-overlay-dialogue";

function collectCollisionResults(input: Parameters<typeof buildStoryOverlayAss>[0]): FinalizeSceneDialoguesResult[] {
  const results: FinalizeSceneDialoguesResult[] = [];
  buildStoryOverlayAss({
    ...input,
    onSceneCollision: (_sceneIndex, result) => {
      results.push(result);
    },
  });
  return results;
}

describe("resolveSceneDialogueCollisions", () => {
  it("resolves forced overlap so visible drafts do not overlap", () => {
    const drafts = [
      makeDialogueDraft({
        id: "hero",
        kind: "hero",
        sceneIndex: 0,
        styleName: "HCHeroMain_s0",
        assText: "HERO",
        lines: ["HERO"],
        x: 540,
        y: 900,
        alignment: 5,
        fontSize: 90,
        start: 0,
        end: 5,
      }),
      makeDialogueDraft({
        id: "sub",
        kind: "subtitle",
        sceneIndex: 0,
        styleName: "HCStorySubtitle_s0",
        assText: "SUB",
        lines: ["SUB"],
        x: 540,
        y: 910,
        alignment: STORY_TITLE_ASS_ALIGNMENT,
        fontSize: 60,
        start: 0,
        end: 5,
      }),
    ];
    const result = resolveSceneDialogueCollisions({
      drafts,
      frameWidth: 1080,
      frameHeight: 1920,
    });
    const overlap = assertNoDialogueOverlap(result.resolvedDrafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
    assert.ok(result.actions.some((a) => a.action !== "kept"));
    assert.ok(result.events.length >= 1);
  });
});

describe("buildStoryOverlayAss collision integration", () => {
  it("emitted scene layers do not overlap after collision resolution", () => {
    const results = collectCollisionResults({
      sceneTexts: [
        {
          template: "scene",
          heroText: "KOPTEKST",
          title: "TITLE LINE",
          subtitle: "Subtitle that could collide",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.equal(results.length, 1);
    const overlap = assertNoDialogueOverlap(results[0]!.resolvedDrafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
    assert.equal(results[0]!.warnings.length, 0);
  });

  it("sequence finale and footer stay in separate bands", () => {
    const results = collectCollisionResults({
      sceneTexts: [
        {
          template: "sequence",
          lines: ["Line one", "Line two"],
          heroFinaleText: "FINALE MESSAGE",
          finaleFooter: "www.example.com",
        },
      ],
      durationSeconds: 6,
      width: 1080,
      height: 1920,
    });
    const overlap = assertNoDialogueOverlap(results[0]!.resolvedDrafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
    const finale = results[0]!.resolvedDrafts.filter(
      (d) => d.kind === "hero_finale" || d.kind === "finale_footer"
    );
    assert.ok(finale.length >= 2);
    assert.ok(finale.every((d) => !d.hidden), "finale hero and footer should remain visible");
  });
});
