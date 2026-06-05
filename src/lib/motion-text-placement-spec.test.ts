import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandNoGoAvoidZones,
  zoneOverlapFraction,
} from "@/server/animation-export/text-avoid-zone-builder";
import {
  NOGO_PADDING_HEIGHT_FRACTION,
  SPEC_RELOCATION_BANDS,
  TEXT_SAFE_AREA_MARGIN,
} from "@/server/animation-export/text-placement-spec";
import { resolveTextPlacementTwoPass } from "@/server/animation-export/text-placement-reservation";
import {
  estimateTextBoxNormalized,
  relocateAwayFromSubjectZones,
} from "@/server/animation-export/text-subject-collision";
import { buildPortraitSubjectHeuristicZones } from "@/server/animation-export/text-avoid-zone-heuristics";

const FRAME_W = 1080;
const FRAME_H = 1920;

describe("Video text rendering spec", () => {
  it("expands mascot/logo no-go zones with comfort padding", () => {
    const mascot = {
      type: "mascot" as const,
      x: 0.4,
      y: 0.5,
      width: 0.2,
      height: 0.25,
      confidence: 0.9,
      source: "manual_heuristic" as const,
      weight: 0.8,
    };
    const [expanded] = expandNoGoAvoidZones([mascot]);
    assert.ok(expanded!.height > mascot.height);
    assert.ok(expanded!.width > mascot.width);
    assert.ok(expanded!.y < mascot.y);
    const pad = mascot.height * NOGO_PADDING_HEIGHT_FRACTION;
    assert.ok(Math.abs(expanded!.y - (mascot.y - pad)) < 0.001);
  });

  it("clamps estimated text boxes inside 8–10% safe area", () => {
    const box = estimateTextBoxNormalized({
      x: 0,
      y: 0,
      fontSize: 72,
      frameW: FRAME_W,
      frameH: FRAME_H,
      lines: ["Edge case"],
      alignment: 1,
    });
    assert.ok(box.left >= TEXT_SAFE_AREA_MARGIN - 0.001);
    assert.ok(box.top >= TEXT_SAFE_AREA_MARGIN - 0.001);
    assert.ok(box.right <= 1 - TEXT_SAFE_AREA_MARGIN + 0.001);
    assert.ok(box.bottom <= 1 - TEXT_SAFE_AREA_MARGIN + 0.001);
  });

  it("prefers top zone when it is free (short copy)", () => {
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
    const topBand = SPEC_RELOCATION_BANDS.find((b) => b.id === "top_safe")!;
    assert.ok(relocated.action.includes(topBand.id));
    assert.ok(relocated.y <= FRAME_H * (topBand.y + 0.05));
  });

  it("falls back to bottom only when top and mid are blocked", () => {
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
    assert.ok(relocated.action.includes("bottom_safe"));
  });

  it("places text above mascot when center is blocked", () => {
    const mascot = {
      type: "mascot" as const,
      x: 0.25,
      y: 0.42,
      width: 0.5,
      height: 0.28,
      confidence: 0.95,
      source: "manual_heuristic" as const,
      weight: 0.9,
    };
    const zones = expandNoGoAvoidZones([mascot]);
    const resolved = resolveTextPlacementTwoPass({
      layerId: "hero",
      x: 540,
      y: 960,
      fontSize: 80,
      alignment: 5,
      lines: ["THE JOURNEY"],
      frameW: FRAME_W,
      frameH: FRAME_H,
      zones,
      placedReservations: [],
    });
    const overlap = zoneOverlapFraction(
      {
        x: resolved.box.left,
        y: resolved.box.top,
        width: resolved.box.right - resolved.box.left,
        height: resolved.box.bottom - resolved.box.top,
      },
      zones[0]!
    );
    assert.ok(overlap < 0.08);
    assert.ok(
      resolved.action.includes("above") ||
        resolved.action.includes("top") ||
        resolved.box.bottom <= mascot.y + 0.02
    );
  });

  it("emits tight-space warning when shrink fallback is required", () => {
    const zones = buildPortraitSubjectHeuristicZones("9:16");
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
      placedReservations: [
        {
          layerId: "blocker",
          left: 0.2,
          top: 0.84,
          right: 0.8,
          bottom: 0.92,
        },
      ],
      shrinkSteps: [0.72, 0.66, 0.6],
    });
    assert.ok(resolved.tightSpaceWarning);
    assert.ok(resolved.fontSize <= 72);
  });
});
