import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pickAutoMaskStrategy } from "@/lib/editor-auto-mask";

describe("editor segmentation provider integration", () => {
  it("unified provider module exports segmentByClick and segmentByPrompt", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/editor/editor-segmentation-provider.ts"),
      "utf8"
    );
    assert.ok(source.includes("export async function segmentByClick"));
    assert.ok(source.includes("export async function segmentByPrompt"));
    assert.ok(source.includes("export async function removeBackground"));
    assert.ok(source.includes("export async function createCutout"));
  });

  it("click route delegates to segmentByClick", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/editor/segment/click/route.ts"),
      "utf8"
    );
    assert.ok(route.includes("segmentByClick"));
    assert.ok(route.includes("category"));
    assert.ok(route.includes("providerUsed"));
  });

  it("segment route uses removeBackground and segmentByPrompt", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/editor/segment/route.ts"),
      "utf8"
    );
    assert.ok(route.includes("removeBackground"));
    assert.ok(route.includes("segmentByPrompt"));
  });

  it("replicate_sam3 is a valid segmentation source type", () => {
    const types = readFileSync(join(process.cwd(), "src/types/homecheff-visual-editor.ts"), "utf8");
    assert.ok(types.includes('"replicate_sam3"'));
  });

  it("auto-mask prefers replicate when configured", () => {
    assert.equal(pickAutoMaskStrategy(true, false, false), "replicate");
  });

  it("workspace passes layer category to click segment API", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.ok(workspace.includes("category: layer.category"));
    assert.ok(workspace.includes("applyEditorSegmentApiShape"));
    assert.ok(workspace.includes("EditorSelectionVerificationPanel"));
  });

  it("provider priority tries replicate before sam2 in segmentByClick", () => {
    const provider = readFileSync(
      join(process.cwd(), "src/server/editor/editor-segmentation-provider.ts"),
      "utf8"
    );
    const replicateIdx = provider.indexOf("isReplicateConfigured()");
    const sam2Idx = provider.indexOf("isSam2SegmentationAvailable()");
    assert.ok(replicateIdx > 0 && sam2Idx > 0);
    assert.ok(replicateIdx < sam2Idx);
  });
});
