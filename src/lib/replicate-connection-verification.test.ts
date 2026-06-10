import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  REPLICATE_SAM3_MODEL_ID,
  isReplicateConfigured,
  toHumanReplicateError,
} from "@/server/admin/replicate-client";

describe("replicate connection verification sprint", () => {
  it("admin lab page exists at /admin/ai-lab/replicate", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/admin/ai-lab/replicate/page.tsx"),
      "utf8"
    );
    assert.ok(page.includes("ReplicateVerificationLab"));
  });

  it("status and run API routes require admin gate", () => {
    const status = readFileSync(
      join(process.cwd(), "src/app/api/admin/ai-lab/replicate/status/route.ts"),
      "utf8"
    );
    const run = readFileSync(
      join(process.cwd(), "src/app/api/admin/ai-lab/replicate/run/route.ts"),
      "utf8"
    );
    assert.ok(status.includes("requireAdmin"));
    assert.ok(run.includes("requireAdmin"));
  });

  it("uses only yodagg/sam3-image-seg for this sprint", () => {
    assert.equal(REPLICATE_SAM3_MODEL_ID, "yodagg/sam3-image-seg");
    const lab = readFileSync(
      join(process.cwd(), "src/components/admin/replicate-verification-lab.tsx"),
      "utf8"
    );
    assert.ok(lab.includes("yodagg/sam3-image-seg"));
    assert.equal((lab.match(/sam3-image-seg/g) ?? []).length, 1);
  });

  it("env example documents REPLICATE_API_TOKEN", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    assert.ok(example.includes("REPLICATE_API_TOKEN"));
    assert.ok(example.includes("/admin/ai-lab/replicate"));
  });

  it("graceful message when token missing", () => {
    const status = readFileSync(
      join(process.cwd(), "src/app/api/admin/ai-lab/replicate/status/route.ts"),
      "utf8"
    );
    const lab = readFileSync(
      join(process.cwd(), "src/components/admin/replicate-verification-lab.tsx"),
      "utf8"
    );
    assert.ok(status.includes("Replicate is not configured"));
    assert.ok(lab.includes("notConfigured"));
  });

  it("human-readable replicate errors without stack traces", () => {
    assert.equal(toHumanReplicateError(402, {}), "Billing may not be configured.");
    assert.equal(toHumanReplicateError(404, {}), "Model unavailable.");
    assert.equal(toHumanReplicateError(422, {}), "Replicate could not process this image.");
    const run = readFileSync(
      join(process.cwd(), "src/app/api/admin/ai-lab/replicate/run/route.ts"),
      "utf8"
    );
    assert.ok(!run.includes("stack"));
  });

  it("isReplicateConfigured follows env", () => {
    const prev = process.env.REPLICATE_API_TOKEN;
    delete process.env.REPLICATE_API_TOKEN;
    assert.equal(isReplicateConfigured(), false);
    process.env.REPLICATE_API_TOKEN = "r8_test";
    assert.equal(isReplicateConfigured(), true);
    if (prev === undefined) {
      delete process.env.REPLICATE_API_TOKEN;
    } else {
      process.env.REPLICATE_API_TOKEN = prev;
    }
  });

  it("does not wire into editor segment pipeline", () => {
    const segmentLayer = readFileSync(
      join(process.cwd(), "src/server/editor/segment-editor-layer.ts"),
      "utf8"
    );
    assert.ok(!segmentLayer.includes("replicate"));
    assert.ok(!segmentLayer.includes("sam3-image-seg"));
  });
});
