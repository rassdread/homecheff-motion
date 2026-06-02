#!/usr/bin/env npx tsx
/**
 * One-time setup: download local vision models for Safe Zone V3–V4.
 *
 * MediaPipe models (Apache 2.0) — downloaded by default.
 * Object detector ONNX (Apache 2.0) — only with --include-object-detector.
 *
 * Usage:
 *   npx tsx scripts/setup-vision-models.ts
 *   npx tsx scripts/setup-vision-models.ts --include-object-detector
 *   npx tsx scripts/setup-vision-models.ts --include-object-detector --kind=mobilenet-ssd
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { ObjectDetectorKind } from "../src/server/animation-export/local-vision/object-detector-types";
import {
  getObjectDetectorDownloadSpec,
  resolveObjectDetectorModelDir,
  writeObjectDetectorMetadata,
} from "../src/server/animation-export/local-vision/object-detector-model-paths";
import {
  MEDIAPIPE_MODEL_FILES,
  MEDIAPIPE_MODEL_URLS,
  resolveMediaPipeModelDir,
} from "../src/server/animation-export/local-vision/vision-model-paths";

async function downloadFile(url: string, destPath: string): Promise<number> {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const exists = await fs.access(destPath).then(() => true).catch(() => false);
  if (exists) {
    const stat = await fs.stat(destPath);
    console.info(`[setup:vision] skip (exists): ${destPath} (${stat.size} bytes)`);
    return stat.size;
  }

  console.info("[setup:vision] download started");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) from ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
  console.info("[setup:vision] download completed");
  return buffer.length;
}

function parseObjectDetectorKind(): ObjectDetectorKind {
  const kindArg = process.argv.find((arg) => arg.startsWith("--kind="));
  const kind = kindArg?.split("=")[1]?.trim().toLowerCase();
  if (kind === "rtdetr" || kind === "mobilenet-ssd") {
    return kind;
  }
  return "rtdetr";
}

async function main(): Promise<void> {
  const includeObjectDetector = process.argv.includes("--include-object-detector");
  const mediaPipeDir = resolveMediaPipeModelDir();

  console.info("[setup:vision] MediaPipe model dir:", mediaPipeDir);
  await fs.mkdir(mediaPipeDir, { recursive: true });

  for (const filename of MEDIAPIPE_MODEL_FILES) {
    await downloadFile(MEDIAPIPE_MODEL_URLS[filename], path.join(mediaPipeDir, filename));
  }

  if (includeObjectDetector) {
    const kind = parseObjectDetectorKind();
    const spec = getObjectDetectorDownloadSpec(kind);
    const objectDir = resolveObjectDetectorModelDir();
    await fs.mkdir(objectDir, { recursive: true });

    const modelPath = path.join(objectDir, spec.modelFile);
    console.info(`[setup:vision] Object detector kind: ${spec.kind} (${spec.license})`);
    console.info(`[setup:vision] Source: ${spec.source}`);
    console.info(`[setup:vision] Target path: ${modelPath}`);
    const bytes = await downloadFile(spec.url, modelPath);
    if (bytes < 1024) {
      throw new Error(`Downloaded model is too small (${bytes} bytes): ${spec.url}`);
    }

    await writeObjectDetectorMetadata({
      kind: spec.kind,
      modelFile: spec.modelFile,
      source: spec.source,
      license: spec.license,
      downloadedAt: new Date().toISOString(),
    });
    const metadataPath = path.join(objectDir, "model.json");
    console.info(`[setup:vision] model path: ${modelPath}`);
    console.info(`[setup:vision] model size: ${bytes} bytes`);
    console.info(`[setup:vision] wrote metadata: ${metadataPath}`);
    console.info(`[setup:vision] license: ${spec.license}`);
    console.info(`[setup:vision] model ready: ${modelPath}`);
  } else {
    console.info(
      "[setup:vision] Object detector skipped. Run with --include-object-detector to fetch a permissive ONNX model."
    );
  }

  console.info("[setup:vision] done.");
  console.info("[setup:vision] Install packages: npm install");
  console.info("[setup:vision] Enable flags:");
  console.info("  HC_ENABLE_MEDIAPIPE_SAFE_ZONES=1");
  console.info("  HC_ENABLE_OBJECT_SAFE_ZONES=1");
  console.info("  HC_OBJECT_DETECTOR_KIND=rtdetr   # optional: rtdetr | mobilenet-ssd");
}

main().catch((error) => {
  console.error("[setup:vision] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
