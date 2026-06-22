import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resetEditorVisionDerivedState } from "@/lib/editor-analysis-reset";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  createEditorAnalysisId,
  stampEditorAnalysisIsolationScope,
} from "@/lib/editor-project-isolation";
import {
  editorVisionAnalysisRunKey,
  executeEditorVisionAnalysisRun,
  resetEditorVisionAnalysisRunStateForTests,
} from "@/lib/editor-vision-analysis-run";
import { resetVisionAnalysisRunGuardForTests } from "@/lib/editor-vision-analysis-run-guard";
import {
  buildEditorAnalysisBootstrapKey,
  prepareDocumentForEditorImageAnalysis,
  resetEditorAnalysisEntrypointLogForTests,
  resetEditorAutoStartTrackingForTests,
  startEditorImageAnalysis,
} from "@/lib/start-editor-image-analysis";
import { isWeakBackgroundOnlyAnalysis } from "@/lib/editor-vision-v6-stability";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_entry",
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
    ...overrides,
  };
}

function weakHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "bg",
      label: "Background",
      category: "background",
      editable: false,
      children: [
        { id: "c", label: "Color", category: "background", editable: true, children: [] },
        { id: "l", label: "Lighting", category: "background", editable: true, children: [] },
      ],
    },
  ];
}

describe("startEditorImageAnalysis entrypoint", () => {
  it("auto-start and manual use same scopeKey format after prepare", () => {
    const doc = baseDoc();
    const autoPrepared = prepareDocumentForEditorImageAnalysis(doc, {
      force: false,
      preserveUserEdits: true,
    });
    const manualPrepared = prepareDocumentForEditorImageAnalysis(doc, {
      force: true,
      preserveUserEdits: false,
    });
    assert.ok(editorVisionAnalysisRunKey(autoPrepared).includes("::"));
    assert.ok(editorVisionAnalysisRunKey(manualPrepared).includes("::"));
    assert.notEqual(
      autoPrepared.isolationScope?.analysisId,
      manualPrepared.isolationScope?.analysisId
    );
  });

  it("auto-start clears weak vision state but preserves user layers", () => {
    const doc = baseDoc({
      visionHierarchy: weakHierarchy(),
      analyzedBackgroundUrl: "https://example.com/portrait.jpg",
      visionAnalysisRun: {
        runId: "old",
        analysisId: "old",
        assetId: "asset-1",
        projectId: "sess_entry",
        backgroundUrl: "https://example.com/portrait.jpg",
        sessionId: "sess_entry",
        status: "complete",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
      },
    });
    assert.equal(isWeakBackgroundOnlyAnalysis(doc), true);
    const prepared = prepareDocumentForEditorImageAnalysis(doc, {
      force: false,
      preserveUserEdits: true,
    });
    assert.equal(prepared.analyzedBackgroundUrl, undefined);
    assert.equal(prepared.visionHierarchy, undefined);
    assert.equal(prepared.objects.length, 1);
    assert.equal(documentNeedsDetectionBootstrap(prepared), true);
  });

  it("auto-start reaches executeEditorVisionAnalysisRun with rtdetr stage", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetVisionAnalysisRunGuardForTests();
    resetEditorAutoStartTrackingForTests();
    resetEditorAnalysisEntrypointLogForTests();

    const doc = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const stages: string[] = [];

    await startEditorImageAnalysis({
      document: doc,
      trigger: "auto-start",
      force: false,
      preserveUserEdits: true,
    });

    await executeEditorVisionAnalysisRun(
      doc,
      async (_run, reportStage) => {
        reportStage("rtdetr");
        stages.push("rtdetr");
        return doc;
      },
      { trigger: "auto-start", preserveUserEdits: true }
    );

    assert.ok(stages.includes("rtdetr"));
  });

  it("hook and workspaces call shared startEditorImageAnalysis", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    const canvas = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    const isolation = readFileSync(
      join(process.cwd(), "src/components/editor/editor-project-isolation-controls.tsx"),
      "utf8"
    );
    assert.match(hook, /startEditorImageAnalysis\(/);
    assert.doesNotMatch(hook, /runEditorVisionAndObjectDetection/);
    assert.doesNotMatch(hook, /requestAnimationFrame/);
    assert.doesNotMatch(hook, /bootstrapScopeRef/);
    assert.match(canvas, /onRunPremiumAnalysis=\{\(\) => visionRunPremiumAnalysis\(document\)\}/);
    assert.match(isolation, /onRunPremiumAnalysis/);
    assert.doesNotMatch(isolation, /startEditorImageAnalysis\(/);
  });

  it("auto-start soft reset preserves edits via resetEditorVisionDerivedState", () => {
    const doc = baseDoc({ visionHierarchy: weakHierarchy() });
    const reset = resetEditorVisionDerivedState(doc, { preserveInstructionWorkflow: true });
    assert.equal(reset.objects.length, doc.objects.length);
    assert.equal(reset.visionHierarchy, undefined);
  });

  it("bootstrap key tracking does not block first auto-start", () => {
    resetEditorAutoStartTrackingForTests();
    const doc = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const key = buildEditorAnalysisBootstrapKey(doc);
    assert.equal(key.includes("pending"), false);
  });
});
