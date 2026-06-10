/**
 * Editor real user selection blocker sprint contracts.
 * Run: npx tsx --test src/lib/editor-real-user-selection-blocker.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { deriveSegmentationUiState, segmentationStateAllowsRetry } from "@/lib/editor-segmentation-state";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("editor real user selection blocker sprint", () => {
  it("segment click uses bounded replicate timeout under route deadline", () => {
    const replicate = read("src/server/editor/replicate-sam3-editor-segment.ts");
    assert.match(replicate, /EDITOR_CLICK_REPLICATE_TIMEOUT_MS = 20_000/);
    assert.match(replicate, /EDITOR_CLICK_ROUTE_DEADLINE_MS = 28_000/);
  });

  it("provider logs include requestId and timing phases", () => {
    const provider = read("src/server/editor/editor-segmentation-provider.ts");
    assert.match(provider, /requestId/);
    assert.match(provider, /blob_upload_ms/);
    assert.match(provider, /fetchWithEditorSegmentTimeout/);
  });

  it("selection tools allow refine when replicate available without sam2", () => {
    const panel = read("src/components/editor/editor-selection-tools-panel.tsx");
    assert.match(panel, /replicateAvailable/);
    assert.match(panel, /refineProviderReady/);
  });

  it("contextual mode buttons show active workspace mode", () => {
    const bar = read("src/components/editor/editor-contextual-action-bar.tsx");
    assert.match(bar, /workspaceMode/);
    assert.match(bar, /isActive/);
  });

  it("segmentation state machine covers failure and retry", () => {
    assert.equal(
      deriveSegmentationUiState({
        clickSegmentPoint: null,
        clickSegmentBusy: false,
        refiningSelection: false,
        selectedLayer: null,
        lastFailureCode: "replicate_timeout",
      }),
      "failed_timeout"
    );
    assert.ok(
      segmentationStateAllowsRetry(
        deriveSegmentationUiState({
          clickSegmentPoint: null,
          clickSegmentBusy: false,
          refiningSelection: false,
          selectedLayer: null,
          lastFailureCode: "mask_fetch_failed",
        })
      )
    );
  });
});
