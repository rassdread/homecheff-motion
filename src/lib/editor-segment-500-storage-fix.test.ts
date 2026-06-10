/**
 * Contracts for editor segment 500/504 + storage quota fix.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { editorSegmentErrorMessageKey } from "@/lib/editor-segment-client-errors";

const ROOT = process.cwd();

describe("editor segment 500/504 + storage quota fix", () => {
  it("click route uses segmentErrorHttpStatus and try/catch", () => {
    const route = readFileSync(join(ROOT, "src/app/api/editor/segment/click/route.ts"), "utf8");
    assert.match(route, /segmentErrorHttpStatus/);
    assert.match(route, /estimateSegmentResponseBytes/);
    assert.match(route, /segmentation_internal_error/);
  });

  it("provider returns explicit replicate failure codes", () => {
    const provider = readFileSync(
      join(ROOT, "src/server/editor/editor-segmentation-provider.ts"),
      "utf8"
    );
    assert.match(provider, /maskBufferFromMaskRef/);
    assert.match(provider, /replicate_mask_format_unsupported/);
    assert.match(provider, /EDITOR_CLICK_REPLICATE_TIMEOUT_MS/);
    assert.match(provider, /EDITOR_REFINE_REPLICATE_TIMEOUT_MS/);
  });

  it("workspace skips refine fallback after replicate/sam2 click", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /if \(strategy === "rembg"\)/);
    assert.doesNotMatch(
      workspace,
      /strategy === "replicate" \|\| strategy === "sam2"[\s\S]*?mode: "refine"[\s\S]*?strategy === "replicate"/
    );
  });

  it("canvas session uses safe local storage helpers", () => {
    const session = readFileSync(join(ROOT, "src/lib/editor-canvas-session.ts"), "utf8");
    assert.match(session, /safeSetLocalStorage/);
    assert.match(session, /saveEditorCanvasDocumentWithStatus/);
    assert.match(session, /stripDocumentForStorage/);
  });

  it("prompt sub-layer segmentation clears refining state in finally", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /runPromptSubLayerSegmentation[\s\S]*setRefiningSelection\(true\)/);
    assert.match(workspace, /runPromptSubLayerSegmentation[\s\S]*finally[\s\S]*setRefiningSelection\(false\)/);
  });

  it("maps blob upload failures to user-facing message key", () => {
    assert.equal(
      editorSegmentErrorMessageKey("blob_upload_failed"),
      "editor.clickSegment.error.blobUploadFailed"
    );
  });

  it("status endpoint reports blob storage configured", () => {
    const status = readFileSync(join(ROOT, "src/app/api/editor/segment/status/route.ts"), "utf8");
    assert.match(status, /blobStorageConfigured/);
    assert.match(status, /isBlobTokenConfigured/);
  });
});
