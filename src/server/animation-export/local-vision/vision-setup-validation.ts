/**
 * Startup / admin validation for local vision detectors.
 * Warn-only — never throws; export always falls back to Safe Zone V1.
 */

import fs from "node:fs/promises";
import {
  isMediaPipeSafeZonesEnabled,
  isObjectSafeZonesEnabled,
  isSafeZoneDebugEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import { importOptionalModule } from "@/server/animation-export/local-vision/optional-import";
import {
  isPermissiveModelLicense,
  readObjectDetectorMetadata,
  resolveObjectDetectorKind,
  resolveObjectDetectorModelPath,
} from "@/server/animation-export/local-vision/object-detector-model-paths";
import type { ObjectDetectorKind } from "@/server/animation-export/local-vision/object-detector-types";
import {
  MEDIAPIPE_MODEL_FILES,
  resolveMediaPipeModelDir,
  resolveMediaPipeModelPath,
  resolveMediaPipeWasmDir,
} from "@/server/animation-export/local-vision/vision-model-paths";

export type VisionDetectorStatus =
  | "READY"
  | "DISABLED"
  | "PACKAGE_MISSING"
  | "MODEL_MISSING"
  | "RUNTIME_UNSUPPORTED"
  | "LICENSE_BLOCKED";

export type VisionDetectorDiagnostics = {
  status: VisionDetectorStatus;
  enabled: boolean;
  packageInstalled: boolean;
  modelPresent: boolean;
  modelPath: string;
  missingModels?: string[];
  warnings: string[];
  runtimeReady?: boolean;
  detectorKind?: ObjectDetectorKind;
  modelLicense?: string;
  licensePermissive?: boolean;
};

export type VisionSetupDiagnostics = {
  checkedAt: string;
  featureFlags: {
    mediaPipe: boolean;
    objectDetector: boolean;
    safeZoneDebug: boolean;
  };
  mediaPipe: VisionDetectorDiagnostics;
  objectDetector: VisionDetectorDiagnostics;
  ok: boolean;
  warnings: string[];
};

let startupWarningsLogged = false;

async function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function probeMediaPipeRuntime(): Promise<boolean> {
  try {
    const { ensureMediaPipeNodeRuntime } = await import(
      "@/server/animation-export/local-vision/mediapipe-node-runtime"
    );
    ensureMediaPipeNodeRuntime();
    const vision = await importOptionalModule<typeof import("@mediapipe/tasks-vision")>(
      "@mediapipe/tasks-vision"
    );
    if (!vision) {
      return false;
    }
    const wasmPath = resolveMediaPipeWasmDir();
    if (!(await fileExists(wasmPath))) {
      return false;
    }
    const faceModel = resolveMediaPipeModelPath("blaze_face_short_range.tflite");
    if (!(await fileExists(faceModel))) {
      return false;
    }

    const probe = Promise.race([
      (async () => {
        const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath);
        const detector = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: faceModel, delegate: "CPU" },
          runningMode: "IMAGE",
        });
        detector.close();
        return true;
      })(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
    ]);
    return await probe;
  } catch {
    return false;
  }
}

async function probeObjectDetectorRuntime(): Promise<boolean> {
  try {
    const ort = await importOptionalModule<typeof import("onnxruntime-node")>("onnxruntime-node");
    const modelPath = await resolveObjectDetectorModelPath();
    if (!ort || !(await fileExists(modelPath))) {
      return false;
    }
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
    });
    await session.release();
    return true;
  } catch {
    return false;
  }
}

async function checkPackage(specifier: string): Promise<boolean> {
  const mod = await importOptionalModule(specifier);
  return mod != null;
}

async function checkMediaPipeModels(): Promise<{ present: boolean; missing: string[] }> {
  const missing: string[] = [];
  for (const filename of MEDIAPIPE_MODEL_FILES) {
    const exists = await fileExists(resolveMediaPipeModelPath(filename));
    if (!exists) {
      missing.push(filename);
    }
  }
  return { present: missing.length === 0, missing };
}

export async function getVisionSetupDiagnostics(probe = false): Promise<VisionSetupDiagnostics> {
  const mediaPipeEnabled = isMediaPipeSafeZonesEnabled();
  const objectDetectorEnabled = isObjectSafeZonesEnabled();
  const warnings: string[] = [];

  const mediaPipeModelDir = resolveMediaPipeModelDir();
  const objectModelPath = await resolveObjectDetectorModelPath();
  const objectMetadata = await readObjectDetectorMetadata();
  const objectLicense = objectMetadata?.license;
  const licensePermissive = objectLicense ? isPermissiveModelLicense(objectLicense) : undefined;
  const detectorKind = objectMetadata?.kind ?? resolveObjectDetectorKind();

  let mediaPipePackage = false;
  let objectPackage = false;
  if (probe || mediaPipeEnabled || objectDetectorEnabled) {
    if (mediaPipeEnabled || probe) {
      mediaPipePackage = await checkPackage("@mediapipe/tasks-vision");
    }
    if (objectDetectorEnabled || probe) {
      objectPackage = await checkPackage("onnxruntime-node");
    }
  }

  const mediaPipeModels = await checkMediaPipeModels();
  const objectModelPresent = await fileExists(objectModelPath);
  const wasmPresent = await fileExists(resolveMediaPipeWasmDir());

  const mediaPipe: VisionDetectorDiagnostics = {
    enabled: mediaPipeEnabled,
    packageInstalled: mediaPipePackage,
    modelPresent: mediaPipeModels.present,
    modelPath: mediaPipeModelDir,
    missingModels: mediaPipeModels.missing,
    warnings: [],
    status: "DISABLED",
  };

  const objectDetector: VisionDetectorDiagnostics = {
    enabled: objectDetectorEnabled,
    packageInstalled: objectPackage,
    modelPresent: objectModelPresent,
    modelPath: objectModelPath,
    warnings: [],
    status: "DISABLED",
    detectorKind,
    modelLicense: objectLicense,
    licensePermissive,
  };

  if (!mediaPipeEnabled) {
    mediaPipe.status = "DISABLED";
  } else if (!mediaPipePackage) {
    mediaPipe.status = "PACKAGE_MISSING";
    mediaPipe.warnings.push("@mediapipe/tasks-vision is not installed.");
  } else if (!mediaPipeModels.present) {
    mediaPipe.status = "MODEL_MISSING";
    mediaPipe.warnings.push(
      `MediaPipe models missing in ${mediaPipeModelDir}: ${mediaPipeModels.missing.join(", ")}`
    );
  } else if (!wasmPresent) {
    mediaPipe.status = "PACKAGE_MISSING";
    mediaPipe.warnings.push("MediaPipe WASM assets missing from node_modules/@mediapipe/tasks-vision/wasm.");
  } else {
    mediaPipe.status = "READY";
  }

  if (!objectDetectorEnabled) {
    objectDetector.status = "DISABLED";
  } else if (objectMetadata && objectLicense && !isPermissiveModelLicense(objectLicense)) {
    objectDetector.status = "LICENSE_BLOCKED";
    objectDetector.warnings.push(
      `Object detector model license is not permissive (${objectLicense}). Detector disabled.`
    );
  } else if (!objectPackage) {
    objectDetector.status = "PACKAGE_MISSING";
    objectDetector.warnings.push("onnxruntime-node is not installed.");
  } else if (!objectModelPresent) {
    objectDetector.status = "MODEL_MISSING";
    objectDetector.warnings.push(`Object detector model missing at ${objectModelPath}`);
  } else {
    objectDetector.status = "READY";
  }

  if (probe) {
    if (mediaPipe.status === "READY") {
      mediaPipe.runtimeReady = await probeMediaPipeRuntime();
      if (!mediaPipe.runtimeReady) {
        mediaPipe.status = "RUNTIME_UNSUPPORTED";
        mediaPipe.warnings.push(
          "@mediapipe/tasks-vision assets are installed but Node.js runtime initialization is not supported yet. Safe Zone V1 fallback remains active."
        );
      }
    }
    if (objectDetector.status === "READY") {
      objectDetector.runtimeReady = await probeObjectDetectorRuntime();
      if (!objectDetector.runtimeReady) {
        objectDetector.status = "RUNTIME_UNSUPPORTED";
        objectDetector.warnings.push("onnxruntime-node failed to load the object detector model.");
      }
    }
  }

  if (mediaPipeEnabled && mediaPipe.status !== "READY") {
    warnings.push("[vision] MediaPipe enabled but not ready. Falling back to Safe Zone V1.");
    warnings.push(...mediaPipe.warnings);
  }
  if (objectDetectorEnabled && objectDetector.status !== "READY") {
    warnings.push("[vision] Object detector enabled but not ready. Falling back to Safe Zone V1.");
    warnings.push(...objectDetector.warnings);
  }

  return {
    checkedAt: new Date().toISOString(),
    featureFlags: {
      mediaPipe: mediaPipeEnabled,
      objectDetector: objectDetectorEnabled,
      safeZoneDebug: isSafeZoneDebugEnabled(),
    },
    mediaPipe,
    objectDetector,
    ok:
      (!mediaPipeEnabled || mediaPipe.status === "READY") &&
      (!objectDetectorEnabled || objectDetector.status === "READY"),
    warnings,
  };
}

/** Log vision setup warnings once at process startup (worker / server). */
export async function logVisionSetupWarningsOnce(): Promise<void> {
  if (startupWarningsLogged) {
    return;
  }
  startupWarningsLogged = true;

  if (!isMediaPipeSafeZonesEnabled() && !isObjectSafeZonesEnabled()) {
    return;
  }

  const diagnostics = await getVisionSetupDiagnostics(true);
  for (const warning of diagnostics.warnings) {
    console.warn(warning);
  }
  if (diagnostics.ok) {
    console.info("[vision] Local detectors ready.", {
      mediaPipe: diagnostics.mediaPipe.status,
      objectDetector: diagnostics.objectDetector.status,
    });
  }
}

/** Reset startup guard (tests only). */
export function resetVisionSetupWarningGuard(): void {
  startupWarningsLogged = false;
}
