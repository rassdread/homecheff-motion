import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildSceneSafeZoneContext,
  computeEnhancedZoneScores,
  resolvePlacementForTemplate,
} from "@/server/animation-export/enhanced-safe-zone";
import { resolveObjectAwarePlacement } from "@/server/animation-export/object-aware-placement";
import { inferSceneIntent } from "@/server/animation-export/scene-intent-rules";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import {
  analyzeSafeZonesFromBuffer,
  heroPlacement,
  type SafeZoneAnalysis,
} from "@/server/animation-export/safe-zone-placement";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import { clearSceneDetectionContextCache } from "@/server/animation-export/local-vision/scene-detection-context";
import { detectWithMediaPipe } from "@/server/animation-export/local-vision/mediapipe-detector";
import { detectWithObjectDetector } from "@/server/animation-export/local-vision/object-detector";
import { objectLabelPenalty } from "@/server/animation-export/local-vision/object-detector";

const ENV_KEYS = [
  "HC_ENABLE_MEDIAPIPE_SAFE_ZONES",
  "HC_ENABLE_OBJECT_SAFE_ZONES",
  "HC_ENABLE_YOLO_SAFE_ZONES",
  "HC_SAFE_ZONE_DEBUG",
] as const;

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

describe("safe-zone V3–V6 enhanced scoring", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    clearSceneDetectionContextCache();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
    clearSceneDetectionContextCache();
  });

  it("face overlap reduces zone score", () => {
    const v1 = makeV1Analysis();
    const centerZone = v1.zones.find((z) => z.zoneId === "CENTER")!;
    const detection = mockDetection({
      mediaPipeDetections: [
        {
          type: "face",
          confidence: 1,
          box: { x: 0.28, y: 0.28, width: 0.15, height: 0.15 },
        },
      ],
      combinedAvoidBoxes: [
        {
          x: 0.28,
          y: 0.28,
          width: 0.15,
          height: 0.15,
          source: "mediapipe",
          label: "face",
          confidence: 1,
        },
      ],
    });
    process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES = "1";
    const enhanced = computeEnhancedZoneScores(v1, detection, "generic");
    const enhancedCenter = enhanced.find((z) => z.zoneId === "CENTER")!;
    assert.ok(enhancedCenter.score < centerZone.score);
  });

  it("phone overlap reduces zone score via object detector penalty", () => {
    const v1 = makeV1Analysis();
    const bottomCenter = v1.zones.find((z) => z.zoneId === "BOTTOM_CENTER")!;
    const detection = mockDetection({
      objectDetections: [
        {
          label: "cell phone",
          confidence: 0.9,
          box: { x: 0.28, y: 0.62, width: 0.2, height: 0.25 },
        },
      ],
      combinedAvoidBoxes: [
        {
          x: 0.28,
          y: 0.62,
          width: 0.2,
          height: 0.25,
          source: "object",
          label: "cell phone",
          confidence: 0.9,
        },
      ],
    });
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const enhanced = computeEnhancedZoneScores(v1, detection, "generic");
    const enhancedBottom = enhanced.find((z) => z.zoneId === "BOTTOM_CENTER")!;
    assert.ok(enhancedBottom.score < bottomCenter.score);
    assert.ok(objectLabelPenalty("cell phone", 0.9) >= 50);
  });

  it("object-aware earnings text prefers phone-adjacent zone", () => {
    const phoneBox = {
      x: 0.55,
      y: 0.55,
      width: 0.12,
      height: 0.18,
      source: "object" as const,
      label: "cell phone",
      confidence: 0.85,
    };
    const detection = mockDetection({
      objectDetections: [{ label: "cell phone", confidence: 0.85, box: phoneBox }],
      combinedAvoidBoxes: [phoneBox],
    });
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const ctx = buildSceneSafeZoneContext({
      detection,
      sceneText: "EARN MONEY FROM EVERY ORDER",
      width: 1080,
      height: 1920,
    });
    assert.equal(ctx.placements.hero.placementReason, "earnings_near_device");
    assert.ok(ctx.placements.hero.confidence >= 0.7);
  });

  it("community text avoids faces but stays near people", () => {
    const v1 = makeV1Analysis();
    const faceBox = {
      x: 0.28,
      y: 0.28,
      width: 0.12,
      height: 0.12,
      source: "mediapipe" as const,
      label: "face",
      confidence: 0.95,
    };
    const personBox = {
      x: 0.25,
      y: 0.22,
      width: 0.2,
      height: 0.35,
      source: "mediapipe" as const,
      label: "person",
      confidence: 0.9,
    };
    const detection = mockDetection({
      mediaPipeDetections: [
        { type: "face", confidence: 0.95, box: faceBox },
        { type: "person", confidence: 0.9, box: personBox },
      ],
      combinedAvoidBoxes: [faceBox, personBox],
    });
    process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES = "1";
    const placement = resolveObjectAwarePlacement({
      sceneText: "CONNECT WITH YOUR COMMUNITY",
      template: "hero",
      detectionContext: detection,
      enhancedAnalysis: computeEnhancedSafeZoneFrom(v1, detection, "community"),
      width: 1080,
      height: 1920,
    });
    assert.equal(placement.placementReason, "community_near_people_avoid_faces");
    assert.notEqual(placement.zoneId, "CENTER");
  });

  it("final movement prefers clean hero zone", () => {
    const v1 = makeV1Analysis();
    const detection = mockDetection();
    const placement = resolveObjectAwarePlacement({
      sceneText: "JOIN THE HOMECHEFF MOVEMENT",
      template: "heroFinale",
      detectionContext: detection,
      enhancedAnalysis: v1,
      width: 1080,
      height: 1920,
    });
    assert.equal(placement.placementReason, "final_movement_clean_hero_zone");
    assert.ok(["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT"].includes(placement.zoneId));
  });

  it("detector failure falls back to Safe Zone V1", async () => {
    process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES = "1";
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const mp = await detectWithMediaPipe("/nonexistent/frame.png");
    const objects = await detectWithObjectDetector("/nonexistent/frame.png");
    assert.equal(mp.detections.length, 0);
    assert.equal(objects.detections.length, 0);
    assert.ok(mp.failed || objects.failed);
  });

  it("missing model does not fail export scoring path", () => {
    const v1 = makeV1Analysis();
    const detection = mockDetection({
      failedDetectors: ["mediapipe:models missing", "object:model missing"],
    });
    const ctx = buildSceneSafeZoneContext({
      detection,
      sceneText: "GENERIC TEXT",
      width: 1080,
      height: 1920,
    });
    assert.deepEqual(ctx.enhanced.bestTopZone, v1.bestTopZone);
    assert.deepEqual(ctx.enhanced.bestBottomZone, v1.bestBottomZone);
  });

  it("feature flags off equals Safe Zone V1 zone winners", () => {
    const v1 = makeV1Analysis();
    const detection = mockDetection({
      mediaPipeDetections: [
        { type: "face", confidence: 1, box: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 } },
      ],
    });
    const ctx = buildSceneSafeZoneContext({
      detection,
      sceneText: "ANY TEXT",
      width: 1080,
      height: 1920,
    });
    assert.equal(ctx.enhanced.bestTopZone, v1.bestTopZone);
    assert.equal(ctx.enhanced.bestCenterZone, v1.bestCenterZone);
    assert.equal(ctx.enhanced.bestBottomZone, v1.bestBottomZone);
  });

  it("no external API calls in detector modules", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      return Promise.reject(new Error("fetch should not be called"));
    }) as typeof fetch;
    try {
      await detectWithMediaPipe("/tmp/test.png");
      await detectWithObjectDetector("/tmp/test.png");
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("ASS placement receives selected anchor from SceneSafeZoneContext", () => {
    const ctx = buildSceneSafeZoneContext({
      detection: mockDetection(),
      sceneText: "HERO LINE",
      width: 1080,
      height: 1920,
    });
    const hero = resolvePlacementForTemplate(ctx, "hero", 1080, 1920);
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "HERO LINE" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      safeZoneByIndex: new Map([[0, ctx]]),
    });
    assert.match(ass, new RegExp(`\\\\pos\\(${hero.anchorX},`));
  });

  it("inferSceneIntent is deterministic keyword matching", () => {
    assert.equal(inferSceneIntent("EARN MONEY"), "earnings");
    assert.equal(inferSceneIntent("CONNECT WITH PEOPLE"), "community");
    assert.equal(inferSceneIntent("RANDOM COPY"), "generic");
  });
});

function computeEnhancedSafeZoneFrom(
  v1: SafeZoneAnalysis,
  detection: SceneDetectionContext,
  intent: ReturnType<typeof inferSceneIntent>
): SafeZoneAnalysis {
  const zones = computeEnhancedZoneScores(v1, detection, intent);
  return {
    ...v1,
    zones,
    bestTopZone: v1.bestTopZone,
    bestCenterZone: v1.bestCenterZone,
    bestBottomZone: v1.bestBottomZone,
  };
}

describe("legacy Safe Zone V1 compat with enhanced context", () => {
  it("legacy SafeZoneAnalysis still works in buildStoryOverlayAss", () => {
    const v1 = makeV1Analysis();
    const hero = heroPlacement(v1, 1080, 1920);
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "LEGACY" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      safeZoneByIndex: new Map([[0, v1]]),
    });
    assert.match(ass, new RegExp(`\\\\pos\\(${hero.anchorX},`));
  });
});

import {
  resolveObjectDetectorModelPathSync,
} from "@/server/animation-export/local-vision/object-detector-model-paths";

describe("no YOLO references remain in detector paths", () => {
  it("default object detector path does not reference yolov8n", () => {
    const modelPath = resolveObjectDetectorModelPathSync();
    assert.ok(!modelPath.includes("yolov8n"));
    assert.ok(!modelPath.includes("yolo"));
  });
});
