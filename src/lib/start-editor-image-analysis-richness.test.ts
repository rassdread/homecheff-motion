import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
import { splitAnalysisIntoTruthSections } from "@/lib/editor-vision-truth-mode";
import {
  documentHasCompletedFullVisionAnalysis,
  documentHasRichVisionAnalysis,
} from "@/lib/editor-vision-v6-stability";
import {
  prepareDocumentForEditorImageAnalysis,
} from "@/lib/start-editor-image-analysis";
import { prepareDocumentForVisionBootstrap } from "@/lib/editor-vision-analysis-run";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_rich",
    name: "portrait.jpg",
    sourceKind: "character",
    sourceAssetId: "asset-1",
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "layer-user",
        label: "User layer",
        sourceKind: "character",
        assetId: "asset-1",
        storageKey: "",
        previewUrl: "https://example.com/portrait.jpg",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: false,
        visible: true,
        bounds: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
        layerType: "object",
        confidence: 1,
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    analyzedBackgroundUrl: "https://example.com/portrait.jpg",
    ...overrides,
  };
}

function headOnlyHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "person",
      label: "Personage",
      category: "objects",
      editable: false,
      children: [{ id: "head", label: "Head", category: "objects", editable: true, children: [] }],
    },
    {
      id: "bg",
      label: "Background",
      category: "background",
      editable: false,
      children: [],
    },
  ];
}

function richPortraitHierarchy(): EditorVisionHierarchyNode[] {
  return [
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
      ],
    },
    {
      id: "clothing",
      label: "Clothing",
      category: "objects",
      editable: false,
      children: [{ id: "shirt", label: "Shirt", category: "objects", editable: true, children: [] }],
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
}

describe("startEditorImageAnalysis richness parity", () => {
  it("head-only terminal analysis is not treated as completed full enrichment", () => {
    const weak = baseDoc({
      visionHierarchy: headOnlyHierarchy(),
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 1,
        visionPartCount: 2,
        mergedLayerCount: 3,
        openAiPartsUsed: false,
        layerSources: [],
      },
      visionAnalysisRun: {
        runId: "run-weak",
        analysisId: "analysis-weak",
        assetId: "asset-1",
        projectId: "sess_rich",
        backgroundUrl: "https://example.com/portrait.jpg",
        sessionId: "sess_rich",
        status: "complete",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
      },
    });

    assert.equal(documentHasRichVisionAnalysis(weak), true);
    assert.equal(documentHasCompletedFullVisionAnalysis(weak), false);
    assert.equal(documentNeedsDetectionBootstrap(weak), true);
  });

  it("rich portrait fixture satisfies completed full enrichment", () => {
    const rich = baseDoc({
      visionHierarchy: richPortraitHierarchy(),
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 1,
        visionPartCount: 8,
        mergedLayerCount: 10,
        openAiPartsUsed: true,
        layerSources: [{ layerId: "sunglasses", label: "Sunglasses", source: "openai_vision" }],
      },
    });
    assert.equal(documentHasCompletedFullVisionAnalysis(rich), true);
    assert.equal(documentNeedsDetectionBootstrap(rich), false);
  });

  it("portrait sunglasses analysis fixture includes face and accessory parts", () => {
    const analysis = portraitWithSunglassesFixture();
    const labels = splitAnalysisIntoTruthSections(analysis, { assetType: "human" }).detected.map((p) =>
      p.label.toLowerCase()
    );
    for (const token of ["eyes", "mouth", "hair", "sunglasses"]) {
      assert.ok(labels.some((l) => l.includes(token)), `missing ${token}`);
    }
  });

  it("auto-start uses basic bootstrap prep; premium manual resets derived state", () => {
    const weak = baseDoc({ visionHierarchy: headOnlyHierarchy() });
    const autoPrepared = prepareDocumentForEditorImageAnalysis(weak, {
      force: false,
      preserveUserEdits: true,
    });
    const manualPrepared = prepareDocumentForEditorImageAnalysis(weak, {
      force: true,
      preserveUserEdits: false,
    });
    const autoBootstrap = prepareDocumentForVisionBootstrap(autoPrepared, {
      preserveUserEdits: true,
      analysisDepth: "basic",
    });
    const manualBootstrap = prepareDocumentForVisionBootstrap(manualPrepared, {
      preserveUserEdits: false,
      analysisDepth: "premium",
    });

    assert.equal(autoPrepared.visionHierarchy, undefined);
    assert.equal(manualPrepared.visionHierarchy, undefined);
    assert.equal(autoBootstrap.visionHierarchy, undefined);
    assert.equal(manualBootstrap.visionHierarchy, undefined);
    assert.equal(autoBootstrap.objects.length, 1);
    assert.equal(manualBootstrap.objects.length, 1);
    assert.equal(documentNeedsDetectionBootstrap(autoBootstrap), true);
    assert.equal(documentNeedsDetectionBootstrap(manualBootstrap), true);
  });

  it("shared entrypoint resolves basic vs premium depth and gates premium", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/start-editor-image-analysis.ts"),
      "utf8"
    );
    assert.match(source, /resolveEditorVisionAnalysisDepth\(/);
    assert.match(source, /resolvePremiumVisionAnalysisGate/);
    assert.match(source, /buildEditorVisionAnalysisCostLogFromDocument/);
    assert.match(source, /premium_analysis_gated/);
  });

  it("auto-start soft reset does not use head-only as completed baseline", () => {
    const prepared = prepareDocumentForVisionBootstrap(
      baseDoc({ visionHierarchy: headOnlyHierarchy() }),
      { preserveUserEdits: true, analysisDepth: "premium" }
    );
    assert.equal(prepared.visionHierarchy, undefined);
    assert.equal(prepared.analyzedBackgroundUrl, undefined);
  });
});
