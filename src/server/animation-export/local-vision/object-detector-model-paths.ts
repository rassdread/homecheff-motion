/** Paths, metadata, and license checks for permissive ONNX object detectors. */

import fs from "node:fs/promises";
import path from "node:path";
import type {
  ObjectDetectorKind,
  ObjectDetectorModelMetadata,
} from "@/server/animation-export/local-vision/object-detector-types";

export const RTDETR_MODEL_FILENAME = "rtdetr.onnx";
export const MOBILENET_SSD_MODEL_FILENAME = "ssd_mobilenet_v1_12.onnx";

/** PaddleDetection RT-DETR weights (Apache-2.0) via community ONNX export. */
export const RTDETR_MODEL_DOWNLOAD = {
  kind: "rtdetr" as const,
  modelFile: RTDETR_MODEL_FILENAME,
  url:
    "https://github.com/CVHub520/rtdetr-onnxruntime-deploy/releases/download/v1.0.0/rtdetr_r50vd_6x_coco_cvhub.onnx",
  source: "PaddleDetection RT-DETR r50vd (Apache-2.0), ONNX community export",
  license: "Apache-2.0",
};

/** ONNX Model Zoo SSD MobileNet v1 (Apache-2.0). */
export const MOBILENET_SSD_MODEL_DOWNLOAD = {
  kind: "mobilenet-ssd" as const,
  modelFile: MOBILENET_SSD_MODEL_FILENAME,
  url:
    "https://github.com/onnx/models/raw/main/validated/vision/object_detection_segmentation/ssd_mobilenet_v1/model/ssd_mobilenet_v1_12.onnx",
  source: "ONNX Model Zoo SSD MobileNet v1",
  license: "Apache-2.0",
};

let deprecatedYoloModelPathLogged = false;

export function resolveObjectDetectorModelDir(): string {
  return (
    process.env.HC_OBJECT_DETECTOR_MODEL_DIR?.trim() ||
    path.join(process.cwd(), "models", "object-detector")
  );
}

export function resolveObjectDetectorMetadataPath(): string {
  return path.join(resolveObjectDetectorModelDir(), "model.json");
}

export function resolveObjectDetectorKind(): ObjectDetectorKind {
  const fromEnv = process.env.HC_OBJECT_DETECTOR_KIND?.trim().toLowerCase();
  if (fromEnv === "rtdetr" || fromEnv === "mobilenet-ssd" || fromEnv === "custom-onnx") {
    return fromEnv;
  }
  return "rtdetr";
}

export async function readObjectDetectorMetadata(): Promise<ObjectDetectorModelMetadata | null> {
  try {
    const raw = await fs.readFile(resolveObjectDetectorMetadataPath(), "utf8");
    return JSON.parse(raw) as ObjectDetectorModelMetadata;
  } catch {
    return null;
  }
}

export async function writeObjectDetectorMetadata(
  metadata: ObjectDetectorModelMetadata
): Promise<void> {
  const dir = resolveObjectDetectorModelDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolveObjectDetectorMetadataPath(), `${JSON.stringify(metadata, null, 2)}\n`);
}

export function isBlockedModelLicense(license: string): boolean {
  const normalized = license.trim().toLowerCase();
  const blocked = [
    "agpl",
    "gpl",
    "non-commercial",
    "non commercial",
    "research-only",
    "research only",
    "-nc",
  ];
  return blocked.some((token) => normalized.includes(token));
}

export function isPermissiveModelLicense(license: string): boolean {
  if (!license.trim() || isBlockedModelLicense(license)) {
    return false;
  }
  const normalized = license.trim().toLowerCase();
  const allowed = ["apache-2.0", "apache 2.0", "mit", "bsd-2-clause", "bsd-3-clause", "bsd", "cc-by"];
  return allowed.some((token) => normalized.includes(token));
}

function warnDeprecatedYoloModelPathOnce(): void {
  if (deprecatedYoloModelPathLogged) {
    return;
  }
  if (process.env.HC_YOLO_MODEL_PATH?.trim()) {
    deprecatedYoloModelPathLogged = true;
    console.warn("HC_YOLO_MODEL_PATH is deprecated. Use HC_OBJECT_DETECTOR_MODEL_PATH.");
  }
}

export async function resolveObjectDetectorModelPath(): Promise<string> {
  const explicit = process.env.HC_OBJECT_DETECTOR_MODEL_PATH?.trim();
  if (explicit) {
    return explicit;
  }

  warnDeprecatedYoloModelPathOnce();
  const deprecated = process.env.HC_YOLO_MODEL_PATH?.trim();
  if (deprecated) {
    return deprecated;
  }

  const metadata = await readObjectDetectorMetadata();
  if (metadata?.modelFile) {
    return path.join(resolveObjectDetectorModelDir(), metadata.modelFile);
  }

  const kind = resolveObjectDetectorKind();
  const defaultFile =
    kind === "mobilenet-ssd" ? MOBILENET_SSD_MODEL_FILENAME : RTDETR_MODEL_FILENAME;
  return path.join(resolveObjectDetectorModelDir(), defaultFile);
}

export function resolveObjectDetectorModelPathSync(
  metadata: ObjectDetectorModelMetadata | null = null
): string {
  const explicit = process.env.HC_OBJECT_DETECTOR_MODEL_PATH?.trim();
  if (explicit) {
    return explicit;
  }

  if (metadata?.modelFile) {
    return path.join(resolveObjectDetectorModelDir(), metadata.modelFile);
  }

  const kind = resolveObjectDetectorKind();
  const defaultFile =
    kind === "mobilenet-ssd" ? MOBILENET_SSD_MODEL_FILENAME : RTDETR_MODEL_FILENAME;
  return path.join(resolveObjectDetectorModelDir(), defaultFile);
}

export function getObjectDetectorDownloadSpec(
  kind: ObjectDetectorKind
): typeof RTDETR_MODEL_DOWNLOAD | typeof MOBILENET_SSD_MODEL_DOWNLOAD {
  return kind === "mobilenet-ssd" ? MOBILENET_SSD_MODEL_DOWNLOAD : RTDETR_MODEL_DOWNLOAD;
}

/** Reset deprecation guard (tests only). */
export function resetObjectDetectorDeprecationGuards(): void {
  deprecatedYoloModelPathLogged = false;
}
