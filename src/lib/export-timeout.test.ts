import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTimeoutLikeError,
  resolveExportTimeoutMs,
  resolveFfmpegStageTimeoutMs,
} from "@/lib/export-timeout";

describe("resolveExportTimeoutMs", () => {
  it("defaults to 180000 when env unset", () => {
    const prev = process.env.EXPORT_TIMEOUT_MS;
    delete process.env.EXPORT_TIMEOUT_MS;
    assert.equal(resolveExportTimeoutMs(), 180_000);
    if (prev !== undefined) {
      process.env.EXPORT_TIMEOUT_MS = prev;
    }
  });

  it("clamps env value to safe range", () => {
    const prev = process.env.EXPORT_TIMEOUT_MS;
    process.env.EXPORT_TIMEOUT_MS = "9999999";
    assert.equal(resolveExportTimeoutMs(), 300_000);
    process.env.EXPORT_TIMEOUT_MS = "1000";
    assert.equal(resolveExportTimeoutMs(), 60_000);
    if (prev !== undefined) {
      process.env.EXPORT_TIMEOUT_MS = prev;
    } else {
      delete process.env.EXPORT_TIMEOUT_MS;
    }
  });
});

describe("resolveFfmpegStageTimeoutMs", () => {
  it("allocates longer budget for concat", () => {
    const concat = resolveFfmpegStageTimeoutMs("concat");
    const normalize = resolveFfmpegStageTimeoutMs("normalize");
    assert.ok(concat >= normalize);
  });
});

describe("isTimeoutLikeError", () => {
  it("detects abort timeout messages", () => {
    assert.equal(
      isTimeoutLikeError(new Error("The operation was aborted due to timeout")),
      true
    );
  });
});
