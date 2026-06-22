import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  analysisTierFromDocument,
  logEditorPremiumAnalysisFlow,
  mergedPartsCountFromDocument,
} from "@/lib/editor-premium-analysis-flow";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

describe("editor premium analysis flow", () => {
  it("logs structured premium flow payload in dev", () => {
    const original = console.error;
    const lines: unknown[] = [];
    console.error = (...args: unknown[]) => {
      lines.push(args[0]);
    };
    try {
      logEditorPremiumAnalysisFlow({
        step: "button_handler",
        analysisDepth: "premium",
        gateAllowed: true,
        loadingState: "running",
      });
      assert.equal(lines.length, 1);
      assert.match(String(lines[0]), /\[editor\.premium\.analysis\.flow\]/);
    } finally {
      console.error = original;
    }
  });

  it("reads tier and merged part counts from document", () => {
    const doc = {
      visionV6Meta: {
        analysisTier: "premium" as const,
        mergedAnalysisParts: [{ key: "a", label: "Eyes", category: "face" as const, group: "character" as const, source: "openai_vision" as const, editable: true }],
      },
    } as EditorCanvasDocument;
    assert.equal(analysisTierFromDocument(doc), "premium");
    assert.equal(mergedPartsCountFromDocument(doc), 1);
  });

  it("does not show stale 100% ready while premium re-run is active", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "ready",
      runMeta: {
        runId: "run-basic",
        analysisId: "analysis-basic",
        assetId: "asset",
        projectId: "project",
        backgroundUrl: "https://example.com/a.png",
        sessionId: "session",
        status: "complete",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
        lastStage: "bootstrap_complete",
      },
      premiumAnalysisActive: true,
      previousPercent: 100,
      previousSnapshot: {
        percent: 100,
        stage: "ready",
        labelKey: "editor.open.stage.ready",
        showProgress: true,
      },
    });
    assert.notEqual(snapshot.percent, 100);
    assert.equal(snapshot.showProgress, true);
  });
});

describe("premium entry wiring", () => {
  it("isolation controls delegate premium to shared hook callback", () => {
    const isolation = readFileSync(
      join(process.cwd(), "src/components/editor/editor-project-isolation-controls.tsx"),
      "utf8"
    );
    const canvas = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    assert.match(isolation, /onRunPremiumAnalysis/);
    assert.doesNotMatch(isolation, /startEditorImageAnalysis\(/);
    assert.match(canvas, /onRunPremiumAnalysis=\{\(\) => visionRunPremiumAnalysis\(document\)\}/);
    assert.match(hook, /runPremiumAnalysis/);
    assert.match(hook, /premiumAnalysisActive/);
    assert.match(hook, /documentsEquivalentForGuard/);
  });
});
