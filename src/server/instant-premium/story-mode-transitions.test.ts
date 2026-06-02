import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFinalAssemblyTransitionInvariant,
  FinalAssemblyTransitionCountMismatchError,
} from "@/server/instant-premium/final-assembly-invariants";
import {
  expectedAssemblySegmentCount,
  expectedTransitionRowCount,
  storyModeClipsReadyForMerge,
  STORY_MODE_MULTIFRAME_ROW_COUNT,
} from "@/server/instant-premium/story-mode-transitions";

describe("story mode transition counts", () => {
  it("expects one multiframe transition row for story mode", () => {
    assert.equal(expectedTransitionRowCount(2, "story"), STORY_MODE_MULTIFRAME_ROW_COUNT);
    assert.equal(expectedTransitionRowCount(3, "story"), STORY_MODE_MULTIFRAME_ROW_COUNT);
    assert.equal(expectedTransitionRowCount(9, "story"), STORY_MODE_MULTIFRAME_ROW_COUNT);
  });

  it("expects one assembly segment for story multiframe output", () => {
    assert.equal(expectedAssemblySegmentCount(3, "story"), 1);
    assert.equal(expectedAssemblySegmentCount(9, "story"), 1);
  });

  it("expects N-1 rows and segments for transition mode", () => {
    assert.equal(expectedTransitionRowCount(3, "transition"), 2);
    assert.equal(expectedAssemblySegmentCount(3, "transition"), 2);
    assert.equal(expectedTransitionRowCount(9, "transition"), 8);
  });
});

describe("assertFinalAssemblyTransitionInvariant story mode", () => {
  const images = [
    { id: "i1", order: 0 },
    { id: "i2", order: 1 },
    { id: "i3", order: 2 },
  ];

  const multiframeRow = {
    id: "t0",
    order: 0,
    status: "completed" as const,
    startImageId: "i1",
    endImageId: "i3",
    providerJobId: "job-1",
    outputVideoUrl: "https://example.com/full.mp4",
  };

  it("passes with one multiframe row for 3 images", () => {
    assert.doesNotThrow(() =>
      assertFinalAssemblyTransitionInvariant({
        projectId: "p1",
        images,
        instantMode: "story",
        transitions: [multiframeRow],
      })
    );
  });

  it("passes with one multiframe row for 9 images", () => {
    const nineImages = Array.from({ length: 9 }, (_, i) => ({
      id: `i${i}`,
      order: i,
    }));
    assert.doesNotThrow(() =>
      assertFinalAssemblyTransitionInvariant({
        projectId: "p9",
        images: nineImages,
        instantMode: "story",
        transitions: [
          {
            ...multiframeRow,
            startImageId: "i0",
            endImageId: "i8",
          },
        ],
      })
    );
  });

  it("throws when story mode has transition-mode row count", () => {
    assert.throws(
      () =>
        assertFinalAssemblyTransitionInvariant({
          projectId: "p1",
          images,
          instantMode: "story",
          transitions: [
            multiframeRow,
            {
              id: "t1",
              order: 1,
              status: "completed",
              startImageId: "i2",
              endImageId: "i3",
              providerJobId: "job-1",
              outputVideoUrl: null,
            },
          ],
        }),
      (err: unknown) => err instanceof FinalAssemblyTransitionCountMismatchError
    );
  });
});

describe("assertFinalAssemblyTransitionInvariant transition mode", () => {
  it("still fails when transition rows are missing", () => {
    const images = [
      { id: "i1", order: 0 },
      { id: "i2", order: 1 },
      { id: "i3", order: 2 },
    ];
    assert.throws(
      () =>
        assertFinalAssemblyTransitionInvariant({
          projectId: "p1",
          images,
          instantMode: "transition",
          transitions: [
            {
              id: "t0",
              order: 0,
              status: "completed",
              startImageId: "i1",
              endImageId: "i2",
              providerJobId: "job-0",
              outputVideoUrl: "https://example.com/0.mp4",
            },
          ],
        }),
      (err: unknown) => err instanceof FinalAssemblyTransitionCountMismatchError
    );
  });
});

describe("storyModeClipsReadyForMerge", () => {
  it("requires only primary multiframe video for story rebuild", () => {
    assert.equal(
      storyModeClipsReadyForMerge("story", [
        {
          order: 0,
          status: "completed",
          outputVideoUrl: "https://example.com/full.mp4",
        },
      ]),
      true
    );
    assert.equal(
      storyModeClipsReadyForMerge("story", [
        {
          order: 0,
          status: "completed",
          outputVideoUrl: "https://example.com/full.mp4",
        },
        { order: 1, status: "queued", outputVideoUrl: null },
      ]),
      true
    );
  });

  it("requires every segment video for transition mode", () => {
    assert.equal(
      storyModeClipsReadyForMerge("transition", [
        { order: 0, status: "completed", outputVideoUrl: "https://a.mp4" },
        { order: 1, status: "queued", outputVideoUrl: null },
      ]),
      false
    );
  });
});
