/**
 * Analyze endpoint HTTP method contract — POST-only route, callers, Editor fallback.
 * Run: npx tsx --test src/lib/editor-analyze-method-mismatch.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  bootstrapEditorObjectDetection,
  documentNeedsDetectionBootstrap,
  resolveEditorBootstrapVision,
} from "@/lib/editor-detection-bootstrap";
import {
  ANALYZE_ASSET_DERIVATION_HTTP_METHOD,
  analyzeAssetStyleDnaApi,
} from "@/lib/studio-asset-derivation-client";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();

function backgroundOnlyDoc(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-analyze-405",
    name: "globe-man-test",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/globe-man.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/globe-man.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
        confidence: 1,
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("Analyze method mismatch", () => {
  it("route exports POST only", () => {
    const route = readFileSync(
      join(ROOT, "src/app/api/studio/asset-derivation/analyze/route.ts"),
      "utf8"
    );
    assert.match(route, /export async function POST/);
    assert.doesNotMatch(route, /export async function GET/);
    assert.doesNotMatch(route, /export async function PUT/);
    assert.doesNotMatch(route, /export async function DELETE/);
  });

  it("analyzeAssetStyleDnaApi uses POST with JSON body", () => {
    const client = readFileSync(
      join(ROOT, "src/lib/studio-asset-derivation-client.ts"),
      "utf8"
    );
    assert.equal(ANALYZE_ASSET_DERIVATION_HTTP_METHOD, "POST");
    assert.match(client, /ANALYZE_ASSET_DERIVATION_HTTP_METHOD/);
    assert.match(
      client,
      /\/api\/studio\/asset-derivation\/analyze"[\s\S]*method: ANALYZE_ASSET_DERIVATION_HTTP_METHOD/
    );
    assert.match(client, /body: JSON\.stringify\(params\)/);
  });

  it("all analyze callers go through analyzeAssetStyleDnaApi (POST)", () => {
    const callers = [
      "src/lib/editor-detection-bootstrap.ts",
      "src/lib/studio-asset-vision-trigger.ts",
      "src/lib/studio-asset-wizard-reference-generation.ts",
    ];
    for (const file of callers) {
      const src = readFileSync(join(ROOT, file), "utf8");
      assert.match(src, /analyzeAssetStyleDnaApi/);
      assert.doesNotMatch(src, /asset-derivation\/analyze/);
    }
  });

  it("405 analyze response does not block Editor bootstrap fallback vision", () => {
    const doc = backgroundOnlyDoc();
    const resolved = resolveEditorBootstrapVision(doc, {
      ok: false,
      status: 405,
      data: { error: "Method Not Allowed" } as never,
      networkError: false,
    });
    assert.equal(resolved.visionAnalyzeOk, false);
    assert.ok(resolved.vision.objectType);
    assert.equal(resolved.styleDna, null);
  });

  it("bootstrap produces layers when vision analyze fails with 405", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/studio/asset-derivation/analyze")) {
        assert.equal(init?.method, "POST");
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/editor/detect")) {
        return new Response(JSON.stringify({ detections: [], available: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };

    try {
      const doc = backgroundOnlyDoc();
      assert.equal(documentNeedsDetectionBootstrap(doc), true);
      const bootstrapped = await bootstrapEditorObjectDetection(doc);
      assert.ok(bootstrapped.objects.length > 1);
      assert.equal(bootstrapped.detectionMeta?.bootstrapAttempted, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Replicate prompt segmentation path does not require analyze success", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /runPromptSubLayerSegmentation/);
    assert.match(workspace, /\/api\/editor\/segment\/click/);
    assert.doesNotMatch(workspace, /analyzeAssetStyleDnaApi/);
    assert.doesNotMatch(workspace, /asset-derivation\/analyze/);
  });

  it("analyzeAssetStyleDnaApi returns non-ok for 405 without throwing", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const res = await analyzeAssetStyleDnaApi({
        imageUrl: "https://example.com/x.png",
        sourceKind: "character",
        sourceName: "Test",
        derivationJobId: "job-1",
      });
      assert.equal(res.ok, false);
      assert.equal(res.status, 405);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
