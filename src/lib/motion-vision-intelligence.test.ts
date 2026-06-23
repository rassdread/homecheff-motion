import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProvisionalVisionFromDetections } from "@/lib/motion-vision-from-detection";
import {
  buildMotionReferenceVisionSignals,
  aggregateMotionVisionWorkload,
} from "@/lib/motion-reference-vision-signals";
import { evaluateMotionVisualRequirement } from "@/lib/motion-vision-requirement-evaluator";
import { buildMotionIdentityLock } from "@/lib/motion-identity-lock";
import { buildMotionIdentityProfile } from "@/lib/motion-identity-profile";
import { resolveMotionAnalysisCache } from "@/lib/motion-analysis-cache";
import { resolveMotionPresetStoryboard } from "@/lib/motion-preset-storyboards";
import { evaluateMotionPresetPipeline } from "@/lib/motion-preset-engine-orchestrator";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";

const PORTRAIT_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Human",
    visualStyle: "Photo portrait",
    suggestedPreserve: ["face", "green shirt"],
    keyFeatures: ["green shirt"],
    identityFingerprint: { proportions: "portrait", faceStructure: "oval face" },
    confidence: 0.85,
  },
  { sourceName: "selfie" }
);

describe("motion vision intelligence", () => {
  it("builds provisional vision from RT-DETR person detection", () => {
    const vision = buildProvisionalVisionFromDetections({
      detections: [{ label: "person", confidence: 0.9, box: { x: 0.2, y: 0.1, w: 0.5, h: 0.8 } }],
      fileName: "selfie.jpg",
      width: 900,
      height: 1600,
    });
    assert.equal(vision.objectType, "human");
    assert.ok(vision.keyFeatures.length > 0);
  });

  it("vision signals detect face from portrait vision", () => {
    const signals = buildMotionReferenceVisionSignals({
      reference: {
        id: "r1",
        fileName: "selfie.jpg",
        visionAnalysis: PORTRAIT_VISION,
      },
    });
    assert.equal(signals.faceDetected, true);
    assert.equal(signals.source, "full_vision");
    assert.ok(signals.identityConfidence >= 70);
  });

  it("vision requirement evaluator uses signals for moonwalk full body", () => {
    const portraitSignals = buildMotionReferenceVisionSignals({
      reference: { id: "r1", fileName: "selfie.jpg", visionAnalysis: PORTRAIT_VISION },
    });
    const fullBodyVision = mapVisionJsonToAnalysis(
      {
        objectType: "Human",
        suggestedPreserve: ["full body", "feet visible"],
        identityFingerprint: { proportions: "full body" },
        confidence: 0.9,
      },
      { sourceName: "full" }
    );
    const fullSignals = buildMotionReferenceVisionSignals({
      reference: { id: "r2", fileName: "full.jpg", visionAnalysis: fullBodyVision },
    });
    assert.equal(
      evaluateMotionVisualRequirement({
        requirementId: "full_body_visible",
        references: [{ id: "r1" }],
        visionSignals: [portraitSignals],
      }),
      false
    );
    assert.equal(
      evaluateMotionVisualRequirement({
        requirementId: "full_body_visible",
        references: [{ id: "r2" }],
        visionSignals: [fullSignals],
      }),
      true
    );
  });

  it("motion ready cache zeroes analysis passes", () => {
    const workload = aggregateMotionVisionWorkload([
      buildMotionReferenceVisionSignals({
        reference: {
          id: "r1",
          motionReady: true,
          visionAnalysis: PORTRAIT_VISION,
          styleDna: { visualStyle: "cached" } as never,
        },
      }),
    ]);
    assert.equal(workload.cachedCount, 1);
    assert.equal(workload.requiredAnalysisPasses, 0);
  });

  it("identity lock includes consistency rules", () => {
    const cache = resolveMotionAnalysisCache({
      references: [{ id: "r1", visionAnalysis: PORTRAIT_VISION }],
    });
    const profile = buildMotionIdentityProfile({
      presetId: "moonwalk",
      references: [{ id: "r1", visionAnalysis: PORTRAIT_VISION }],
      cache,
      primaryReferenceId: "r1",
    });
    const lock = buildMotionIdentityLock({ profile });
    assert.ok(lock.combinedPromptBlock.includes("MOTION IDENTITY LOCK"));
    assert.ok(lock.consistencyRules.length >= 2);
  });

  it("preset storyboard has five scenes for moonwalk", () => {
    const board = resolveMotionPresetStoryboard("moonwalk");
    assert.equal(board.scenes.length, 5);
    assert.ok(board.structuredPromptBlock.includes("PRESET STORYBOARD"));
  });

  it("pipeline includes vision pipeline snapshot and quality score", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "podcast_clip",
      references: [{ id: "r1", visionAnalysis: PORTRAIT_VISION }],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
      visionSignals: [
        buildMotionReferenceVisionSignals({
          reference: { id: "r1", visionAnalysis: PORTRAIT_VISION },
        }),
      ],
    });
    assert.ok(snapshot.qualityValidation.qualityScore.overall > 0);
    assert.ok(snapshot.storyboard?.sceneCount === 5);
    assert.equal(snapshot.visionPipeline?.workloadFaceCount, 1);
  });
});
