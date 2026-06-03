import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import {
  applyStoryReadingFlowToPlacements,
  assTextBounds,
  clampAssAnchor,
  resolveStoryLayerPositions,
  STORY_HEADLINE_ASS_ALIGNMENT,
  STORY_TITLE_ASS_ALIGNMENT,
} from "@/server/animation-export/story-layer-placement";
import type { ObjectAwarePlacement } from "@/server/animation-export/object-aware-placement";
import {
  placementForZone,
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
} from "@/server/animation-export/safe-zone-placement";
import { buildSceneSafeZoneContext } from "@/server/animation-export/enhanced-safe-zone";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";

const W = 1080;
const H = 1920;

function mockPlacement(zoneId: Parameters<typeof placementForZone>[0], score = 80): ObjectAwarePlacement {
  const base = placementForZone(zoneId, score, W, H);
  return {
    ...base,
    placementReason: "safe_zone_v1_fallback",
    confidence: 0.5,
    intent: "generic",
  };
}

function mockDetection(): SceneDetectionContext {
  const v1Zones = [
    "TOP_LEFT",
    "TOP_CENTER",
    "TOP_RIGHT",
    "CENTER_LEFT",
    "CENTER",
    "CENTER_RIGHT",
    "BOTTOM_LEFT",
    "BOTTOM_CENTER",
    "BOTTOM_RIGHT",
  ] as const;
  return {
    safeZoneV1: {
      zones: v1Zones.map((zoneId, i) => ({
        zoneId,
        score: zoneId === "TOP_CENTER" ? 90 : zoneId === "CENTER" ? 85 : 60 - i,
        luma: 120,
        contrast: 20,
        edgeDensity: 5,
      })),
      bestTopZone: "TOP_CENTER",
      bestCenterZone: "CENTER",
      bestBottomZone: "BOTTOM_CENTER",
      bestOverallZone: "CENTER",
      confidence: 90,
    },
    mediaPipeDetections: [],
    objectDetections: [],
    combinedAvoidBoxes: [],
    objectLabels: [],
    failedDetectors: [],
  };
}

describe("story-layer-placement", () => {
  it("groups subtitle horizontally with title anchor", () => {
    const raw = {
      hero: mockPlacement("TOP_CENTER"),
      headline: mockPlacement("TOP_CENTER"),
      title: mockPlacement("CENTER"),
      subtitle: mockPlacement("BOTTOM_RIGHT"),
      scene: mockPlacement("BOTTOM_CENTER"),
      sequence: mockPlacement("CENTER"),
      heroFinale: mockPlacement("TOP_CENTER"),
    };
    const grouped = applyStoryReadingFlowToPlacements(raw);
    assert.equal(grouped.subtitle.anchorX, grouped.title.anchorX);
    assert.equal(grouped.subtitle.placementReason, "grouped_with_title");
  });

  it("places headline/title/subtitle in separate vertical bands", () => {
    const positions = resolveStoryLayerPositions({
      placements: {
        hero: mockPlacement("TOP_CENTER"),
        headline: mockPlacement("TOP_CENTER"),
        title: mockPlacement("CENTER"),
        subtitle: mockPlacement("BOTTOM_RIGHT"),
        scene: mockPlacement("BOTTOM_CENTER"),
        sequence: mockPlacement("CENTER"),
        heroFinale: mockPlacement("TOP_CENTER"),
      },
      width: W,
      height: H,
      headlineLines: ["ROTTERDAM"],
      titleLines: ["HIDDEN TALENT"],
      subtitleLines: ["is everywhere."],
      headlineFontSize: 96,
      titleFontSize: 72,
      subtitleFontSize: 40,
    });
    assert.ok(positions.headline);
    assert.ok(positions.title);
    assert.ok(positions.subtitle);
    assert.ok(positions.headline!.clampedY < positions.title!.clampedY);
    assert.ok(positions.title!.clampedY < positions.subtitle!.clampedY);
    assert.equal(positions.subtitle!.groupedWithTitle, true);
    assert.equal(positions.subtitle!.layout, "band");
  });

  it("clampAssAnchor keeps title inside horizontal safe margins when text fits", () => {
    const lines = ["HIDDEN TALENT"];
    const rawX = Math.round(W * 0.04);
    const clamped = clampAssAnchor({
      x: rawX,
      y: H * 0.5,
      alignment: STORY_TITLE_ASS_ALIGNMENT,
      lines,
      fontSize: 72,
      frameWidth: W,
      frameHeight: H,
    });
    const bounds = assTextBounds({
      x: clamped.clampedX,
      y: clamped.clampedY,
      alignment: STORY_TITLE_ASS_ALIGNMENT,
      lines,
      fontSize: 72,
    });
    assert.ok(bounds.left >= W * SAFE_AREA_MARGIN_H - 1);
    assert.ok(bounds.right <= W * (1 - SAFE_AREA_MARGIN_H) + 1);
    assert.ok(clamped.clampedX > rawX);
  });

  it("clampAssAnchor centers overflow-wide single lines instead of clipping left", () => {
    const lines = ["THIS ISNT JUST AN APP ITS A MOVEMENT"];
    const rawX = Math.round(W * 0.02);
    const clamped = clampAssAnchor({
      x: rawX,
      y: H * 0.35,
      alignment: STORY_TITLE_ASS_ALIGNMENT,
      lines,
      fontSize: 72,
      frameWidth: W,
      frameHeight: H,
    });
    assert.ok(clamped.clampedX > rawX + 100);
    assert.ok(Math.abs(clamped.clampedX - W / 2) < W * 0.08);
  });

  it("clampAssAnchor keeps headline inside top safe margin", () => {
    const lines = ["ROTTERDAM"];
    const clamped = clampAssAnchor({
      x: W / 2,
      y: 10,
      alignment: STORY_HEADLINE_ASS_ALIGNMENT,
      lines,
      fontSize: 96,
      frameWidth: W,
      frameHeight: H,
    });
    const bounds = assTextBounds({
      x: clamped.clampedX,
      y: clamped.clampedY,
      alignment: STORY_HEADLINE_ASS_ALIGNMENT,
      lines,
      fontSize: 96,
    });
    assert.ok(bounds.top >= H * SAFE_AREA_MARGIN_V - 1);
  });

  it("Rotterdam ASS dialogues follow vertical reading order", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "Rotterdam",
          title: "Hidden talent",
          subtitle: "is everywhere.",
        },
      ],
      durationSeconds: 5,
      width: W,
      height: H,
    });
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    const headline = dialogues.find((l) => l.includes("ROTTERDAM"));
    const title = dialogues.find((l) => l.includes("HIDDEN TALENT"));
    const subtitle = dialogues.find((l) => l.includes("is everywhere"));
    assert.ok(headline && title && subtitle);

    const yOf = (line: string) => {
      const pos = line.match(/\\pos\((\d+),(\d+)\)/);
      return pos ? Number.parseInt(pos[2]!, 10) : 0;
    };
    assert.ok(yOf(headline!) < yOf(title!));
    assert.ok(yOf(title!) < yOf(subtitle!));
  });

  it("object-aware context keeps title and subtitle grouped", () => {
    const ctx = buildSceneSafeZoneContext({
      detection: mockDetection(),
      sceneText: "Hidden talent is everywhere",
      width: W,
      height: H,
    });
    assert.equal(ctx.placements.subtitle.placementReason, "grouped_with_title");
    assert.equal(ctx.placements.subtitle.anchorX, ctx.placements.title.anchorX);
  });

  it("stagger timing remains headline then title then subtitle", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "ROTTERDAM",
          title: "HIDDEN TALENT",
          subtitle: "is everywhere.",
        },
      ],
      durationSeconds: 5,
      width: W,
      height: H,
    });
    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    const startOf = (needle: string) =>
      dialogues.find((l) => l.includes(needle))!.split(",")[1]!;
    assert.notEqual(startOf("ROTTERDAM"), startOf("HIDDEN TALENT"));
    assert.notEqual(startOf("HIDDEN TALENT"), startOf("is everywhere"));
  });
});
