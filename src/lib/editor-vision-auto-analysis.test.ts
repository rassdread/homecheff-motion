import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  buildLocalProvisionalPartAnalysis,
  ensureProvisionalSubjectFromDetections,
  mergeOpenAiIllustrationParts,
  resolveProvisionalSubjectLabel,
} from "@/lib/editor-vision-v6-part-analysis";
import { reanalyzeEditorProjectFromCurrentImage } from "@/lib/editor-project-isolation";
import {
  documentHasRichVisionAnalysis,
  isWeakBackgroundOnlyAnalysis,
} from "@/lib/editor-vision-v6-stability";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_auto",
    name: "portrait.jpg",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/portrait.jpg",
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
    ...overrides,
  };
}

function backgroundOnlyHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "background_root",
      label: "Background",
      category: "background",
      editable: false,
      children: [
        { id: "bg_color", label: "Color", category: "background", editable: true, children: [] },
        { id: "bg_light", label: "Lighting", category: "background", editable: true, children: [] },
      ],
    },
  ];
}

function mainSubjectHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "objects_root",
      label: "Objects",
      category: "objects",
      editable: false,
      children: [
        {
          id: "main_subject",
          label: "Main subject",
          category: "objects",
          editable: true,
          children: [],
        },
      ],
    },
    {
      id: "background_root",
      label: "Background",
      category: "background",
      editable: false,
      children: [
        { id: "bg_color", label: "Color", category: "background", editable: true, children: [] },
      ],
    },
  ];
}

function portraitVision(): AssetVisionAnalysis {
  return {
    objectType: "human",
    objectTypeLabel: "Person",
    visualStyle: "photo",
    colors: [],
    shapeLanguage: [],
    keyFeatures: ["face"],
    brandIdentity: "",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.8,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.5,
    identityFingerprint: {
      fingerprintHash: "portrait",
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

describe("editor vision auto-analysis guards", () => {
  it("background-only estimate does not count as rich analysis", () => {
    const doc = baseDoc({
      visionHierarchy: backgroundOnlyHierarchy(),
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 0,
        visionPartCount: 0,
        mergedLayerCount: 4,
        openAiPartsUsed: false,
        layerSources: [],
      },
      analyzedBackgroundUrl: "https://example.com/portrait.jpg",
    });
    assert.equal(isWeakBackgroundOnlyAnalysis(doc), true);
    assert.equal(documentHasRichVisionAnalysis(doc), false);
    assert.equal(documentNeedsDetectionBootstrap(doc), true);
  });

  it("main subject + background does not count as rich analysis", () => {
    const doc = baseDoc({
      visionHierarchy: mainSubjectHierarchy(),
      analyzedBackgroundUrl: "https://example.com/portrait.jpg",
    });
    assert.equal(isWeakBackgroundOnlyAnalysis(doc), true);
    assert.equal(documentHasRichVisionAnalysis(doc), false);
    assert.equal(documentNeedsDetectionBootstrap(doc), true);
  });

  it("re-analyze forces new analysisId and clears weak terminal state", () => {
    const backgroundUrl = "https://example.com/portrait.jpg";
    const doc = baseDoc({
      visionHierarchy: backgroundOnlyHierarchy(),
      visionAnalysisRun: {
        runId: "run_old",
        analysisId: "analysis_old",
        assetId: "asset",
        projectId: "project",
        backgroundUrl,
        sessionId: "sess_auto",
        status: "complete",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
        finalCount: 4,
      },
      isolationScope: {
        analysisId: "analysis_old",
        assetId: "asset",
        projectId: "project",
        backgroundUrl,
        sessionId: "sess_auto",
      },
      analyzedBackgroundUrl: backgroundUrl,
    });
    const reset = reanalyzeEditorProjectFromCurrentImage(doc);
    assert.notEqual(reset.isolationScope?.analysisId, "analysis_old");
    assert.equal(reset.visionHierarchy, undefined);
    assert.equal(reset.visionAnalysisRun, undefined);
    assert.equal(reset.analyzedBackgroundUrl, undefined);
    assert.equal(documentNeedsDetectionBootstrap(reset), true);
  });

  it("human portrait gets provisional Personage from RT-DETR", () => {
    const detections = [
      { label: "person", confidence: 0.92, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } },
    ];
    assert.equal(resolveProvisionalSubjectLabel(detections, portraitVision()), "Personage");
    const analysis = ensureProvisionalSubjectFromDetections(
      { parts: [], characterLabel: "", openAiUsed: false, templateUsed: true },
      detections,
      portraitVision()
    );
    assert.equal(analysis.characterLabel, "Personage");
    assert.ok(analysis.parts.some((part) => part.group === "character" && part.source === "rtdetr"));
  });

  it("dog photo gets provisional Dier from RT-DETR", () => {
    const detections = [
      { label: "dog", confidence: 0.88, box: { x: 0.25, y: 0.2, width: 0.45, height: 0.65 } },
    ];
    const vision = { ...portraitVision(), objectType: "unknown" as const, objectTypeLabel: "Image" };
    assert.equal(resolveProvisionalSubjectLabel(detections, vision), "Dier");
    const analysis = ensureProvisionalSubjectFromDetections(
      { parts: [], characterLabel: "", openAiUsed: false, templateUsed: true },
      detections,
      vision
    );
    assert.equal(analysis.characterLabel, "Dier");
    assert.ok(analysis.parts.some((part) => part.group === "character" && part.source === "rtdetr"));
  });

  it("mergeOpenAiIllustrationParts preserves RT-DETR subject when OpenAI returns background-only", () => {
    const template = buildLocalProvisionalPartAnalysis(portraitVision(), [
      { label: "person", confidence: 0.9, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } },
    ]);
    const openAiOnlyBackground = {
      characterLabel: "",
      parts: [
        {
          key: "bg_color",
          label: "Color",
          category: "background" as const,
          group: "background" as const,
          bbox: { x: 0, y: 0, width: 1, height: 1 },
          source: "openai_vision" as const,
          confidence: 0.7,
          editable: true,
        },
      ],
      openAiUsed: true,
      templateUsed: false,
    };
    const merged = mergeOpenAiIllustrationParts(template, openAiOnlyBackground);
    assert.ok(merged.parts.some((part) => part.group === "character"));
  });

  it("image visible triggers analysis automatically in hook wiring", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(hook, /imageVisible/);
    assert.match(hook, /shouldAttemptEditorAutoStart/);
    assert.match(workspace, /imageVisible/);
    assert.match(workspace, /useEditorVisionAnalysisRun\(document, onDocumentChange/);
    assert.match(workspace, /autoBootstrap: !instructionStudioActive/);
  });

  it("manual re-analyze forces bootstrap reset in canvas workspace", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /preserveUserEdits: false/);
  });

  it("RT-DETR subject survives background-only Style DNA merge wiring", () => {
    const bootstrap = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(bootstrap, /keepPriorLayers/);
    assert.match(bootstrap, /isWeakBackgroundOnlyAnalysis\(finalDocument\)/);
    assert.match(bootstrap, /applyLocalProvisionalParts\(\s*finalDocument/);
  });
});
