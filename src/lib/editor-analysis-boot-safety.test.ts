import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isEditorAutoAnalysisEnabled } from "@/lib/editor-auto-analysis-flag";
import { getSnapshot, resetVisionRunMetaStoreForTests, setRunMeta } from "@/lib/editor-vision-analysis-run-store";
import {
  EDITOR_VISION_HYDRATION_SAFE_PROGRESS,
  resolveEditorVisionAnalysisProgress,
} from "@/lib/editor-vision-analysis-progress";
import {
  buildEditorAutoStartStableKey,
  buildEditorAnalysisBootstrapKey,
  clearEditorAutoStartInFlight,
  isEditorAutoStartInFlight,
  markEditorAutoStartCompleted,
  markEditorAutoStartInFlight,
  resetEditorAutoStartTrackingForTests,
  shouldAttemptEditorAutoStart,
} from "@/lib/start-editor-image-analysis";
import {
  createEditorAnalysisId,
  stampEditorAnalysisIsolationScope,
} from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_boot",
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

describe("editor analysis boot safety", () => {
  it("startEditorImageAnalysis is only invoked from effects and manual handlers", () => {
    const hook = read("src/hooks/use-editor-vision-analysis-run.ts");
    assert.match(hook, /useEffect\(/);
    assert.match(hook, /useMounted\(\)/);
    assert.match(hook, /queueMicrotask\(\(\) => \{[\s\S]*void startAnalysis\(undefined/);
    assert.doesNotMatch(hook, /render\([\s\S]*startEditorImageAnalysis/);
  });

  it("auto-start waits for mounted and imageVisible", () => {
    const hook = read("src/hooks/use-editor-vision-analysis-run.ts");
    assert.match(hook, /if \(!mounted \|\| !autoBootstrap \|\| !imageVisible \|\| !document\.backgroundUrl/);
    assert.match(hook, /imageVisible/);
    assert.match(hook, /autoStartInitiatedKeyRef/);
    assert.match(hook, /autoStartAssetKeyRef/);
    assert.match(hook, /mounted,/);
  });

  it("getSnapshot returns stable reference when store value unchanged", () => {
    resetVisionRunMetaStoreForTests();
    const scopeKey = "proj::asset::analysis-1";
    const meta = {
      runId: "run-1",
      analysisId: "analysis-1",
      assetId: "asset",
      projectId: "proj",
      backgroundUrl: "https://example.com/p.jpg",
      sessionId: "proj",
      status: "detecting" as const,
      startedAt: new Date().toISOString(),
      pipelineCalls: 0,
      duplicateRunCount: 0,
      sourceOrder: [],
      isPartial: false,
    };
    setRunMeta(scopeKey, meta);
    const first = getSnapshot(scopeKey);
    const second = getSnapshot(scopeKey);
    assert.equal(first, second);
  });

  it("stable auto-start key ignores analysisId churn", () => {
    const docA = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const docB = stampEditorAnalysisIsolationScope(baseDoc(), createEditorAnalysisId());
    const stableA = buildEditorAutoStartStableKey(docA);
    const stableB = buildEditorAutoStartStableKey(docB);
    assert.equal(stableA, stableB);
    assert.notEqual(buildEditorAnalysisBootstrapKey(docA), buildEditorAnalysisBootstrapKey(docB));
  });

  it("does not re-attempt auto-start when stable key is in flight or completed", () => {
    resetEditorAutoStartTrackingForTests();
    const doc = baseDoc();
    const stableKey = buildEditorAutoStartStableKey(doc);

    markEditorAutoStartInFlight(stableKey);
    assert.equal(
      shouldAttemptEditorAutoStart({
        stableKey,
        needsBootstrap: true,
        imageVisible: true,
        autoBootstrap: true,
        acceptFailed: false,
        mounted: true,
      }).attempt,
      false
    );
    clearEditorAutoStartInFlight(stableKey);

    markEditorAutoStartCompleted(stableKey);
    assert.equal(
      shouldAttemptEditorAutoStart({
        stableKey,
        needsBootstrap: true,
        imageVisible: true,
        autoBootstrap: true,
        acceptFailed: false,
        mounted: true,
      }).attempt,
      false
    );
    assert.equal(isEditorAutoStartInFlight(stableKey), false);
  });

  it("disabling auto-analysis blocks auto-start but not mounted gate alone", () => {
    const previous = process.env.NEXT_PUBLIC_ENABLE_EDITOR_AUTO_ANALYSIS;
    process.env.NEXT_PUBLIC_ENABLE_EDITOR_AUTO_ANALYSIS = "false";
    try {
      assert.equal(isEditorAutoAnalysisEnabled(), false);
      assert.equal(
        shouldAttemptEditorAutoStart({
          stableKey: "sess::url",
          needsBootstrap: true,
          imageVisible: true,
          autoBootstrap: true,
          acceptFailed: false,
          mounted: true,
        }).blockedReason,
        "auto_analysis_disabled"
      );
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_EDITOR_AUTO_ANALYSIS;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_EDITOR_AUTO_ANALYSIS = previous;
      }
    }
  });

  it("hydration-safe progress uses fixed first-render snapshot", () => {
    const hook = read("src/hooks/use-editor-vision-analysis-progress.ts");
    assert.match(hook, /EDITOR_VISION_HYDRATION_SAFE_PROGRESS/);
    assert.match(hook, /HYDRATION_SAFE_PROGRESS_STATE/);
    assert.match(hook, /if \(!mounted\)/);
    assert.match(hook, /monotonicPercentRef/);
    assert.doesNotMatch(hook, /previousPercent: snapshot\.percent/);
    assert.doesNotMatch(hook, /useState\(\(\) =>\s*resolveEditorVisionAnalysisProgress/);
    assert.doesNotMatch(hook, /useState\(getEditorOpenStage/);
    assert.equal(EDITOR_VISION_HYDRATION_SAFE_PROGRESS.stage, "photo_loading");
    assert.equal(
      resolveEditorVisionAnalysisProgress({
        openStage: "photo_loading",
        cachedResult: false,
      }).stage,
      "photo_loading"
    );
  });

  it("hook guards onDocumentChange against identical analysisId writes", () => {
    const hook = read("src/hooks/use-editor-vision-analysis-run.ts");
    assert.match(hook, /guardedOnDocumentChange/);
    assert.match(hook, /isolationScope\?\.analysisId === next\.isolationScope\?\.analysisId/);
    assert.match(hook, /visionAnalysisRun\?\.runId === next\.visionAnalysisRun\?\.runId/);
  });
});
