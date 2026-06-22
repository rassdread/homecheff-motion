import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  countVisionHierarchyNodes,
  documentHasCompletedFullVisionAnalysis,
  isWeakBackgroundOnlyAnalysis,
  visionDocumentRichnessScore,
} from "@/lib/editor-vision-v6-stability";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

const bootstrapSource = readFileSync(
  join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
  "utf8"
);

function richPortraitDoc(): EditorCanvasDocument {
  const now = new Date().toISOString();
  const hierarchy: EditorVisionHierarchyNode[] = [
    {
      id: "person",
      label: "Personage",
      category: "objects",
      editable: false,
      children: [
        {
          id: "face",
          label: "Face",
          category: "objects",
          editable: false,
          children: [
            { id: "eyes", label: "Eyes", category: "objects", editable: true, children: [] },
            { id: "mouth", label: "Mouth", category: "objects", editable: true, children: [] },
            { id: "hair", label: "Hair", category: "objects", editable: true, children: [] },
          ],
        },
        { id: "shirt", label: "Shirt", category: "objects", editable: true, children: [] },
      ],
    },
    {
      id: "accessories",
      label: "Accessories",
      category: "objects",
      editable: false,
      children: [
        { id: "sunglasses", label: "Sunglasses", category: "objects", editable: true, children: [] },
      ],
    },
  ];
  return {
    sessionId: "sess_portrait",
    name: "portrait.jpg",
    sourceKind: "character",
    sourceAssetId: "asset-1",
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    analyzedBackgroundUrl: "https://example.com/portrait.jpg",
    visionHierarchy: hierarchy,
    visionV6Meta: {
      illustrationAnalysis: true,
      rtdetrCount: 1,
      visionPartCount: 8,
      mergedLayerCount: 10,
      openAiPartsUsed: true,
      layerSources: [{ layerId: "sunglasses", label: "Sunglasses", source: "openai_vision" }],
    },
  };
}

describe("editor-vision-parts-regression-fix", () => {
  it("guards local provisional fallback behind openAi + completed-full checks", () => {
    assert.match(bootstrapSource, /function shouldApplyLocalProvisionalFallback/);
    assert.match(bootstrapSource, /document\.visionV6Meta\?\.openAiPartsUsed/);
    assert.match(bootstrapSource, /documentHasCompletedFullVisionAnalysis\(document\)/);
    assert.match(bootstrapSource, /shouldApplyLocalProvisionalFallback\(stampedResult, onnxResult\)/);
    assert.match(bootstrapSource, /shouldApplyLocalProvisionalFallback\(finalDocument, onnxResult\)/);
    assert.doesNotMatch(
      bootstrapSource,
      /isWeakBackgroundOnlyAnalysis\(stampedResult\) && onnxResult\.detections\.length > 0/
    );
  });

  it("mergeStyleDnaRefinement preserves prior vision enrichment when openAi parts used", () => {
    assert.match(bootstrapSource, /function shouldPreservePriorVisionEnrichment/);
    assert.match(bootstrapSource, /visionHierarchy: keepPriorVision/);
    assert.match(bootstrapSource, /visionV6Meta: keepPriorVision/);
  });

  it("merged_document trace runs after provisional fallback decision", () => {
    const enrichBlock = bootstrapSource.slice(
      bootstrapSource.indexOf("async function maybeEnrichIllustrationParts"),
      bootstrapSource.indexOf("function buildDetectionMetaPartial")
    );
    const fallbackIdx = enrichBlock.indexOf("shouldApplyLocalProvisionalFallback(stampedResult");
    const traceIdx = enrichBlock.indexOf('traceVisionPartsLossStage("vision_parts_merged_document"');
    assert.ok(fallbackIdx >= 0 && traceIdx >= 0, "expected enrich block markers");
    assert.ok(traceIdx > fallbackIdx, "merged_document trace must follow fallback gate");
  });

  it("rich portrait document stays rich — not weak background-only", () => {
    const doc = richPortraitDoc();
    assert.equal(isWeakBackgroundOnlyAnalysis(doc), false);
    assert.equal(documentHasCompletedFullVisionAnalysis(doc), true);
    assert.ok(countVisionHierarchyNodes(doc.visionHierarchy) >= 8);
    assert.ok(visionDocumentRichnessScore(doc) > 1000);
  });
});
