import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getObjectDetectorDownloadSpec,
  RTDETR_MODEL_FILENAME,
  resolveObjectDetectorModelDir,
  resolveObjectDetectorModelPathSync,
} from "@/server/animation-export/local-vision/object-detector-model-paths";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

describe("vision deployment (Render / Docker worker)", () => {
  it("Dockerfile.worker bakes RT-DETR at image build", async () => {
    const dockerfile = await fs.readFile(path.join(REPO_ROOT, "Dockerfile.worker"), "utf8");
    assert.match(dockerfile, /setup:vision-models/);
    assert.match(dockerfile, /--include-object-detector/);
    assert.match(dockerfile, /--kind=rtdetr/);
    assert.match(dockerfile, /HC_OBJECT_DETECTOR_MODEL_DIR=\/app\/models\/object-detector/);
    assert.doesNotMatch(dockerfile, /yolo|ultralytics|YOLO/i);
  });

  it("render.yaml points Render at Dockerfile.worker", async () => {
    const blueprint = await fs.readFile(path.join(REPO_ROOT, "render.yaml"), "utf8");
    assert.match(blueprint, /runtime:\s*docker/);
    assert.match(blueprint, /dockerfilePath:\s*\.\/Dockerfile\.worker/);
    assert.match(blueprint, /HC_OBJECT_DETECTOR_MODEL_DIR/);
    assert.match(blueprint, /rtdetr/);
  });

  it("build:worker script downloads RT-DETR and runs app build for native Render", async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    assert.match(
      pkg.scripts["build:worker"],
      /setup:vision-models.*--include-object-detector.*--kind=rtdetr.*&& npm run build/
    );
  });

  it("Render native runtime path matches setup output under process.cwd()", () => {
    const spec = getObjectDetectorDownloadSpec("rtdetr");
    const objectDir = resolveObjectDetectorModelDir();
    const setupModelPath = path.join(objectDir, spec.modelFile);
    const runtimeModelPath = resolveObjectDetectorModelPathSync();
    assert.equal(setupModelPath, runtimeModelPath);
    assert.ok(setupModelPath.includes(`${path.sep}models${path.sep}object-detector${path.sep}`));
  });

  it("does not reference AGPL YOLO model paths in deployment specs", () => {
    for (const kind of ["rtdetr", "mobilenet-ssd"] as const) {
      const spec = getObjectDetectorDownloadSpec(kind);
      assert.equal(spec.license.toLowerCase().includes("agpl"), false);
      assert.doesNotMatch(spec.url, /yolo|ultralytics/i);
    }
  });
});

describe("vision-setup-validation MODEL_MISSING / READY", () => {
  const saved: Record<string, string | undefined> = {};
  let tempModelPath: string | undefined;

  beforeEach(() => {
    for (const key of [
      "HC_ENABLE_OBJECT_SAFE_ZONES",
      "HC_OBJECT_DETECTOR_MODEL_PATH",
      "HC_OBJECT_DETECTOR_MODEL_DIR",
    ]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    if (tempModelPath) {
      await fs.rm(path.dirname(tempModelPath), { recursive: true, force: true }).catch(() => {});
      tempModelPath = undefined;
    }
  });

  it("reports MODEL_MISSING when enabled and file absent", async () => {
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-rtdetr-missing-"));
    tempModelPath = path.join(dir, RTDETR_MODEL_FILENAME);
    process.env.HC_OBJECT_DETECTOR_MODEL_DIR = dir;

    const diagnostics = await getVisionSetupDiagnostics(false);
    assert.equal(diagnostics.objectDetector.status, "MODEL_MISSING");
    assert.equal(diagnostics.objectDetector.modelPresent, false);
    assert.ok(
      diagnostics.objectDetector.warnings.some((w) => w.includes("Object detector model missing"))
    );
  });

  it("reports READY when model file exists (no runtime probe)", async () => {
    process.env.HC_ENABLE_OBJECT_SAFE_ZONES = "1";
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-rtdetr-test-"));
    tempModelPath = path.join(dir, RTDETR_MODEL_FILENAME);
    await fs.writeFile(tempModelPath, Buffer.alloc(2048, 1));
    process.env.HC_OBJECT_DETECTOR_MODEL_PATH = tempModelPath;

    const diagnostics = await getVisionSetupDiagnostics(false);
    assert.equal(diagnostics.objectDetector.modelPresent, true);
    assert.equal(diagnostics.objectDetector.status, "READY");
  });
});
