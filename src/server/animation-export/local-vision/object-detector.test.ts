import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isBlockedModelLicense,
  isPermissiveModelLicense,
  resetObjectDetectorDeprecationGuards,
} from "@/server/animation-export/local-vision/object-detector-model-paths";
import {
  isObjectSafeZonesEnabled,
  isYoloSafeZonesEnabled,
  resetFeatureFlagDeprecationGuards,
} from "@/server/animation-export/local-vision/feature-flags";
import { objectLabelPenalty } from "@/server/animation-export/local-vision/object-detector";

describe("object-detector licensing and flags", () => {
  const saved: Record<string, string | undefined> = {};
  const warnMessages: string[] = [];
  const originalWarn = console.warn;

  beforeEach(() => {
    for (const key of [
      "HC_ENABLE_OBJECT_SAFE_ZONES",
      "HC_ENABLE_YOLO_SAFE_ZONES",
      "HC_YOLO_MODEL_PATH",
    ]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    warnMessages.length = 0;
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args.map(String).join(" "));
    };
    resetFeatureFlagDeprecationGuards();
    resetObjectDetectorDeprecationGuards();
  });

  afterEach(() => {
    console.warn = originalWarn;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetFeatureFlagDeprecationGuards();
    resetObjectDetectorDeprecationGuards();
  });

  it("object detector disabled by default", () => {
    assert.equal(isObjectSafeZonesEnabled(), false);
  });

  it("YOLO env flag logs deprecated warning and does not enable detection", () => {
    process.env.HC_ENABLE_YOLO_SAFE_ZONES = "1";
    assert.equal(isYoloSafeZonesEnabled(), false);
    assert.equal(isObjectSafeZonesEnabled(), false);
    assert.ok(
      warnMessages.some((m) => m.includes("YOLO detector was removed due to licensing"))
    );
  });

  it("permissive license passes validation", () => {
    assert.equal(isPermissiveModelLicense("Apache-2.0"), true);
    assert.equal(isPermissiveModelLicense("MIT"), true);
    assert.equal(isPermissiveModelLicense("BSD-3-Clause"), true);
  });

  it("AGPL and non-commercial license blocks detector", () => {
    assert.equal(isPermissiveModelLicense("AGPL-3.0"), false);
    assert.equal(isPermissiveModelLicense("GPL-3.0"), false);
    assert.equal(isPermissiveModelLicense("Non-Commercial"), false);
    assert.equal(isBlockedModelLicense("AGPL-3.0"), true);
    assert.equal(isBlockedModelLicense("research-only"), true);
  });

  it("object label penalty still influences zone scoring groups", () => {
    assert.ok(objectLabelPenalty("cell phone", 0.9) >= 50);
    assert.ok(objectLabelPenalty("person", 0.9) >= 60);
    assert.ok(objectLabelPenalty("pizza", 0.8) >= 20);
  });
});
