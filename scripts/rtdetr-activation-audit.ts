#!/usr/bin/env npx tsx
/**
 * RT-DETR activation audit — env, model path, runtime probe, placement sample.
 * Usage: HC_ENABLE_OBJECT_SAFE_ZONES=1 npx tsx scripts/rtdetr-activation-audit.ts
 */

import fs from "node:fs/promises";
import { buildSceneSafeZoneContext } from "../src/server/animation-export/enhanced-safe-zone";
import { analyzeSafeZonesFromBuffer } from "../src/server/animation-export/safe-zone-placement";
import { resolveObjectDetectorModelPath } from "../src/server/animation-export/local-vision/object-detector-model-paths";
import { getVisionSetupDiagnostics } from "../src/server/animation-export/local-vision/vision-setup-validation";
import { getOverlayEngineStatus } from "../src/server/animation-export/overlay-engine-status";
import { isObjectSafeZonesEnabled } from "../src/server/animation-export/local-vision/feature-flags";
import { resolveObjectDetectorKind } from "../src/server/animation-export/local-vision/object-detector-model-paths";

async function auditModelPath(): Promise<{
  status: "READY" | "MODEL_MISSING" | "PATH_INVALID";
  path: string;
  reason: string;
}> {
  let modelPath: string;
  try {
    modelPath = await resolveObjectDetectorModelPath();
  } catch (error) {
    return {
      status: "PATH_INVALID",
      path: "",
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    await fs.access(modelPath);
    const stat = await fs.stat(modelPath);
    if (!stat.isFile() || stat.size < 1024) {
      return {
        status: "MODEL_MISSING",
        path: modelPath,
        reason: "Model path exists but file is missing or too small.",
      };
    }
    return { status: "READY", path: modelPath, reason: "Model file readable." };
  } catch {
    return {
      status: "MODEL_MISSING",
      path: modelPath,
      reason: `No readable file at resolved path.`,
    };
  }
}

async function main(): Promise<void> {
  const envAudit = {
    HC_ENABLE_OBJECT_SAFE_ZONES: {
      current: process.env.HC_ENABLE_OBJECT_SAFE_ZONES ?? "(unset)",
      expected: "1",
      enabled: isObjectSafeZonesEnabled(),
    },
    HC_OBJECT_DETECTOR_KIND: {
      current: process.env.HC_OBJECT_DETECTOR_KIND ?? "(unset)",
      expected: "rtdetr",
      resolved: resolveObjectDetectorKind(),
    },
    HC_OBJECT_DETECTOR_MODEL_DIR: {
      current: process.env.HC_OBJECT_DETECTOR_MODEL_DIR ?? "(unset)",
      expected: "/app/models/object-detector (worker) or models/object-detector (local)",
    },
  };

  console.info("=== PART 1 — Environment ===");
  console.info(JSON.stringify(envAudit, null, 2));
  console.info(
    "Deploy alone activates detection:",
    envAudit.HC_ENABLE_OBJECT_SAFE_ZONES.enabled &&
      (await auditModelPath()).status === "READY"
      ? "YES (if runtime also READY)"
      : "NO — need flag + model + onnxruntime-node"
  );

  console.info("\n=== PART 2 — Model path ===");
  const model = await auditModelPath();
  console.info(JSON.stringify(model, null, 2));

  console.info("\n=== PART 3 — Runtime (probe) ===");
  if (!isObjectSafeZonesEnabled()) {
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    console.info("(temporarily set HC_ENABLE_OBJECT_SAFE_ZONES=1 for probe)");
  }
  const vision = await getVisionSetupDiagnostics(true);
  const runtimeStatus =
    vision.objectDetector.status === "READY" && vision.objectDetector.runtimeReady !== false
      ? "READY"
      : vision.objectDetector.status === "PACKAGE_MISSING"
        ? "PACKAGE_MISSING"
        : vision.objectDetector.status === "RUNTIME_UNSUPPORTED"
          ? "RUNTIME_UNSUPPORTED"
          : vision.objectDetector.status;
  console.info(
    JSON.stringify(
      {
        status: runtimeStatus,
        packageInstalled: vision.objectDetector.packageInstalled,
        runtimeReady: vision.objectDetector.runtimeReady,
        warnings: vision.objectDetector.warnings,
      },
      null,
      2
    )
  );

  const overlay = getOverlayEngineStatus(vision);
  console.info("\n=== Overlay engine card ===");
  console.info(JSON.stringify({ card: overlay.card, readinessScore: overlay.readinessScore }, null, 2));

  console.info("\n=== PART 5 — Placement sample (mock phone detection) ===");
  process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
  const quiet = Buffer.alloc(63 * 63 * 4, 0);
  for (let i = 0; i < quiet.length; i += 4) {
    quiet[i] = 100;
    quiet[i + 1] = 100;
    quiet[i + 2] = 100;
    quiet[i + 3] = 255;
  }
  const v1 = analyzeSafeZonesFromBuffer(quiet, 63, 63, 4);
  const phoneBox = {
    x: 0.55,
    y: 0.55,
    width: 0.12,
    height: 0.18,
    source: "object" as const,
    label: "cell phone",
    confidence: 0.85,
  };
  const ctxEarnings = buildSceneSafeZoneContext({
    detection: {
      safeZoneV1: v1,
      mediaPipeDetections: [],
      objectDetections: [{ label: "cell phone", confidence: 0.85, box: phoneBox }],
      combinedAvoidBoxes: [phoneBox],
      objectLabels: ["cell phone"],
      failedDetectors: [],
    },
    sceneText: "EARN MONEY FROM EVERY ORDER",
    width: 1080,
    height: 1920,
    accentWords: [],
  });

  const ctxRotterdam = buildSceneSafeZoneContext({
    detection: {
      safeZoneV1: v1,
      mediaPipeDetections: [],
      objectDetections: [],
      combinedAvoidBoxes: [],
      objectLabels: [],
      failedDetectors: [],
    },
    sceneText: "ROTTERDAM Hidden talent is everywhere.",
    width: 1080,
    height: 1920,
    accentWords: [],
  });
  const ctx = ctxEarnings;

  const rotterdamPlacement = {
    headline: {
      zone: ctx.placements.headline.zoneId,
      reason: ctx.placements.headline.placementReason,
      influencedByObject: ctx.placements.headline.placementReason !== "safe_zone_v1_fallback",
    },
    title: {
      zone: ctx.placements.title.zoneId,
      reason: ctx.placements.title.placementReason,
      influencedByObject: ctx.placements.title.placementReason !== "safe_zone_v1_fallback",
    },
    subtitle: {
      zone: ctx.placements.subtitle.zoneId,
      reason: ctx.placements.subtitle.placementReason,
      influencedByObject: ctx.placements.subtitle.placementReason !== "safe_zone_v1_fallback",
    },
    rotterdamSceneWithoutDetections: {
      headline: ctxRotterdam.placements.headline.placementReason,
      title: ctxRotterdam.placements.title.placementReason,
      subtitle: ctxRotterdam.placements.subtitle.placementReason,
    },
  };
  console.info(JSON.stringify(rotterdamPlacement, null, 2));

  console.info("\n=== Recommended production config ===");
  console.info(
    "Worker: HC_ENABLE_OBJECT_SAFE_ZONES=1, HC_OBJECT_DETECTOR_KIND=rtdetr, HC_OBJECT_DETECTOR_MODEL_DIR=/app/models/object-detector"
  );
  console.info("HC_SAFE_ZONE_DEBUG=0 in production (use 1 only for one-off validation).");
  console.info("Rebuild worker image after Dockerfile.worker change (models baked at build).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
