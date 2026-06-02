import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MERGE_SEGMENTS_MISSING,
  MergeSegmentsValidationError,
  buildMergeSegmentsValidationInput,
  resolveMergeSourceDurationSec,
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

describe("Story Mode multiframe duration coverage", () => {
  it("passes when one probed clip (10.2s) covers storyboard target (10s)", () => {
    const input = buildMergeSegmentsValidationInput({
      projectId: "story-3",
      instantMode: "story",
      imageCount: 3,
      concatInputCount: 1,
      expectedDurationSec: 10,
      perSegmentDurationSec: 5,
      segmentUrls: ["https://blob/segment-1.mp4"],
      probedSegmentDurationsSec: [10.2],
    });
    assert.equal(input.segmentCount, 1);
    assert.equal(input.perSegmentDurationSec, null);
    assert.equal(input.actualSourceDurationSec, 10.2);
    assert.equal(
      resolveMergeSourceDurationSec(input),
      10.2
    );
    assert.doesNotThrow(() => validateMergeSegmentsBeforeExport(input));
  });

  it("fails when estimate would be 5s but actual probed duration is used for pass — wrong estimate alone fails", () => {
    assert.throws(
      () =>
        validateMergeSegmentsBeforeExport({
          projectId: "story-bad",
          segmentCount: 1,
          concatInputCount: 1,
          expectedDurationSec: 10,
          perSegmentDurationSec: 5,
          segmentUrls: ["https://blob/clip.mp4"],
        }),
      (err: unknown) => {
        assert.ok(err instanceof MergeSegmentsValidationError);
        assert.match(String(err), /~5\.0s/);
        return true;
      }
    );
  });

  it("passes for 9 images / one multiframe clip when probed duration matches storyboard", () => {
    const input = buildMergeSegmentsValidationInput({
      projectId: "story-9",
      instantMode: "story",
      imageCount: 9,
      concatInputCount: 1,
      expectedDurationSec: 40,
      perSegmentDurationSec: 5,
      segmentUrls: ["https://blob/multiframe.mp4"],
      probedSegmentDurationsSec: [41.5],
    });
    assert.equal(input.segmentCount, 1);
    assert.doesNotThrow(() => validateMergeSegmentsBeforeExport(input));
  });
});

describe("Transition Mode duration coverage", () => {
  it("still validates N-1 clips via per-segment estimate", () => {
    const input = buildMergeSegmentsValidationInput({
      projectId: "trans-3",
      instantMode: "transition",
      imageCount: 3,
      concatInputCount: 2,
      expectedDurationSec: 10,
      perSegmentDurationSec: 5,
      segmentUrls: ["https://a/1.mp4", "https://a/2.mp4"],
      probedSegmentDurationsSec: [5.1, 5.0],
    });
    assert.equal(input.segmentCount, 2);
    assert.equal(input.actualSourceDurationSec, undefined);
    assert.equal(resolveMergeSourceDurationSec(input), 10);
    assert.doesNotThrow(() => validateMergeSegmentsBeforeExport(input));
  });

  it("fails transition mode when N-1 estimate is too short", () => {
    assert.throws(
      () =>
        validateMergeSegmentsBeforeExport(
          buildMergeSegmentsValidationInput({
            projectId: "trans-fail",
            instantMode: "transition",
            imageCount: 3,
            concatInputCount: 2,
            expectedDurationSec: 15,
            perSegmentDurationSec: 5,
            segmentUrls: ["https://a/1.mp4", "https://a/2.mp4"],
          })
        ),
      (err: unknown) => err instanceof MergeSegmentsValidationError
    );
  });
});
