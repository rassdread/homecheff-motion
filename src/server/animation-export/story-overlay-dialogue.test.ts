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
import { capStoryOverlayFontSize } from "@/lib/story-overlay-typography-scale";
import { buildSceneSafeZoneContext } from "@/server/animation-export/enhanced-safe-zone";
import { analyzeSafeZonesFromBuffer } from "@/server/animation-export/safe-zone-placement";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";

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

function mockSafeZoneContext(): ReturnType<typeof buildSceneSafeZoneContext> {
  const width = 63;
  const height = 63;
  const data = Buffer.alloc(width * height * 4, 0);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 100;
    data[i + 1] = 100;
    data[i + 2] = 100;
    data[i + 3] = 255;
  }
  const v1 = analyzeSafeZonesFromBuffer(data, width, height, 4);
  const detection: SceneDetectionContext = {
    safeZoneV1: v1,
    mediaPipeDetections: [],
    objectDetections: [],
    combinedAvoidBoxes: [],
    objectLabels: [],
    failedDetectors: [],
  };
  return buildSceneSafeZoneContext({
    detection,
    sceneText: "TITLE AND SUBTITLE",
    width: 1080,
    height: 1920,
  });
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

  it("prefers band move and resize before hide on forced overlap", () => {
    const drafts = [
      makeDialogueDraft({
        id: "title",
        kind: "title",
        sceneIndex: 0,
        styleName: "HCStoryTitle_s0",
        assText: "BUILT BY PEOPLE",
        lines: ["BUILT BY PEOPLE"],
        x: 540,
        y: 900,
        alignment: STORY_TITLE_ASS_ALIGNMENT,
        fontSize: 72,
        start: 0,
        end: 5,
      }),
      makeDialogueDraft({
        id: "sub",
        kind: "subtitle",
        sceneIndex: 0,
        styleName: "HCStorySubtitle_s0",
        assText: "POWERED BY COMMUNITY",
        lines: ["POWERED BY COMMUNITY"],
        x: 540,
        y: 905,
        alignment: STORY_TITLE_ASS_ALIGNMENT,
        fontSize: 60,
        start: 0.8,
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
    assert.ok(result.resolvedDrafts.length >= 2, "both layers should stay visible");
    assert.ok(
      !result.actions.some((a) => a.action === "hidden"),
      "hide should not be the default fix"
    );
    assert.ok(
      result.actions.some((a) => a.action === "moved" || a.action === "resized"),
      "should reposition or resize first"
    );
  });
});

describe("buildStoryOverlayAss collision integration", () => {
  it("multiple scene layers remain visible until scene end", () => {
    const results = collectCollisionResults({
      sceneTexts: [
        {
          template: "scene",
          heroText: "THIS IS THE MOVEMENT",
          title: "BUILT BY PEOPLE",
          subtitle: "POWERED BY COMMUNITY",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.equal(results.length, 1);
    const drafts = results[0]!.resolvedDrafts;
    assert.ok(drafts.some((d) => d.kind === "headline"));
    assert.ok(drafts.some((d) => d.kind === "title"));
    assert.ok(drafts.some((d) => d.kind === "subtitle"));
    for (const draft of drafts) {
      assert.equal(draft.end, 5, `${draft.kind} should stay until scene end`);
    }
    const overlap = assertNoDialogueOverlap(drafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
  });

  it("BUILT BY PEOPLE and POWERED BY COMMUNITY do not overlap spatially", () => {
    const results = collectCollisionResults({
      sceneTexts: [
        {
          template: "scene",
          title: "BUILT BY PEOPLE",
          subtitle: "POWERED BY COMMUNITY",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const overlap = assertNoDialogueOverlap(results[0]!.resolvedDrafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
    const title = results[0]!.resolvedDrafts.find((d) => d.kind === "title");
    const subtitle = results[0]!.resolvedDrafts.find((d) => d.kind === "subtitle");
    assert.ok(title && subtitle);
    assert.notEqual(title.y, subtitle.y);
  });

  it("text-only rerender recalculates placement after text changes", () => {
    const baseInput = {
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      safeZoneByIndex: new Map([[0, mockSafeZoneContext()]]),
    };
    const resultsA = collectCollisionResults({
      ...baseInput,
      sceneTexts: [{ template: "scene", title: "SHORT", subtitle: "ONE" }],
    });
    const resultsB = collectCollisionResults({
      ...baseInput,
      sceneTexts: [
        {
          template: "scene",
          title: "MUCH LONGER TITLE LINE THAT NEEDS SMALLER TYPE",
          subtitle: "DIFFERENT SUBTITLE COPY",
        },
      ],
    });
    const titleA = resultsA[0]!.resolvedDrafts.find((d) => d.kind === "title");
    const titleB = resultsB[0]!.resolvedDrafts.find((d) => d.kind === "title");
    const subA = resultsA[0]!.resolvedDrafts.find((d) => d.kind === "subtitle");
    const subB = resultsB[0]!.resolvedDrafts.find((d) => d.kind === "subtitle");
    assert.ok(titleA && titleB && subA && subB);
    assert.ok(
      titleB.fontSize < titleA.fontSize,
      "edited long title should shrink — placement is recalculated from current text"
    );
  });

  it("long text gets smaller instead of overlapping", () => {
    const longTitle =
      "THIS ISNT JUST AN APP ITS A MOVEMENT BUILT BY PEOPLE POWERED BY COMMUNITY";
    const results = collectCollisionResults({
      sceneTexts: [
        {
          template: "scene",
          heroText: "MOVEMENT",
          title: longTitle,
          subtitle: "POWERED BY COMMUNITY",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const overlap = assertNoDialogueOverlap(results[0]!.resolvedDrafts);
    assert.equal(overlap.ok, true, overlap.ok ? "" : overlap.pairs.join(","));
    const title = results[0]!.resolvedDrafts.find((d) => d.kind === "title");
    assert.ok(title);
    assert.ok(title.fontSize <= 78, "title font should be capped/shrunk on 9:16");
    assert.ok(!results[0]!.actions.some((a) => a.action === "hidden"));
  });

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

describe("capStoryOverlayFontSize", () => {
  it("caps hero and headline sizes on 9:16", () => {
    assert.equal(capStoryOverlayFontSize("headline", 200, 1080, 1920), 112);
    assert.equal(capStoryOverlayFontSize("hero_finale", 150, 1080, 1920), 96);
    assert.equal(capStoryOverlayFontSize("title", 50, 1080, 1920), 50);
  });
});
