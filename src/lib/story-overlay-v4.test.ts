import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  getSceneTimingWindows,
  resolveSceneOverlayStart,
  resolveSceneOverlayVisibleEnd,
  sceneOverlayTiming,
  storyOverlayMotionTags,
} from "@/lib/story-overlay-templates";
import { prepareStorySceneTexts } from "@/lib/story-language-export";
import { computeEnhancedZoneScores } from "@/server/animation-export/enhanced-safe-zone";
import {
  resolveAllTemplatePlacements,
  resolveObjectAwarePlacement,
} from "@/server/animation-export/object-aware-placement";
import { applyStoryReadingFlowToPlacements } from "@/server/animation-export/story-layer-placement";
import {
  analyzeSafeZonesFromBuffer,
  type SafeZoneAnalysis,
} from "@/server/animation-export/safe-zone-placement";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

function dialogueTimes(line: string): { start: string; end: string } {
  const parts = line.split(",");
  return { start: parts[1]!, end: parts[2]! };
}

function makeQuietBuffer(): Buffer {
  const width = 63;
  const height = 63;
  const data = Buffer.alloc(width * height * 4, 0);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 100;
    data[i + 1] = 100;
    data[i + 2] = 100;
    data[i + 3] = 255;
  }
  return data;
}

function makeV1Analysis(): SafeZoneAnalysis {
  return analyzeSafeZonesFromBuffer(makeQuietBuffer(), 63, 63, 4);
}

function mockDetection(overrides: Partial<SceneDetectionContext> = {}): SceneDetectionContext {
  const v1 = makeV1Analysis();
  return {
    safeZoneV1: v1,
    mediaPipeDetections: [],
    objectDetections: [],
    combinedAvoidBoxes: [],
    objectLabels: [],
    failedDetectors: [],
    ...overrides,
  };
}

describe("story overlay v4 timing", () => {
  it("first scene headline starts at 0.00", () => {
    assert.equal(sceneOverlayTiming(0, 3, 9).start, 0);
    assert.equal(resolveSceneOverlayStart(0, 0.15), 0);
    const windows = getSceneTimingWindows([{ template: "scene" }, { template: "scene" }], 10, 2);
    assert.equal(windows[0]!.start, 0);
  });

  it("first paused frame contains headline event at t=0 with instant fade", () => {
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
      width: 1080,
      height: 1920,
    });
    const headline = ass.split("\n").find((line) => line.includes("ROTTERDAM"));
    assert.ok(headline);
    assert.equal(dialogueTimes(headline!).start, "0:00:00.00");
    assert.match(headline!, /\\fad\(0,0\)/);
    assert.doesNotMatch(headline!, /\\move\(/);
  });

  it("final scene text ends at videoEnd", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", title: "FRAME ONE" },
        {
          template: "scene",
          heroText: "FINALE",
          title: "LAST TITLE",
          subtitle: "LAST SUB",
          finaleFooter: "homecheff.eu",
        },
      ],
      durationSeconds: 10,
      width: 1080,
      height: 1920,
    });
    const footer = ass.split("\n").find((row) => row.startsWith("Dialogue:") && row.includes("homecheff.eu"));
    assert.ok(footer, "missing finale footer dialogue");
    assert.equal(dialogueTimes(footer!).end, "0:00:10.00", "homecheff.eu");
    const lastSub = ass.split("\n").find((row) => row.startsWith("Dialogue:") && row.includes("LAST SUB"));
    assert.ok(lastSub);
    assert.equal(dialogueTimes(lastSub!).end, "0:00:10.00", "subtitle stays visible until video end");
  });

  it("final frame keeps text visible with no fade-out tags", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "ONLY SCENE", subtitle: "hold me" }],
      durationSeconds: 8,
      width: 1080,
      height: 1920,
    });
    const subtitle = ass.split("\n").find((line) => line.includes("hold me"));
    assert.ok(subtitle);
    assert.match(subtitle!, /\\fad\(220,0\)/);
    assert.equal(dialogueTimes(subtitle!).end, "0:00:08.00");
  });

  it("finale footer ends at videoEnd", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", title: "A" },
        { template: "scene", title: "B", finaleFooter: "homecheff.eu" },
      ],
      durationSeconds: 12,
      width: 1080,
      height: 1920,
    });
    const footer = ass
      .split("\n")
      .find((line) => line.startsWith("Dialogue:") && line.includes("homecheff.eu"));
    assert.ok(footer);
    assert.equal(dialogueTimes(footer!).end, "0:00:12.00");
    assert.match(footer!, /\\fad\(220,0\)/);
  });
});

describe("story overlay v4 placement scoring", () => {
  it("busy bottom zone loses to clean top/center zone for title", () => {
    const v1 = makeV1Analysis();
    const bottomBox = {
      x: 0.28,
      y: 0.62,
      width: 0.22,
      height: 0.28,
      source: "object" as const,
      label: "person",
      confidence: 0.95,
    };
    const detection = mockDetection({
      objectDetections: [{ label: "person", confidence: 0.95, box: bottomBox }],
      combinedAvoidBoxes: [bottomBox],
    });
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const enhanced = computeEnhancedZoneScores(v1, detection, "generic");
    const placement = resolveObjectAwarePlacement({
      sceneText: "LOCAL TALENT IS EVERYWHERE",
      template: "title",
      detectionContext: detection,
      enhancedAnalysis: {
        ...v1,
        zones: enhanced,
        bestTopZone: v1.bestTopZone,
        bestCenterZone: v1.bestCenterZone,
        bestBottomZone: v1.bestBottomZone,
        bestOverallZone: v1.bestOverallZone,
      },
      width: 1080,
      height: 1920,
    });
    assert.ok(!placement.zoneId.startsWith("BOTTOM_"));
    delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  });

  it("object overlap penalty beats high contrast bottom score", () => {
    const v1 = makeV1Analysis();
    const zones = v1.zones.map((zone) => {
      if (zone.zoneId === "BOTTOM_CENTER") {
        return { ...zone, score: 92, contrast: 48, edgeDensity: 0.15 };
      }
      if (zone.zoneId === "TOP_CENTER") {
        return { ...zone, score: 55, contrast: 18, edgeDensity: 0.05 };
      }
      return zone;
    });
    const busyBottom = {
      x: 0.3,
      y: 0.62,
      width: 0.25,
      height: 0.25,
      source: "object" as const,
      label: "cell phone",
      confidence: 0.9,
    };
    const detection = mockDetection({
      objectDetections: [{ label: "cell phone", confidence: 0.9, box: busyBottom }],
      combinedAvoidBoxes: [busyBottom],
    });
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const enhanced = computeEnhancedZoneScores({ ...v1, zones }, detection, "generic");
    const bottomScore = enhanced.find((z) => z.zoneId === "BOTTOM_CENTER")!.score;
    const topScore = enhanced.find((z) => z.zoneId === "TOP_CENTER")!.score;
    assert.ok(topScore > bottomScore);
    delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  });

  it("title prefers upper-middle when safe", () => {
    const v1 = makeV1Analysis();
    const placement = resolveObjectAwarePlacement({
      sceneText: "THE SYSTEM WORKS",
      template: "title",
      detectionContext: mockDetection(),
      enhancedAnalysis: v1,
      width: 1080,
      height: 1920,
    });
    assert.ok(
      placement.zoneId.startsWith("TOP_") || placement.zoneId.startsWith("CENTER_"),
      placement.zoneId
    );
  });

  it("subtitle shares title horizontal anchor but keeps independent zone", () => {
    const v1 = makeV1Analysis();
    const detection = mockDetection();
    const placements = applyStoryReadingFlowToPlacements(
      resolveAllTemplatePlacements({
        sceneText: "TITLE AND SUBTITLE COPY",
        detectionContext: detection,
        enhancedAnalysis: v1,
        width: 1080,
        height: 1920,
      })
    );
    assert.equal(placements.subtitle.anchorX, placements.title.anchorX);
    assert.equal(placements.subtitle.placementReason, "grouped_with_title");
  });
});

describe("story overlay v4 shared render paths", () => {
  it("language rerender uses same timing/placement via buildStoryOverlayAss", async () => {
    const prepared = await prepareStorySceneTexts({
      project: {
        instantSceneTexts: [
          {
            template: "scene",
            heroText: "KOP",
            title: "TITLE",
            subtitle: "Sub",
          },
        ],
      },
      languageCode: "nl",
    });
    const ass = buildStoryOverlayAss({
      sceneTexts: prepared.sceneTexts,
      durationSeconds: 6,
      width: 1080,
      height: 1920,
    });
    const headline = ass.split("\n").find((line) => line.includes("KOP"));
    assert.ok(headline);
    assert.equal(dialogueTimes(headline!).start, "0:00:00.00");
    assert.match(headline!, /\\fad\(0,/);
  });

  it("repair/text rerender uses buildStoryOverlayAss in overlay export path", () => {
    const root = join(__dirname, "..");
    const overlaySrc = readFileSync(
      join(root, "server/animation-export/story-text-overlay.ts"),
      "utf8"
    );
    assert.match(overlaySrc, /buildStoryOverlayAss\(/);
    assert.match(overlaySrc, /resolveSceneOverlayStart/);
    assert.match(overlaySrc, /resolveSceneOverlayVisibleEnd/);
  });

  it("storyOverlayMotionTags supports instant and finaleHold modes", () => {
    assert.match(storyOverlayMotionTags(540, 200, { instant: true }), /\\fad\(0,220\)/);
    assert.doesNotMatch(storyOverlayMotionTags(540, 200, { instant: true }), /\\move\(/);
    assert.match(storyOverlayMotionTags(540, 200, { finaleHold: true }), /\\fad\(220,0\)/);
    assert.equal(
      resolveSceneOverlayVisibleEnd({
        sceneIndex: 1,
        sceneCount: 2,
        sceneEnd: 4.85,
        videoEnd: 5,
      }),
      5
    );
  });
});
