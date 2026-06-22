import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  createEditorAnalysisId,
  ensureEditorAnalysisIsolationScope,
  stampEditorAnalysisIsolationScope,
} from "@/lib/editor-project-isolation";
import {
  buildEditorVisionRunMetaPreview,
  editorVisionAnalysisRunKey,
  executeEditorVisionAnalysisRun,
  prepareEditorVisionAnalysisRun,
  resetEditorVisionAnalysisRunStateForTests,
  runMetaIncludesRtdetr,
} from "@/lib/editor-vision-analysis-run";
import {
  detectRecentDuplicateAssetStart,
  getLastVisionRunGuardBlockReason,
  recordVisionAssetRunStart,
  resetVisionAnalysisRunGuardForTests,
} from "@/lib/editor-vision-analysis-run-guard";
import {
  resolveAutoStartSchedule,
  shouldAutoStartWatchdogRetry,
} from "@/lib/editor-vision-auto-start-schedule";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";
import {
  documentHasRichVisionAnalysis,
  isWeakBackgroundOnlyAnalysis,
} from "@/lib/editor-vision-v6-stability";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_auto_start",
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
    ...overrides,
  };
}

function weakBackgroundHierarchy(): EditorVisionHierarchyNode[] {
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

describe("editor vision auto-start schedule", () => {
  it("does not permanently skip when in-flight key differs from completed key after cancelled rAF", () => {
    const key = "sess::url::analysis-1";
    assert.equal(
      resolveAutoStartSchedule({
        bootstrapCompletedKey: key,
        bootstrapInFlightKey: null,
        bootstrapKey: key,
        needsBootstrap: true,
        hasRichVisionAnalysis: false,
      }),
      "skip_completed"
    );
    assert.equal(
      resolveAutoStartSchedule({
        bootstrapCompletedKey: null,
        bootstrapInFlightKey: key,
        bootstrapKey: key,
        needsBootstrap: true,
        hasRichVisionAnalysis: false,
      }),
      "skip_in_flight"
    );
    assert.equal(
      resolveAutoStartSchedule({
        bootstrapCompletedKey: null,
        bootstrapInFlightKey: null,
        bootstrapKey: key,
        needsBootstrap: true,
        hasRichVisionAnalysis: false,
      }),
      "run"
    );
  });

  it("watchdog retries when auto-start stuck before rtdetr", () => {
    assert.equal(
      shouldAutoStartWatchdogRetry({
        autoStartAttempted: true,
        autoStartRetryUsed: false,
        bootstrapCompletedKey: null,
        bootstrapKey: "sess::url::analysis-1",
        runHasRtdetr: false,
        runStatus: "detecting",
      }),
      true
    );
    assert.equal(
      shouldAutoStartWatchdogRetry({
        autoStartAttempted: true,
        autoStartRetryUsed: false,
        bootstrapCompletedKey: null,
        bootstrapKey: "sess::url::analysis-1",
        runHasRtdetr: true,
        runStatus: "detecting",
      }),
      false
    );
  });
});

describe("editor vision auto-start run path", () => {
  it("auto-start uses same scopeKey as UI subscription after prepare", () => {
    const doc = ensureEditorAnalysisIsolationScope(baseDoc());
    const prepared = prepareEditorVisionAnalysisRun(doc);
    const uiKey = editorVisionAnalysisRunKey(prepared);
    assert.ok(!uiKey.endsWith("::pending"));
    assert.equal(uiKey, editorVisionAnalysisRunKey(prepared));
    const preview = buildEditorVisionRunMetaPreview(prepared);
    assert.equal(preview?.analysisId, prepared.isolationScope?.analysisId);
  });

  it("auto-start reaches rtdetr after image visible path", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetVisionAnalysisRunGuardForTests();
    const doc = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const stages: string[] = [];
    await executeEditorVisionAnalysisRun(
      doc,
      async (_run, reportStage) => {
        reportStage("rtdetr");
        stages.push("rtdetr");
        reportStage("provisional");
        return { ...doc, visionHierarchy: [{ id: "p", label: "Personage", children: [] }] };
      },
      { trigger: "auto-start" }
    );
    assert.ok(stages.includes("rtdetr"));
  });

  it("weak background-only document is not blocked by duplicate guard", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetVisionAnalysisRunGuardForTests();
    const weakDoc = baseDoc({
      visionHierarchy: weakBackgroundHierarchy(),
      analyzedBackgroundUrl: "https://example.com/portrait.jpg",
    });
    assert.equal(isWeakBackgroundOnlyAnalysis(weakDoc), true);
    assert.equal(documentHasRichVisionAnalysis(weakDoc), false);
    assert.equal(documentNeedsDetectionBootstrap(weakDoc), true);

    const firstId = createEditorAnalysisId();
    const secondId = createEditorAnalysisId();
    const stamped = stampEditorAnalysisIsolationScope(weakDoc, firstId);
    const run = {
      runId: "run-first",
      analysisId: firstId,
      assetId: "asset-1",
      projectId: "sess_auto_start",
      backgroundUrl: stamped.backgroundUrl,
      sessionId: stamped.sessionId,
    };
    recordVisionAssetRunStart(
      `${run.projectId}::${run.assetId}::https://example.com/portrait.jpg`,
      run,
      `${run.projectId}::${run.assetId}::${firstId}`
    );

    const second = stampEditorAnalysisIsolationScope(weakDoc, secondId);
    const dup = detectRecentDuplicateAssetStart(
      `${run.projectId}::${run.assetId}::https://example.com/portrait.jpg`,
      {
        analysisId: secondId,
        assetId: "asset-1",
        projectId: "sess_auto_start",
        backgroundUrl: second.backgroundUrl,
        sessionId: second.sessionId,
      }
    );
    assert.equal(dup.duplicate, true);
    assert.equal(dup.sameAnalysisId, false);

    let runnerCalls = 0;
    const result = await executeEditorVisionAnalysisRun(
      second,
      async () => {
        runnerCalls += 1;
        return second;
      },
      { trigger: "auto-start" }
    );
    assert.equal(runnerCalls, 1);
    assert.equal(result.sessionId, second.sessionId);
    assert.equal(getLastVisionRunGuardBlockReason(), null);
  });

  it("duplicate guard does not ignore first auto-start", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetVisionAnalysisRunGuardForTests();
    const doc = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    let runnerCalls = 0;
    await executeEditorVisionAnalysisRun(
      doc,
      async () => {
        runnerCalls += 1;
        return doc;
      },
      { trigger: "auto-start" }
    );
    assert.equal(runnerCalls, 1);
    assert.equal(getLastVisionRunGuardBlockReason(), null);
  });

  it("run meta preview advances progress past 28% openStage fallback", () => {
    const doc = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const preview = buildEditorVisionRunMetaPreview(doc)!;
    const progress = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: preview,
    });
    assert.ok(progress.percent > 28);
    assert.equal(progress.stage, "analysis_preparing");
  });

  it("runMetaIncludesRtdetr detects pipeline stage", () => {
    assert.equal(
      runMetaIncludesRtdetr({
        runId: "r",
        analysisId: "a",
        assetId: "asset",
        projectId: "p",
        backgroundUrl: "url",
        sessionId: "s",
        status: "detecting",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["analysis_preparing", "rtdetr"],
        isPartial: false,
        lastStage: "rtdetr",
      }),
      true
    );
  });

  it("hook wiring uses direct runAnalysis without rAF bootstrap lock", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    assert.doesNotMatch(hook, /requestAnimationFrame\(\(\) => \{\s*void runAnalysis/);
    assert.match(hook, /startEditorImageAnalysis/);
    assert.match(hook, /auto-start-retry/);
    assert.match(hook, /AUTO_START_WATCHDOG_MS/);
  });

  it("premium analyze keeps force reset path", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    assert.match(hook, /preserveUserEdits: false/);
    assert.match(hook, /force: true/);
    assert.match(hook, /trigger: "deep-analyze"/);
    assert.match(hook, /analysisDepth: "premium"/);
  });

  it("auto-start retry preserves document objects (no reanalyze reset)", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    assert.match(hook, /trigger: "auto-start-retry"/);
    assert.match(hook, /retry: true/);
    assert.doesNotMatch(hook, /reanalyzeEditorProjectFromCurrentImage/);
  });
});
