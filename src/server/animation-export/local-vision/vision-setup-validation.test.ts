import path from "node:path";
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getVisionSetupDiagnostics,
  logVisionSetupWarningsOnce,
  resetVisionSetupWarningGuard,
} from "@/server/animation-export/local-vision/vision-setup-validation";
import {
  MEDIAPIPE_MODEL_FILES,
  resolveMediaPipeModelDir,
} from "@/server/animation-export/local-vision/vision-model-paths";
import {
  MOBILENET_SSD_MODEL_FILENAME,
  RTDETR_MODEL_FILENAME,
  resolveObjectDetectorModelDir,
  resolveObjectDetectorModelPathSync,
} from "@/server/animation-export/local-vision/object-detector-model-paths";

describe("vision-setup-validation", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      "HC_ENABLE_MEDIAPIPE_SAFE_ZONES",
      "HC_ENABLE_OBJECT_SAFE_ZONES",
      "HC_ENABLE_YOLO_SAFE_ZONES",
      "HC_SAFE_ZONE_DEBUG",
    ]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    resetVisionSetupWarningGuard();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetVisionSetupWarningGuard();
  });

  it("reports DISABLED when feature flags are off", async () => {
    const diagnostics = await getVisionSetupDiagnostics(false);
    assert.equal(diagnostics.mediaPipe.status, "DISABLED");
    assert.equal(diagnostics.objectDetector.status, "DISABLED");
    assert.equal(diagnostics.ok, true);
  });

  it("warns when enabled but models missing", async () => {
    process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES = "1";
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const diagnostics = await getVisionSetupDiagnostics(true);
    assert.equal(diagnostics.mediaPipe.enabled, true);
    assert.equal(diagnostics.objectDetector.enabled, true);
    assert.ok(diagnostics.warnings.some((w) => w.includes("Falling back to Safe Zone V1")));
    assert.equal(diagnostics.ok, false);
  });

  it("logVisionSetupWarningsOnce does not throw when flags off", async () => {
    await assert.doesNotReject(async () => logVisionSetupWarningsOnce());
  });

  it("exposes expected model paths", () => {
    assert.ok(resolveMediaPipeModelDir().endsWith(`${path.sep}mediapipe`));
    assert.ok(resolveObjectDetectorModelDir().endsWith(`${path.sep}object-detector`));
    assert.ok(resolveObjectDetectorModelPathSync().endsWith(RTDETR_MODEL_FILENAME));
    assert.equal(MEDIAPIPE_MODEL_FILES.length, 3);
  });

  it("uses mobilenet-ssd default filename when kind env set", () => {
    process.env.HC_OBJECT_DETECTOR_KIND = "mobilenet-ssd";
    assert.ok(resolveObjectDetectorModelPathSync().endsWith(MOBILENET_SSD_MODEL_FILENAME));
  });
});
