/**
 * Production Segmentation 503 root-cause audit contracts.
 * Run: npx tsx --test src/lib/editor-production-segmentation-503-audit.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("production segmentation 503 audit", () => {
  it("click route maps error codes via segmentErrorHttpStatus", () => {
    const route = read("src/app/api/editor/segment/click/route.ts");
    assert.match(route, /segmentErrorHttpStatus\(result\.code\)/);
    assert.match(route, /code: result\.code/);
    assert.match(route, /fallbacks: result\.fallbacks/);
  });

  it("segment route maps refine failures via segmentErrorHttpStatus", () => {
    const route = read("src/app/api/editor/segment/route.ts");
    const statusIdx = route.indexOf("segmentErrorHttpStatus(code)");
    const removeBgIdx = route.indexOf("removeBackground");
    assert.ok(removeBgIdx > 0);
    assert.ok(statusIdx > removeBgIdx, "refine error mapping should follow remove_background handler");
    assert.match(route, /if \(!promptResult\.ok\)/);
  });

  it("segmentByClick terminal failure is SEGMENT_UNAVAILABLE", () => {
    const provider = read("src/server/editor/editor-segmentation-provider.ts");
    assert.match(provider, /SEGMENT_UNAVAILABLE/);
    const clickFn = provider.indexOf("export async function segmentByClick");
    const repIdx = provider.indexOf("if (isReplicateConfigured() && input.imageUrl)", clickFn);
    const sam2Idx = provider.indexOf("if (isSam2SegmentationAvailable())", clickFn);
    const rembgIdx = provider.indexOf('segmentationProviderAvailable("rembg") && input.imageUrl', clickFn);
    assert.ok(clickFn > 0 && repIdx > clickFn && sam2Idx > repIdx && rembgIdx > sam2Idx);
  });

  it("replicate success finalizes via persistMaskAndCutout", () => {
    const provider = read("src/server/editor/editor-segmentation-provider.ts");
    assert.match(provider, /finalizeReplicateSam3Segment/);
    assert.match(provider, /replicate_mask_format_unsupported/);
    assert.match(provider, /persistMaskAndCutout/);
    const blob = read("src/lib/vercel-blob-config.ts");
    assert.match(blob, /if \(!token\)/);
    assert.match(blob, /EXPORT_UPLOAD_AUTH_FAILED/);
  });

  it("maskToUrl only accepts http/data strings — other formats yield null maskUrl", () => {
    const sam3 = read("src/server/editor/replicate-sam3-editor-segment.ts");
    assert.match(sam3, /function maskToUrl/);
    assert.match(sam3, /maskUrl: maskToUrl\(o\.pred_masks/);
  });

  it("status endpoint conflates replicateConfigured and replicateSam3Available", () => {
    const status = read("src/app/api/editor/segment/status/route.ts");
    assert.match(status, /replicateConfigured: providers\.replicate/);
    assert.match(status, /replicateSam3Available: providers\.replicate/);
    assert.doesNotMatch(status, /fetchReplicateSam3Model/);
    assert.match(status, /blobStorageConfigured/);
    assert.match(status, /isBlobTokenConfigured/);
  });

  it("globe flow posts to segment click with objectHint globe", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /runPromptSubLayerSegmentation/);
    assert.match(workspace, /objectHint: input\.prompt/);
    assert.match(workspace, /\/api\/editor\/segment\/click/);
    const prompt = read("src/lib/editor-segmentation-prompt.ts");
    assert.match(prompt, /globe: "globe"/);
  });

  it("removeBackground falls back to heuristic without rembg env", () => {
    const layer = read("src/server/editor/segment-editor-layer.ts");
    assert.match(layer, /REMBG_API_URL/);
    assert.match(layer, /segmentationSource: "rembg" \| "heuristic"/);
    const provider = read("src/server/editor/editor-segmentation-provider.ts");
    const removeIdx = provider.indexOf("export async function removeBackground");
    const segmentLayerIdx = provider.indexOf("segmentEditorLayer", removeIdx);
    assert.ok(segmentLayerIdx > removeIdx);
  });

  it("SAM2_UNAVAILABLE is internal and does not surface as click route code", () => {
    const sam2 = read("src/server/editor/sam2-click-segment.ts");
    assert.match(sam2, /code: "SAM2_UNAVAILABLE"/);
    const clickRoute = read("src/app/api/editor/segment/click/route.ts");
    assert.doesNotMatch(clickRoute, /SAM2_UNAVAILABLE/);
  });

  it("isReplicateConfigured uses REPLICATE_API_TOKEN only", () => {
    const client = read("src/server/admin/replicate-client.ts");
    assert.match(client, /process\.env\.REPLICATE_API_TOKEN/);
    assert.match(client, /export function isReplicateConfigured/);
  });
});
