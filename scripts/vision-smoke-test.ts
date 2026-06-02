#!/usr/bin/env npx tsx
/** Smoke test for local vision detectors on a synthetic sample frame. */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { detectWithMediaPipe } from "../src/server/animation-export/local-vision/mediapipe-detector";
import { detectWithObjectDetector } from "../src/server/animation-export/local-vision/object-detector";
import { buildSceneDetectionContext } from "../src/server/animation-export/local-vision/scene-detection-context";
import { getVisionSetupDiagnostics } from "../src/server/animation-export/local-vision/vision-setup-validation";

async function main(): Promise<void> {
  process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES = "1";
  process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
  process.env.HC_SAFE_ZONE_DEBUG = "1";

  const diagnostics = await getVisionSetupDiagnostics(true);
  console.info("[vision-smoke] diagnostics:", JSON.stringify(diagnostics, null, 2));

  const sharp = (await import("sharp")).default;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-vision-smoke-"));
  const samplePath = path.join(workDir, "sample.png");

  await sharp({
    create: {
      width: 640,
      height: 640,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toFile(samplePath);

  const [mediaPipe, objectDetector, context] = await Promise.all([
    detectWithMediaPipe(samplePath),
    detectWithObjectDetector(samplePath),
    buildSceneDetectionContext(samplePath),
  ]);

  console.info("[vision-smoke] MediaPipe:", {
    count: mediaPipe.detections.length,
    failed: mediaPipe.failed ?? false,
    error: mediaPipe.error,
  });
  console.info("[vision-smoke] Object detector:", {
    count: objectDetector.detections.length,
    failed: objectDetector.failed ?? false,
    error: objectDetector.error,
    kind: objectDetector.detectorKind,
    labels: objectDetector.detections.slice(0, 5).map((d) => d.label),
  });
  console.info("[vision-smoke] context:", {
    avoidBoxes: context.combinedAvoidBoxes.length,
    failedDetectors: context.failedDetectors,
  });

  await fs.rm(workDir, { recursive: true, force: true });

  const objectReady =
    diagnostics.objectDetector.status === "READY" &&
    diagnostics.objectDetector.runtimeReady !== false;
  if (!objectReady || objectDetector.failed) {
    console.error("[vision-smoke] Object detector not operational.");
    process.exit(1);
  }

  if (diagnostics.mediaPipe.runtimeReady === false) {
    console.warn(
      "[vision-smoke] MediaPipe packages/models installed but Node runtime unsupported — fail-open verified."
    );
  } else if (mediaPipe.failed) {
    console.error("[vision-smoke] MediaPipe runtime failure.");
    process.exit(1);
  }

  console.info("[vision-smoke] pass — object detector operational; export fail-open path verified.");
}

main().catch((error) => {
  console.error("[vision-smoke] error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
