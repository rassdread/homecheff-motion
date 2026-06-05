import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPortraitSubjectHeuristicZones,
} from "@/server/animation-export/text-avoid-zone-heuristics";
import {
  isTextBoxOverlappingPlaced,
  resolveTextPlacementTwoPass,
  reservePlacedTextBox,
  textBoxOverlapFraction,
  type PlacedTextBox,
} from "@/server/animation-export/text-placement-reservation";
import {
  estimateTextBoxNormalized,
} from "@/server/animation-export/text-subject-collision";
import {
  applySubjectSafetyToLockedLayers,
} from "@/server/animation-export/multi-image-text-safety";
import {
  assertNoDialogueOverlap,
  makeDialogueDraft,
  resolveSceneDialogueCollisions,
} from "@/server/animation-export/story-overlay-dialogue";
import { STORY_TITLE_ASS_ALIGNMENT } from "@/server/animation-export/story-layer-placement";
import type { LockedTextLayer } from "@/lib/locked-text-layer";
import { buildTextAvoidZonePlan } from "@/server/animation-export/text-avoid-zone-builder";

const FRAME_W = 1080;
const FRAME_H = 1920;

function faceZone() {
  return {
    type: "face" as const,
    x: 0.35,
    y: 0.2,
    width: 0.3,
    height: 0.25,
    confidence: 0.9,
    source: "mediapipe" as const,
    weight: 0.85,
  };
}

describe("Motion Text Placement V1.1 — text reservation", () => {
  it("detects text-on-text overlap between normalized boxes", () => {
    const a = { left: 0.3, top: 0.8, right: 0.7, bottom: 0.9 };
    const b = { left: 0.35, top: 0.82, right: 0.65, bottom: 0.92 };
    assert.ok(textBoxOverlapFraction(a, b) > 0);
    assert.equal(
      isTextBoxOverlappingPlaced(a, [reservePlacedTextBox({ layerId: "b", box: b })]),
      true
    );
  });

  it("two-pass avoids subject and existing text reservations", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const first = resolveTextPlacementTwoPass({
      layerId: "hero",
      x: 540,
      y: 700,
      fontSize: 80,
      alignment: 2,
      lines: ["Hero line"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: [],
    });
    const second = resolveTextPlacementTwoPass({
      layerId: "sub",
      x: 540,
      y: 700,
      fontSize: 56,
      alignment: 2,
      lines: ["Subtitle"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: [
        reservePlacedTextBox({ layerId: "hero", box: first.box }),
      ],
    });
    assert.notEqual(second.action, "kept");
    assert.equal(
      isTextBoxOverlappingPlaced(second.box, [
        reservePlacedTextBox({ layerId: "hero", box: first.box }),
      ]),
      false
    );
  });

  it("two relocated hero lines do not overlap in story collision", () => {
    const zones = [faceZone()];
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "hero-main",
          kind: "hero",
          sceneIndex: 0,
          styleName: "HCHeroMain_s0",
          assText: "LINE ONE",
          lines: ["LINE ONE"],
          x: 540,
          y: 480,
          alignment: 5,
          fontSize: 96,
          start: 0,
          end: 5,
        }),
        makeDialogueDraft({
          id: "hero-sub",
          kind: "hero_finale",
          sceneIndex: 0,
          styleName: "HCHeroSmall_s0",
          assText: "LINE TWO",
          lines: ["LINE TWO"],
          x: 540,
          y: 500,
          alignment: 5,
          fontSize: 64,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    const overlap = assertNoDialogueOverlap(result.resolvedDrafts);
    assert.equal(overlap.ok, true);
  });

  it("subtitle moves away from relocated title", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "title",
          kind: "title",
          sceneIndex: 0,
          styleName: "HCStoryTitle_s0",
          assText: "TITLE",
          lines: ["TITLE"],
          x: 540,
          y: 700,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 72,
          start: 0,
          end: 5,
        }),
        makeDialogueDraft({
          id: "subtitle",
          kind: "subtitle",
          sceneIndex: 0,
          styleName: "HCStorySubtitle_s0",
          assText: "SUBTITLE",
          lines: ["SUBTITLE"],
          x: 540,
          y: 720,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 48,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    const title = result.resolvedDrafts.find((d) => d.kind === "title")!;
    const subtitle = result.resolvedDrafts.find((d) => d.kind === "subtitle")!;
    assert.ok(Math.abs(subtitle.y - title.y) >= 40);
    assert.equal(assertNoDialogueOverlap(result.resolvedDrafts).ok, true);
  });

  it("footer lines stack without overlapping each other", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "footer-1",
          kind: "finale_footer",
          sceneIndex: 0,
          styleName: "HCFooter_s0",
          assText: "Footer one",
          lines: ["Footer one"],
          x: 540,
          y: 1700,
          alignment: 2,
          fontSize: 36,
          start: 0,
          end: 5,
        }),
        makeDialogueDraft({
          id: "footer-2",
          kind: "finale_footer",
          sceneIndex: 0,
          styleName: "HCFooter_s0",
          assText: "Footer two",
          lines: ["Footer two"],
          x: 540,
          y: 1710,
          alignment: 2,
          fontSize: 36,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    assert.equal(assertNoDialogueOverlap(result.resolvedDrafts).ok, true);
    const ys = result.resolvedDrafts.map((d) => d.y).sort((a, b) => a - b);
    assert.ok(ys[1]! - ys[0]! >= 20);
  });

  it("extra rules avoid footer reservation", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "footer",
          kind: "finale_footer",
          sceneIndex: 0,
          styleName: "HCFooter_s0",
          assText: "Terms apply",
          lines: ["Terms apply"],
          x: 540,
          y: 1750,
          alignment: 2,
          fontSize: 32,
          start: 0,
          end: 5,
        }),
        makeDialogueDraft({
          id: "extra",
          kind: "extra",
          sceneIndex: 0,
          styleName: "HCExtra_s0",
          assText: "Extra rule line",
          lines: ["Extra rule line"],
          x: 540,
          y: 1740,
          alignment: 2,
          fontSize: 40,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    assert.equal(assertNoDialogueOverlap(result.resolvedDrafts).ok, true);
  });

  it("multi-image locked layers do not collapse into same zone", () => {
    const plan = buildTextAvoidZonePlan({ aspectRatio: "9:16" });
    const layers: LockedTextLayer[] = [
      {
        id: "l1",
        text: "Layer one",
        x: 0.5,
        y: 0.35,
        fontSize: 64,
        textAlign: "center",
        animation: "none",
        startMs: 0,
        durationMs: 3000,
        locked: true,
      },
      {
        id: "l2",
        text: "Layer two",
        x: 0.5,
        y: 0.36,
        fontSize: 56,
        textAlign: "center",
        animation: "none",
        startMs: 0,
        durationMs: 3000,
        locked: true,
      },
    ];
    const safe = applySubjectSafetyToLockedLayers({
      layers,
      frameW: FRAME_W,
      frameH: FRAME_H,
      avoidPlan: plan,
    });
    const boxes = safe.map((layer) => {
      const { x, y } = { x: Math.round(layer.x * FRAME_W), y: Math.round(layer.y * FRAME_H) };
      return estimateTextBoxNormalized({
        x,
        y,
        fontSize: layer.fontSize ?? 56,
        frameW: FRAME_W,
        frameH: FRAME_H,
        lines: [layer.text],
        alignment: 2,
      });
    });
    assert.ok(textBoxOverlapFraction(boxes[0]!, boxes[1]!) < 0.05);
    assert.notEqual(safe[0]!.y, safe[1]!.y);
  });

  it("subject avoidance and text avoidance both pass together", () => {
    const zones = [faceZone()];
    const placed: PlacedTextBox[] = [];
    const hero = resolveTextPlacementTwoPass({
      layerId: "hero",
      x: 540,
      y: 480,
      fontSize: 88,
      alignment: 5,
      lines: ["Fresh taste"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: placed,
    });
    placed.push(reservePlacedTextBox({ layerId: "hero", box: hero.box }));
    const sub = resolveTextPlacementTwoPass({
      layerId: "sub",
      x: 540,
      y: 490,
      fontSize: 52,
      alignment: 2,
      lines: ["Every day"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: placed,
    });
    assert.ok(!isTextBoxOverlappingPlaced(hero.box, []));
    assert.ok(!isTextBoxOverlappingPlaced(sub.box, placed));
    assert.ok(hero.y !== sub.y || hero.x !== sub.x);
  });

  it("no overlap when all layers prefer same safe zone", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "seq-1",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Step 1",
          lines: ["Step 1"],
          x: 540,
          y: 760,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 52,
          start: 0,
          end: 4,
        }),
        makeDialogueDraft({
          id: "seq-2",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Step 2",
          lines: ["Step 2"],
          x: 540,
          y: 770,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 52,
          start: 0,
          end: 4,
        }),
        makeDialogueDraft({
          id: "seq-3",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Step 3",
          lines: ["Step 3"],
          x: 540,
          y: 780,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 52,
          start: 0,
          end: 4,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    assert.equal(assertNoDialogueOverlap(result.resolvedDrafts).ok, true);
  });

  it("fallback font shrink still avoids text overlap", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const reservations: PlacedTextBox[] = [
      reservePlacedTextBox({
        layerId: "blocker",
        box: { left: 0.2, top: 0.84, right: 0.8, bottom: 0.92 },
      }),
    ];
    const resolved = resolveTextPlacementTwoPass({
      layerId: "tight",
      x: 540,
      y: 1680,
      fontSize: 72,
      alignment: 2,
      lines: ["Long footer copy that needs shrink"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: reservations,
      shrinkSteps: [0.72, 0.66, 0.6],
    });
    assert.equal(isTextBoxOverlappingPlaced(resolved.box, reservations), false);
    assert.ok(resolved.fontSize <= 72);
  });

  it("sequence lines relocate without overlapping after subject move", () => {
    const zones = [faceZone()];
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "seq-a",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Alpha",
          lines: ["Alpha"],
          x: 540,
          y: 500,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 60,
          start: 0,
          end: 4,
        }),
        makeDialogueDraft({
          id: "seq-b",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Beta",
          lines: ["Beta"],
          x: 540,
          y: 510,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 60,
          start: 0,
          end: 4,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    assert.equal(assertNoDialogueOverlap(result.resolvedDrafts).ok, true);
  });
});
