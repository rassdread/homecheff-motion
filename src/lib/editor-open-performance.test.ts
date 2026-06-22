import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  beginEditorOpenTimingSession,
  getEditorOpenTimingAudit,
  markEditorOpenTiming,
  recordEditorOpenStage,
  resetEditorOpenTimingForTests,
} from "@/lib/editor-open-timing";

describe("editor image open performance", () => {
  it("1 — selecting image creates local document before analysis", () => {
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    assert.match(start, /persistEditorWizardDocument/);
    assert.match(start, /onOpenDocument\(persistResult\.document\)/);
    assert.doesNotMatch(start, /await runEditorVisionAndObjectDetection/);
    assert.doesNotMatch(start, /await createEditorProject\(withMode\)/);
  });

  it("2 — editor renders image before bootstrap", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    const preview = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"),
      "utf8"
    );
    assert.match(workspace, /EditorCanvasPreview/);
    assert.match(workspace, /onBackgroundImageLoad=\{handleBackgroundImageVisible\}/);
    assert.match(preview, /onBackgroundImageLoad/);
    assert.match(preview, /document\.backgroundUrl/);
  });

  it("3 — analysis starts after image is visible", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    const entrypoint = readFileSync(
      join(process.cwd(), "src/lib/start-editor-image-analysis.ts"),
      "utf8"
    );
    assert.match(hook, /shouldAttemptEditorAutoStart/);
    assert.match(hook, /startEditorImageAnalysis/);
    assert.match(entrypoint, /markEditorOpenTiming\("analysisStartedAt"\)/);
  });

  it("4 — HC project creation is deferred", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /scheduleIdleTask\(\(\) => \{/);
    assert.match(workspace, /ensureHcProjectOnEditorOpen\(/);
    const hcBlock = workspace.slice(
      workspace.indexOf("scheduleIdleTask(() => {"),
      workspace.indexOf("}, [document.sessionId, document.instructionStudioState?.hcProjectId")
    );
    assert.match(hcBlock, /ensureHcProjectOnEditorOpen/);
  });

  it("5 — Copilot context does not block first render", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /copilotContextReady/);
    assert.match(workspace, /if \(!copilotContextReady \|\| !imageVisible\)/);
    assert.match(workspace, /requestAnimationFrame\(\(\) => \{\s*setCopilotContextReady\(true\)/);
  });

  it("6 — timing markers are recorded", () => {
    resetEditorOpenTimingForTests();
    beginEditorOpenTimingSession("sess-perf");
    markEditorOpenTiming("imageSelectedAt", 100);
    markEditorOpenTiming("localDocumentSavedAt", 120);
    markEditorOpenTiming("imageVisibleAt", 400);
    recordEditorOpenStage("analysis_preparing");
    const audit = getEditorOpenTimingAudit();
    assert.equal(audit.timings.imageSelectedAt, 100);
    assert.equal(audit.timings.imageVisibleAt, 400);
    assert.equal(audit.stage, "analysis_preparing");
  });

  it("7 — no project restore during image open", () => {
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(start, /fetchEditorProject\(withMode/);
    assert.doesNotMatch(start, /restoreEditorSessionFromServerIfAllowed/);
    assert.match(page, /shouldSkipEditorSessionServerRestore/);
  });

  it("reference upload marks imageSelectedAt", () => {
    const flow = readFileSync(
      join(process.cwd(), "src/components/editor/editor-reference-role-flow.tsx"),
      "utf8"
    );
    assert.match(flow, /markEditorOpenTiming\("imageSelectedAt"\)/);
  });

  it("server project create is idle-deferred after open", () => {
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    assert.match(start, /void createEditorProject\(persistResult\.document\)/);
  });
});
