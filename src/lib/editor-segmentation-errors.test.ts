import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapReplicateErrorToCode,
  segmentErrorHttpStatus,
} from "@/lib/editor-segmentation-errors";

describe("editor segmentation errors", () => {
  it("maps replicate timeout to 504", () => {
    assert.equal(mapReplicateErrorToCode("Replicate timed out. Try again."), "replicate_timeout");
    assert.equal(segmentErrorHttpStatus("replicate_timeout"), 504);
  });

  it("maps provider failures to 502", () => {
    assert.equal(segmentErrorHttpStatus("blob_upload_failed"), 502);
    assert.equal(segmentErrorHttpStatus("mask_fetch_failed"), 502);
  });

  it("maps unavailable to 503", () => {
    assert.equal(segmentErrorHttpStatus("SEGMENT_UNAVAILABLE"), 503);
  });
});
