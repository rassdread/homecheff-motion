import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveSegmentationUiState } from "@/lib/editor-segmentation-state";

describe("editor segmentation state", () => {
  it("segmenting wins over prompt_visible", () => {
    assert.equal(
      deriveSegmentationUiState({
        clickSegmentPoint: { x: 0.5, y: 0.2 },
        clickSegmentBusy: true,
        refiningSelection: false,
        selectedLayer: null,
      }),
      "segmenting"
    );
  });
});
