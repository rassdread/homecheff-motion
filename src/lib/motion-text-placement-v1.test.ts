import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPortraitSubjectHeuristicZones,
  applyMascotHeuristicBoost,
  detectMascotColorHeuristicZones,
} from "@/server/animation-export/text-avoid-zone-heuristics";
import {
  buildTextAvoidZonePlan,
  textBoxOverlapWithZones,
  unionTextAvoidZones,
  zoneOverlapFraction,
} from "@/server/animation-export/text-avoid-zone-builder";
import {
  computeMultiSampleTimes,
  computeMultiSampleTimesForWindow,
} from "@/server/animation-export/multi-sample-avoid-zones";
import {
  estimateTextBoxNormalized,
  isTextBoxUnsafeForZones,
  relocateAwayFromSubjectZones,
  SUBJECT_OVERLAP_REJECT_THRESHOLD,
} from "@/server/animation-export/text-subject-collision";
import {
  pickBestPlacementCandidate,
  scoreTextPlacementCandidate,
} from "@/server/animation-export/text-placement-scoring";
import {
  applySubjectSafetyToLockedLayers,
  isPatchBboxUnsafe,
} from "@/server/animation-export/multi-image-text-safety";
import {
  makeDialogueDraft,
  resolveSceneDialogueCollisions,
} from "@/server/animation-export/story-overlay-dialogue";
import { STORY_TITLE_ASS_ALIGNMENT } from "@/server/animation-export/story-layer-placement";
import type { TextAvoidZone } from "@/types/text-avoid-zone";
import type { LockedTextLayer } from "@/lib/locked-text-layer";

const FRAME_W = 1080;
const FRAME_H = 1920;

function faceZone(): TextAvoidZone {
  return {
    type: "face",
    x: 0.35,
    y: 0.2,
    width: 0.3,
    height: 0.25,
    confidence: 0.9,
    source: "mediapipe",
    weight: 0.85,
  };
}

describe("Motion Text Placement V1", () => {
  it("builds portrait center subject heuristic zones", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    assert.equal(zones.length, 3);
    assert.ok(zones.some((z) => z.type === "face"));
    assert.ok(zones.some((z) => z.label === "center_upper_body"));
  });

  it("rejects text overlapping face avoid zone", () => {
    const zones = [faceZone()];
    const box = { left: 0.38, top: 0.22, right: 0.62, bottom: 0.38 };
    assert.ok(isTextBoxUnsafeForZones(box, zones));
    assert.ok(textBoxOverlapWithZones(box, zones) >= SUBJECT_OVERLAP_REJECT_THRESHOLD);
  });

  it("relocates short copy to top when top zone is free", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const relocated = relocateAwayFromSubjectZones({
      x: 540,
      y: 700,
      fontSize: 48,
      alignment: 2,
      lines: ["Hi"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
    });
    assert.ok(relocated.action.includes("top_safe"));
    assert.ok(relocated.y <= FRAME_H * 0.12);
  });

  it("relocates long copy to bottom when top and mid are blocked", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const relocated = relocateAwayFromSubjectZones({
      x: 540,
      y: 700,
      fontSize: 72,
      alignment: 2,
      lines: ["Fresh pasta tonight"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
    });
    assert.notEqual(relocated.action, "kept");
    assert.ok(relocated.action.includes("bottom_safe"));
    assert.ok(relocated.y > FRAME_H * 0.75);
  });

  it("applies mascot heuristic boost for food_promo preset", () => {
    const base = buildPortraitSubjectHeuristicZones("9:16");
    const { zones, applied } = applyMascotHeuristicBoost(base, {
      stylePreset: "food_promo",
    });
    assert.equal(applied, true);
    assert.ok(zones.some((z) => z.type === "mascot"));
    const face = zones.find((z) => z.label?.includes("face"));
    assert.ok(face && face.weight > 0.65);
  });

  it("detects green apron color heuristic zone", () => {
    const pixels = new Uint8Array(64 * 64 * 3);
    for (let i = 0; i < pixels.length; i += 3) {
      pixels[i] = 40;
      pixels[i + 1] = 160;
      pixels[i + 2] = 50;
    }
    const zones = detectMascotColorHeuristicZones(pixels, 64, 64);
    assert.ok(zones.some((z) => z.label === "green_apron_region"));
  });

  it("unions overlapping avoid zones from multiple samples", () => {
    const a: TextAvoidZone = {
      type: "face",
      x: 0.3,
      y: 0.15,
      width: 0.2,
      height: 0.2,
      confidence: 0.7,
      source: "mediapipe",
      weight: 0.8,
    };
    const b: TextAvoidZone = {
      type: "face",
      x: 0.38,
      y: 0.18,
      width: 0.22,
      height: 0.18,
      confidence: 0.75,
      source: "mediapipe",
      weight: 0.85,
    };
    const merged = unionTextAvoidZones([a, b]);
    assert.equal(merged.length, 1);
    assert.ok(merged[0]!.width >= 0.3);
  });

  it("computes multi-sample times for scene window", () => {
    const times = computeMultiSampleTimesForWindow(2, 6);
    assert.equal(times.length, 3);
    assert.ok(times[0]! >= 2);
    assert.ok(times[2]! <= 6);
    const full = computeMultiSampleTimes(10);
    assert.equal(full.length, 3);
  });

  it("builds heuristic-only plan when vision is off", () => {
    const plan = buildTextAvoidZonePlan({
      aspectRatio: "9:16",
      heuristicOnly: true,
    });
    assert.equal(plan.heuristicOnly, true);
    assert.ok(plan.zones.length >= 3);
  });

  it("relocates locked multi-image text away from center subject", () => {
    const plan = buildTextAvoidZonePlan({ aspectRatio: "9:16" });
    const layer: LockedTextLayer = {
      id: "l1",
      text: "Chef special",
      x: 0.5,
      y: 0.35,
      fontSize: 64,
      textAlign: "center",
      animation: "none",
      startMs: 0,
      durationMs: 3000,
      locked: true,
    };
    const safe = applySubjectSafetyToLockedLayers({
      layers: [layer],
      frameW: FRAME_W,
      frameH: FRAME_H,
      avoidPlan: plan,
    });
    assert.notEqual(safe[0]!.y, layer.y);
  });

  it("flags unsafe hybrid text patch bbox over face zone", () => {
    const zones = [faceZone()];
    assert.equal(
      isPatchBboxUnsafe({ x: 0.36, y: 0.22, width: 0.28, height: 0.2 }, zones),
      true
    );
    assert.equal(
      isPatchBboxUnsafe({ x: 0.05, y: 0.82, width: 0.9, height: 0.1 }, zones),
      false
    );
  });

  it("relocates story hero away from face avoid zone", () => {
    const zones = [faceZone()];
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "hero",
          kind: "hero",
          sceneIndex: 0,
          styleName: "HCHeroMain_s0",
          assText: "TASTE",
          lines: ["TASTE"],
          x: 540,
          y: 480,
          alignment: 5,
          fontSize: 96,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    const hero = result.resolvedDrafts[0]!;
    assert.ok(hero.y > 600 || hero.y < 300);
    assert.ok(result.actions[0]!.action === "moved" || result.actions[0]!.reason.includes("subject"));
  });

  it("relocates sequence line when overlapping subject zone", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "seq1",
          kind: "sequence_line",
          sceneIndex: 0,
          styleName: "HCSeq_s0",
          assText: "Step one",
          lines: ["Step one"],
          x: 540,
          y: 760,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 56,
          start: 0,
          end: 4,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: zones,
    });
    const line = result.resolvedDrafts[0]!;
    const box = estimateTextBoxNormalized({
      x: line.x,
      y: line.y,
      fontSize: line.fontSize,
      frameW: FRAME_W,
      frameH: FRAME_H,
      lines: line.lines,
      alignment: line.alignment,
    });
    assert.ok(
      !isTextBoxUnsafeForZones(box, zones) || result.actions[0]!.action === "moved"
    );
  });

  it("preserves text-vs-text collision when avoid zones are clear", () => {
    const result = resolveSceneDialogueCollisions({
      drafts: [
        makeDialogueDraft({
          id: "hero",
          kind: "hero",
          sceneIndex: 0,
          styleName: "HCHeroMain_s0",
          assText: "HERO",
          lines: ["HERO"],
          x: 540,
          y: 200,
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
          y: 210,
          alignment: STORY_TITLE_ASS_ALIGNMENT,
          fontSize: 48,
          start: 0,
          end: 5,
        }),
      ],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      avoidZones: [],
    });
    const sub = result.resolvedDrafts.find((d) => d.kind === "subtitle");
    assert.ok(sub);
    assert.notEqual(sub!.y, 210);
  });

  it("scores placement candidates with avoid zone penalty", () => {
    const zones = [faceZone()];
    const centerScore = scoreTextPlacementCandidate({
      candidate: {
        x: 540,
        y: 480,
        fontSize: 72,
        alignment: 2,
        lines: ["Center"],
      },
      frameW: FRAME_W,
      frameH: FRAME_H,
      avoidZones: zones,
      placedBoxes: [],
    });
    const bottomScore = scoreTextPlacementCandidate({
      candidate: {
        x: 540,
        y: 1680,
        fontSize: 72,
        alignment: 2,
        lines: ["Bottom"],
      },
      frameW: FRAME_W,
      frameH: FRAME_H,
      avoidZones: zones,
      placedBoxes: [],
    });
    assert.ok(bottomScore.total > centerScore.total);
  });

  it("picks best free-space candidate via placement scoring", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
    const best = pickBestPlacementCandidate({
      candidates: [
        { x: 540, y: 700, fontSize: 64, alignment: 2, lines: ["Mid"] },
        { x: 540, y: 1680, fontSize: 64, alignment: 2, lines: ["Low"] },
        { x: 540, y: 180, fontSize: 64, alignment: 8, lines: ["Top"] },
      ],
      frameW: FRAME_W,
      frameH: FRAME_H,
      avoidZones: zones,
      placedBoxes: [],
    });
    assert.ok(best);
    assert.ok(best!.score.total > 0);
    assert.ok(best!.candidate.y >= 1200 || best!.candidate.y <= 400);
  });

  it("zone overlap fraction is zero for non-intersecting boxes", () => {
    const overlap = zoneOverlapFraction(
      { x: 0, y: 0, width: 0.2, height: 0.2 },
      { x: 0.5, y: 0.5, width: 0.2, height: 0.2 }
    );
    assert.equal(overlap, 0);
  });

  it("fallback without vision still applies portrait heuristics", () => {
    const plan = buildTextAvoidZonePlan({
      aspectRatio: "9:16",
      avoidBoxes: [],
      heuristicOnly: true,
    });
    assert.ok(plan.zones.length >= 3);
    const box = { left: 0.4, top: 0.25, right: 0.6, bottom: 0.45 };
    assert.ok(isTextBoxUnsafeForZones(box, plan.zones));
  });
});
