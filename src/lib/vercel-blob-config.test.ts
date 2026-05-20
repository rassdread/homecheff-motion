import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyExportBlobFailure,
  ExportBlobUploadError,
  isBlobAccessDeniedError,
} from "./vercel-blob-config";

describe("vercel-blob-config", () => {
  it("detects Vercel Blob access denied messages", () => {
    assert.equal(
      isBlobAccessDeniedError(
        new Error("Vercel Blob: Access denied, please provide a valid token for this resource.")
      ),
      true
    );
  });

  it("classifies missing token as auth failure", () => {
    const prev = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
      assert.equal(classifyExportBlobFailure(new Error("anything")), "EXPORT_UPLOAD_AUTH_FAILED");
    } finally {
      if (prev !== undefined) {
        process.env.BLOB_READ_WRITE_TOKEN = prev;
      }
    }
  });

  it("preserves ExportBlobUploadError code", () => {
    const err = new ExportBlobUploadError({
      code: "EXPORT_UPLOAD_AUTH_FAILED",
      uploadTarget: "motion/final/p1/final.mp4",
      provider: "instant-local-ffmpeg",
      projectId: "p1",
      requestId: "req-1",
    });
    assert.equal(classifyExportBlobFailure(err), "EXPORT_UPLOAD_AUTH_FAILED");
    assert.equal(err.requestId, "req-1");
    assert.equal(err.uploadTarget, "motion/final/p1/final.mp4");
  });
});
