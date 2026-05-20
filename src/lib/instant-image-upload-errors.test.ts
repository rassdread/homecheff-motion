import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildImageUploadErrorBody,
  classifyImageUploadFailure,
  IMAGE_UPLOAD_USER_MESSAGE_NL,
} from "@/lib/instant-image-upload-errors";

describe("instant-image-upload-errors", () => {
  it("classifies blob token failures", () => {
    const c = classifyImageUploadFailure(new Error("BLOB_READ_WRITE_TOKEN is not set"));
    assert.equal(c.code, "BLOB_UPLOAD_FAILED");
    assert.equal(c.httpStatus, 503);
  });

  it("classifies sharp processing failures", () => {
    const c = classifyImageUploadFailure(new Error("sharp: Input buffer has corrupt header"));
    assert.equal(c.code, "IMAGE_PROCESSING_FAILED");
  });

  it("builds safe client error body", () => {
    const body = buildImageUploadErrorBody({
      code: "IMAGE_UPLOAD_FAILED",
      requestId: "req-1",
    });
    assert.equal(body.ok, false);
    assert.equal(body.message, IMAGE_UPLOAD_USER_MESSAGE_NL);
    assert.equal(body.requestId, "req-1");
  });
});
