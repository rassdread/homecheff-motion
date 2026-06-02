import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getOverlayEngineStatus,
  type OverlayEngineReadiness,
} from "@/server/animation-export/overlay-engine-status";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import { resetFeatureFlagDeprecationGuards } from "@/server/animation-export/local-vision/feature-flags";

function disabledVision(): VisionSetupDiagnostics {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    featureFlags: { mediaPipe: false, objectDetector: false, safeZoneDebug: false },
    warnings: [],
    mediaPipe: {
      status: "DISABLED",
      enabled: false,
      packageInstalled: false,
      modelPresent: false,
      modelPath: "",
      warnings: [],
    },
    objectDetector: {
      status: "DISABLED",
      enabled: false,
      packageInstalled: false,
      modelPresent: false,
      modelPath: "",
      warnings: [],
    },
  };
}

function readyObjectVision(): VisionSetupDiagnostics {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    featureFlags: { mediaPipe: false, objectDetector: true, safeZoneDebug: false },
    warnings: [],
    mediaPipe: {
      status: "DISABLED",
      enabled: false,
      packageInstalled: false,
      modelPresent: false,
      modelPath: "",
      warnings: [],
    },
    objectDetector: {
      status: "READY",
      enabled: true,
      packageInstalled: true,
      modelPresent: true,
      modelPath: "/app/models/object-detector/rtdetr.onnx",
      warnings: [],
      runtimeReady: true,
      detectorKind: "rtdetr",
    },
  };
}

describe("getOverlayEngineStatus", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    resetFeatureFlagDeprecationGuards();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
    resetFeatureFlagDeprecationGuards();
  });

  it("reports FALLBACK safe zones when vision flags are off", () => {
    delete process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
    delete process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES;
    const status = getOverlayEngineStatus(disabledVision());
    assert.equal(status.card.safeZones, "FALLBACK");
    assert.equal(status.card.objectDetection, "DISABLED");
    assert.equal(status.card.typography, "ACTIVE");
    assert.equal(status.card.placement, "ACTIVE");
    assert.equal(status.card.timing, "ACTIVE");
    assert.ok(status.readinessScore > 0 && status.readinessScore <= 100);
    assert.ok(status.capabilities.some((c) => c.id === "safe_zone_v1" && c.usedInRenderPipeline));
  });

  it("reports READY object detection when flag on and probe ready", () => {
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const status = getOverlayEngineStatus(readyObjectVision());
    assert.equal(status.card.objectDetection, "READY");
    assert.equal(status.card.safeZones, "READY");
    const rtdetr = status.capabilities.find((c) => c.id === "rtdetr");
    assert.ok(rtdetr?.usedInRenderPipeline);
  });

  it("lists inactive local vision when flags off", () => {
    const status = getOverlayEngineStatus(disabledVision());
    assert.ok(
      status.inactiveFeatures.some((line) => line.includes("Local vision flags off"))
    );
  });

  it("includes timing and language rerender capabilities as active", () => {
    const status: OverlayEngineReadiness = getOverlayEngineStatus(disabledVision());
    const timing = status.capabilities.find((c) => c.id === "timing_windows");
    const stagger = status.capabilities.find((c) => c.id === "staggered_reveals");
    const lang = status.capabilities.find((c) => c.id === "language_rerender");
    assert.equal(timing?.usedInRenderPipeline, true);
    assert.equal(stagger?.usedInRenderPipeline, true);
    assert.equal(lang?.usedInRenderPipeline, true);
  });
});
