/**
 * Safe Zone V4 — generic local ONNX object detection (optional, feature-flagged).
 * Supports permissive models only (RT-DETR, MobileNet SSD, custom ONNX).
 * No runtime network calls; model must exist locally before export.
 */

import fs from "node:fs/promises";
import {
  DETECTOR_TIMEOUT_MS,
  isObjectSafeZonesEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import { importOptionalModule } from "@/server/animation-export/local-vision/optional-import";
import {
  isPermissiveModelLicense,
  readObjectDetectorMetadata,
  resolveObjectDetectorKind,
  resolveObjectDetectorModelPath,
} from "@/server/animation-export/local-vision/object-detector-model-paths";
import {
  COCO_CLASS_NAMES,
  type ObjectDetection,
  type ObjectDetectionResult,
  type ObjectDetectorKind,
} from "@/server/animation-export/local-vision/object-detector-types";
import type { NormalizedBox } from "@/server/animation-export/local-vision/types";

const CONFIDENCE_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Object detection timed out")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function iou(a: NormalizedBox, b: NormalizedBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function nms(detections: ObjectDetection[]): ObjectDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: ObjectDetection[] = [];
  for (const det of sorted) {
    if (kept.every((k) => iou(k.box, det.box) < IOU_THRESHOLD)) {
      kept.push(det);
    }
  }
  return kept;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function cxcywhToNormalizedBox(
  cx: number,
  cy: number,
  w: number,
  h: number,
  imageW: number,
  imageH: number
): NormalizedBox {
  const x1 = (cx - w / 2) * imageW;
  const y1 = (cy - h / 2) * imageH;
  const x2 = (cx + w / 2) * imageW;
  const y2 = (cy + h / 2) * imageH;
  return {
    x: clamp01(x1 / imageW),
    y: clamp01(y1 / imageH),
    width: clamp01((x2 - x1) / imageW),
    height: clamp01((y2 - y1) / imageH),
  };
}

async function preprocessRtdetrImage(
  imagePath: string,
  inputH: number,
  inputW: number
): Promise<{ blob: Float32Array; imageW: number; imageH: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(imagePath).metadata();
  const imageW = meta.width ?? inputW;
  const imageH = meta.height ?? inputH;
  const ratioW = inputW / imageW;
  const ratioH = inputH / imageH;

  const { data } = await sharp(imagePath)
    .resize(Math.round(imageW * ratioW), Math.round(imageH * ratioH), { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const resizedW = Math.round(imageW * ratioW);
  const resizedH = Math.round(imageH * ratioH);
  const floatData = new Float32Array(3 * inputH * inputW);

  for (let y = 0; y < inputH; y += 1) {
    for (let x = 0; x < inputW; x += 1) {
      const srcY = Math.min(resizedH - 1, y);
      const srcX = Math.min(resizedW - 1, x);
      const srcIdx = (srcY * resizedW + srcX) * 3;
      const r = (data[srcIdx] ?? 0) / 255;
      const g = (data[srcIdx + 1] ?? 0) / 255;
      const b = (data[srcIdx + 2] ?? 0) / 255;
      floatData[y * inputW + x] = r;
      floatData[inputH * inputW + y * inputW + x] = g;
      floatData[2 * inputH * inputW + y * inputW + x] = b;
    }
  }

  return { blob: floatData, imageW, imageH };
}

function postprocessRtdetrOutput(
  raw: Float32Array,
  rows: number,
  cols: number,
  imageW: number,
  imageH: number
): ObjectDetection[] {
  const numClasses = cols - 4;
  const detections: ObjectDetection[] = [];

  for (let i = 0; i < rows; i += 1) {
    const offset = i * cols;
    const cx = raw[offset]!;
    const cy = raw[offset + 1]!;
    const w = raw[offset + 2]!;
    const h = raw[offset + 3]!;

    let bestClass = 0;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c += 1) {
      let score = raw[offset + 4 + c]!;
      if (!(score > 0 && score < 1)) {
        score = sigmoid(score);
      }
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }

    if (bestScore < CONFIDENCE_THRESHOLD) {
      continue;
    }

    detections.push({
      label: COCO_CLASS_NAMES[bestClass] ?? "unknown",
      confidence: bestScore,
      box: cxcywhToNormalizedBox(cx, cy, w, h, imageW, imageH),
    });
  }

  return detections;
}

async function runRtdetrDetection(
  session: Awaited<ReturnType<typeof import("onnxruntime-node")["InferenceSession"]["create"]>>,
  ort: typeof import("onnxruntime-node"),
  imagePath: string
): Promise<ObjectDetection[]> {
  const inputNode =
    session.inputNames.find((name: string) => name === "image") ?? session.inputNames[0]!;
  const inputMeta = session.inputMetadata[inputNode];
  const shape = inputMeta?.dimensions ?? [1, 3, 640, 640];
  const inputH = shape[2] ?? 640;
  const inputW = shape[3] ?? 640;

  const { blob, imageW, imageH } = await preprocessRtdetrImage(imagePath, inputH, inputW);
  const feeds = {
    [inputNode]: new ort.Tensor("float32", blob, [1, 3, inputH, inputW]),
  };
  const output = await session.run(feeds);
  const outputName = session.outputNames[0]!;
  const tensor = output[outputName]!;
  const data = tensor.data as Float32Array;
  const dims = tensor.dims;

  let rows = dims[1] ?? dims[0] ?? 0;
  let cols = dims[2] ?? dims[1] ?? 0;
  if (dims.length === 2) {
    rows = dims[0] ?? 0;
    cols = dims[1] ?? 0;
  }

  return postprocessRtdetrOutput(data, rows, cols, imageW, imageH);
}

async function runMobilenetSsdDetection(
  session: Awaited<ReturnType<typeof import("onnxruntime-node")["InferenceSession"]["create"]>>,
  ort: typeof import("onnxruntime-node"),
  imagePath: string
): Promise<ObjectDetection[]> {
  const sharp = (await import("sharp")).default;
  const inputSize = 300;

  const { data } = await sharp(imagePath)
    .resize(inputSize, inputSize, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const floatData = new Float32Array(3 * inputSize * inputSize);
  for (let y = 0; y < inputSize; y += 1) {
    for (let x = 0; x < inputSize; x += 1) {
      const srcIdx = (y * inputSize + x) * 3;
      const r = (data[srcIdx] ?? 0) / 255;
      const g = (data[srcIdx + 1] ?? 0) / 255;
      const b = (data[srcIdx + 2] ?? 0) / 255;
      floatData[y * inputSize + x] = r;
      floatData[inputSize * inputSize + y * inputSize + x] = g;
      floatData[2 * inputSize * inputSize + y * inputSize + x] = b;
    }
  }

  const inputName = session.inputNames[0]!;
  const feeds = {
    [inputName]: new ort.Tensor("float32", floatData, [1, 3, inputSize, inputSize]),
  };
  const output = await session.run(feeds);

  const boxesTensor =
    output["detection_boxes:0"] ??
    output[session.outputNames.find((n: string) => n.includes("boxes")) ?? session.outputNames[0]!]!;
  const scoresTensor =
    output["detection_scores:0"] ??
    output[session.outputNames.find((n: string) => n.includes("scores")) ?? session.outputNames[1]!]!;
  const classesTensor =
    output["detection_classes:0"] ??
    output[session.outputNames.find((n: string) => n.includes("classes")) ?? session.outputNames[2]!]!;

  const boxes = boxesTensor.data as Float32Array;
  const scores = scoresTensor.data as Float32Array;
  const classes = classesTensor.data as Float32Array;

  const detections: ObjectDetection[] = [];
  const count = Math.min(scores.length, 100);

  for (let i = 0; i < count; i += 1) {
    const score = scores[i]!;
    if (score < CONFIDENCE_THRESHOLD) {
      continue;
    }

    const classIdx = Math.round(classes[i]!) - 1;
    const ymin = boxes[i * 4]!;
    const xmin = boxes[i * 4 + 1]!;
    const ymax = boxes[i * 4 + 2]!;
    const xmax = boxes[i * 4 + 3]!;

    detections.push({
      label: COCO_CLASS_NAMES[classIdx] ?? "unknown",
      confidence: score,
      box: {
        x: clamp01(xmin),
        y: clamp01(ymin),
        width: clamp01(xmax - xmin),
        height: clamp01(ymax - ymin),
      },
    });
  }

  return detections;
}

async function runObjectDetection(imagePath: string): Promise<ObjectDetectionResult> {
  const metadata = await readObjectDetectorMetadata();
  const detectorKind: ObjectDetectorKind = metadata?.kind ?? resolveObjectDetectorKind();

  if (metadata && !isPermissiveModelLicense(metadata.license)) {
    return {
      detections: [],
      failed: true,
      error: `Object detector disabled: non-permissive model license (${metadata.license})`,
      detectorKind,
    };
  }

  const modelPath = await resolveObjectDetectorModelPath();
  const modelExists = await fs.access(modelPath).then(() => true).catch(() => false);
  if (!modelExists) {
    return {
      detections: [],
      failed: true,
      error: `Object detector model not found at ${modelPath}`,
      detectorKind,
    };
  }

  const ort = await importOptionalModule<typeof import("onnxruntime-node")>("onnxruntime-node");
  if (!ort) {
    return {
      detections: [],
      failed: true,
      error: "ONNX Runtime package not installed",
      detectorKind,
    };
  }

  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
  });

  try {
    let rawDetections: ObjectDetection[];
    if (detectorKind === "mobilenet-ssd") {
      rawDetections = await runMobilenetSsdDetection(session, ort, imagePath);
    } else {
      rawDetections = await runRtdetrDetection(session, ort, imagePath);
    }

    return {
      detections: nms(rawDetections).slice(0, 32),
      detectorKind,
    };
  } finally {
    await session.release();
  }
}

/** Detect objects on a sample frame using a local permissive ONNX model. */
export async function detectWithObjectDetector(imagePath: string): Promise<ObjectDetectionResult> {
  if (!isObjectSafeZonesEnabled()) {
    return { detections: [] };
  }

  try {
    return await withTimeout(runObjectDetection(imagePath), DETECTOR_TIMEOUT_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      detections: [],
      failed: true,
      error: message,
      detectorKind: resolveObjectDetectorKind(),
    };
  }
}

/** Penalty weight for a detected object label (used by safe-zone scoring). */
export function objectLabelPenalty(label: string, confidence: number): number {
  const lower = label.toLowerCase();
  if (lower === "cell phone") {
    return 60 * confidence;
  }
  if (lower === "laptop" || lower === "tv" || lower.includes("monitor") || lower.includes("screen")) {
    return 60 * confidence;
  }
  if (lower === "person") {
    return 70 * confidence;
  }
  if (
    lower.includes("food") ||
    lower.includes("pizza") ||
    lower.includes("sandwich") ||
    lower.includes("apple") ||
    lower.includes("banana") ||
    lower.includes("orange") ||
    lower.includes("broccoli") ||
    lower.includes("carrot") ||
    lower.includes("hot dog") ||
    lower.includes("donut") ||
    lower.includes("cake") ||
    lower === "bowl" ||
    lower === "bottle" ||
    lower === "wine glass" ||
    lower === "cup" ||
    lower === "dining table" ||
    lower === "potted plant"
  ) {
    return 35 * confidence;
  }
  if (confidence >= 0.6) {
    return 25 * confidence;
  }
  return 0;
}
