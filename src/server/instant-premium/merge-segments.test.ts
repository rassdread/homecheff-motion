import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MERGE_SEGMENTS_MISSING,
  MergeSegmentsValidationError,
  validateMergeSegmentsBeforeExport,
} from "@/server/instant-premium/merge-segments";

describe("validateMergeSegmentsBeforeExport", () => {
  const base = {
    projectId: "proj-1",
    expectedDurationSec: 15,
    perSegmentDurationSec: 5,
  };

  it("exposes MERGE_SEGMENTS_MISSING code", () => {
    assert.equal(MERGE_SEGMENTS_MISSING, "MERGE_SEGMENTS_MISSING");
    const err = new MergeSegmentsValidationError("test");
    assert.equal(err.code, MERGE_SEGMENTS_MISSING);
  });

  it("passes when multi-segment inputs cover target duration", () => {
    assert.doesNotThrow(() =>
      validateMergeSegmentsBeforeExport({
        ...base,
        segmentCount: 3,
        concatInputCount: 3,
        segmentUrls: ["https://a/1.mp4", "https://a/2.mp4", "https://a/3.mp4"],
      })
    );
  });

  it("fails when segmentCount > 1 but only one concat input", () => {
    assert.throws(
      () =>
        validateMergeSegmentsBeforeExport({
          ...base,
          segmentCount: 3,
          concatInputCount: 1,
          segmentUrls: ["https://a/1.mp4"],
        }),
      (err: unknown) => {
        assert.ok(err instanceof MergeSegmentsValidationError);
        assert.equal((err as MergeSegmentsValidationError).code, MERGE_SEGMENTS_MISSING);
        return true;
      }
    );
  });

  it("fails when all segment URLs are identical", () => {
    assert.throws(
      () =>
        validateMergeSegmentsBeforeExport({
          ...base,
          segmentCount: 3,
          concatInputCount: 3,
          segmentUrls: ["https://a/same.mp4", "https://a/same.mp4", "https://a/same.mp4"],
        }),
      (err: unknown) => err instanceof MergeSegmentsValidationError
    );
  });

  it("fails when source segments do not cover final duration", () => {
    assert.throws(
      () =>
        validateMergeSegmentsBeforeExport({
          ...base,
          segmentCount: 2,
          concatInputCount: 2,
          perSegmentDurationSec: 3,
          segmentUrls: ["https://a/1.mp4", "https://a/2.mp4"],
        }),
      (err: unknown) => err instanceof MergeSegmentsValidationError
    );
  });
});
