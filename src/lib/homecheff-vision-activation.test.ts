import assert from "node:assert/strict";
import test from "node:test";
import { getOverlayEngineStatus } from "@/server/animation-export/overlay-engine-status";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import { resetFeatureFlagDeprecationGuards } from "@/server/animation-export/local-vision/feature-flags";
import { getOcrHealthSnapshot } from "@/server/image-text-detection/ocr-health";
import { analyzePublishVideoFrames } from "@/lib/publish-video-analysis";
import {
  buildOverlayStatusReasons,
  getSam2OptionalStatus,
  resolveOcrStatusReason,
  resolvePublishVisionActivation,
  resolveSafeZoneFallbackReason,
  VISION_FEATURE_IMPACT,
} from "@/lib/vision-activation";

function disabledVision(): VisionSetupDiagnostics {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    featureFlags: { mediaPipe: false, objectDetector: false, safeZoneDebug: false },
    warnings: [],
    mediaPipe: { status: "DISABLED", enabled: false, packageInstalled: false, modelPresent: false, modelPath: "", warnings: [] },
    objectDetector: { status: "DISABLED", enabled: false, packageInstalled: false, modelPresent: false, modelPath: "", warnings: [] },
  };
}

function readyObjectVision(): VisionSetupDiagnostics {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    featureFlags: { mediaPipe: false, objectDetector: true, safeZoneDebug: false },
    warnings: [],
    mediaPipe: { status: "DISABLED", enabled: false, packageInstalled: false, modelPresent: false, modelPath: "", warnings: [] },
    objectDetector: {
      status: "READY",
      enabled: true,
      packageInstalled: true,
      modelPresent: true,
      modelPath: "/models/rtdetr.onnx",
      warnings: [],
      runtimeReady: true,
      detectorKind: "rtdetr",
    },
  };
}

test("OCR snapshot reports missing provider", () => {
  const prevGoogle = process.env.GOOGLE_VISION_API_KEY;
  const prevOpenAi = process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_VISION_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const snap = getOcrHealthSnapshot();
  assert.equal(snap.ok, false);
  assert.equal(snap.provider, "none");
  if (prevGoogle) process.env.GOOGLE_VISION_API_KEY = prevGoogle;
  if (prevOpenAi) process.env.OPENAI_API_KEY = prevOpenAi;
});

test("object detector ready improves overlay status", () => {
  resetFeatureFlagDeprecationGuards();
  process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
  const status = getOverlayEngineStatus(readyObjectVision());
  assert.equal(status.card.objectDetection, "ACTIVE");
  assert.equal(status.cardReasons.objectDetection.label, "ACTIVE");
  assert.ok(status.cardReasons.objectDetection.reason.includes("ONNX"));
});

test("safe zone fallback reason when flags off", () => {
  delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  delete process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES;
  resetFeatureFlagDeprecationGuards();
  const reason = resolveSafeZoneFallbackReason(disabledVision());
  assert.match(reason, /HC_ENABLE_OBJECT_SAFE_ZONES/);
});

test("publish analysis vision-enhanced when OCR configured", () => {
  const prev = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  const analysis = analyzePublishVideoFrames({ durationSec: 10, aspectRatio: 9 / 16 });
  assert.equal(analysis.visionMode, "vision-enhanced");
  assert.ok(analysis.detectedLabels.includes("ocr_text_avoidance"));
  if (prev) process.env.OPENAI_API_KEY = prev;
  else delete process.env.OPENAI_API_KEY;
});

test("publish analysis heuristic without vision env", () => {
  const prevG = process.env.GOOGLE_VISION_API_KEY;
  const prevO = process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_VISION_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  resetFeatureFlagDeprecationGuards();
  const analysis = analyzePublishVideoFrames({
    durationSec: 10,
    vision: resolvePublishVisionActivation(),
  });
  assert.equal(analysis.visionMode, "heuristic");
  if (prevG) process.env.GOOGLE_VISION_API_KEY = prevG;
  if (prevO) process.env.OPENAI_API_KEY = prevO;
});

test("SAM2 is optional for launch", () => {
  const sam2 = getSam2OptionalStatus();
  assert.equal(sam2.optionalForLaunch, true);
  assert.equal(sam2.launchRequired, false);
});

test("feature impact table covers core services", () => {
  const services = new Set(VISION_FEATURE_IMPACT.map((r) => r.service));
  assert.ok(services.has("motion"));
  assert.ok(services.has("publish"));
  assert.ok(services.has("editor"));
});

test("overlay status reasons explain disabled object detection", () => {
  resetFeatureFlagDeprecationGuards();
  delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  const reasons = buildOverlayStatusReasons(disabledVision());
  assert.equal(reasons.objectDetection.label, "DISABLED");
  assert.match(reasons.objectDetection.reason, /HC_ENABLE_OBJECT_SAFE_ZONES/);
});

test("OCR status reason includes provider when configured", () => {
  const prev = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test";
  const reason = resolveOcrStatusReason();
  assert.equal(reason.label, "ACTIVE");
  assert.match(reason.reason, /openai/i);
  if (prev) process.env.OPENAI_API_KEY = prev;
  else delete process.env.OPENAI_API_KEY;
});
