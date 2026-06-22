import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  canRestoreFromServer,
  getProjectRestoreAudit,
  isAnalysisBlockingRestore,
  isExplicitServerRestoreRequested,
  resetProjectRestoreAuditForTests,
  shouldSkipEditorSessionServerRestore,
} from "@/lib/editor-project-restore";
import { resolveEditorDocumentOrigin, stampHcProjectOrigin } from "@/lib/editor-project-origin";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function baseDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-restore-audit",
    name: "Test",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/a.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    projectOrigin: "local",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("editor project restore optimization", () => {
  it("1 — local session with local document skips server GET", () => {
    const skip = shouldSkipEditorSessionServerRestore({
      sessionId: "sess-local",
      document: baseDoc({ sessionId: "sess-local", projectOrigin: "local" }),
    });
    assert.equal(skip.skip, true);
    assert.equal(skip.reason, "local_document_exists");
  });

  it("2 — generated session UUID does not fetch server by default", () => {
    const skip = shouldSkipEditorSessionServerRestore({
      sessionId: "94c925f0-7c5d-42c3-9375-d628394dc79e",
      document: null,
      userRequestedRestore: false,
    });
    assert.equal(skip.skip, true);
    assert.equal(skip.reason, "local_first_session");
  });

  it("3 — server/synced project may fetch when local missing", () => {
    const server = canRestoreFromServer({
      origin: "server",
      localExists: false,
      analysisStatus: "complete",
    });
    assert.equal(server.allowed, true);
    assert.equal(server.reason, "missing_local_server_origin");

    const synced = canRestoreFromServer({
      origin: "synced",
      localExists: false,
      analysisStatus: "complete",
    });
    assert.equal(synced.allowed, true);
  });

  it("4 — missing local + explicit restore may fetch", () => {
    const skip = shouldSkipEditorSessionServerRestore({
      sessionId: "server-sess",
      document: null,
      origin: "server",
      userRequestedRestore: true,
    });
    assert.equal(skip.skip, false);
    assert.equal(skip.reason, "user_requested");
  });

  it("5 — new project flow does not fetch stale session", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    assert.match(page, /handleNewProject/);
    assert.match(page, /sessionRestoreRef\.current = null/);
    assert.match(page, /syncEditorRoute\(\{ stripRestoreServer: true \}, "route_cleared"\)/);
    assert.doesNotMatch(start, /fetchEditorProject\(analyzed\.sessionId\)/);
    assert.match(start, /createEditorProject\(withMode\)/);
    assert.match(start, /scheduleIdleTask/);
  });

  it("6 — re-analyze does not fetch server session", () => {
    const isolation = readFileSync(
      join(process.cwd(), "src/components/editor/editor-project-isolation-controls.tsx"),
      "utf8"
    );
    assert.doesNotMatch(isolation, /fetchEditorProject/);
    assert.match(isolation, /startEditorImageAnalysis/);

    const skip = shouldSkipEditorSessionServerRestore({
      sessionId: "sess-reanalyze",
      document: baseDoc({
        sessionId: "sess-reanalyze",
        projectOrigin: "local",
        visionAnalysisRun: {
          runId: "run-1",
          status: "detecting",
          pipelineCalls: 1,
          sourceOrder: [],
          duplicateRunCount: 0,
          isPartial: true,
          startedAt: new Date().toISOString(),
        },
      }),
    });
    assert.equal(skip.skip, true);
    assert.equal(skip.reason, "analysis_in_progress");
  });

  it("Scenario A — fresh local upload blocks server GET during analysis", () => {
    resetProjectRestoreAuditForTests();
    const gate = canRestoreFromServer({
      origin: "local",
      localExists: true,
      analysisStatus: "detecting",
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "analysis_in_progress");
  });

  it("Scenario B — re-analyze local document blocks restore", () => {
    const gate = canRestoreFromServer({
      origin: "local",
      localExists: true,
      analysisStatus: "partial",
    });
    assert.equal(gate.allowed, false);
  });

  it("Scenario C — local HC project never triggers server restore", () => {
    const gate = canRestoreFromServer({
      origin: "local",
      localExists: true,
      analysisStatus: "complete",
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "local_document_exists");
  });

  it("Scenario D — server-origin missing local allows restore", () => {
    const gate = canRestoreFromServer({
      origin: "server",
      localExists: false,
      analysisStatus: "idle",
    });
    assert.equal(gate.allowed, true);
    assert.equal(gate.reason, "missing_local_server_origin");
  });

  it("Scenario E — active analysis blocks restore", () => {
    assert.equal(isAnalysisBlockingRestore("detecting"), true);
    assert.equal(isAnalysisBlockingRestore("partial"), true);
    assert.equal(isAnalysisBlockingRestore("finalizing"), true);
    assert.equal(isAnalysisBlockingRestore("complete"), false);
  });

  it("Scenario F — synced origin allows idle restore when user requests", () => {
    const gate = canRestoreFromServer({
      origin: "synced",
      localExists: true,
      analysisStatus: "complete",
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "local_copy_present");
    const forced = canRestoreFromServer({
      origin: "synced",
      localExists: true,
      userRequestedRestore: true,
      analysisStatus: "complete",
    });
    assert.equal(forced.allowed, true);
  });

  it("EditorProductPage uses local-first session hydrate", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(page, /shouldSkipEditorSessionServerRestore/);
    assert.match(page, /local_document_exists|recordEditorSessionRestoreSkipped/);
    assert.doesNotMatch(page, /fetchEditorProject/);
    assert.match(page, /isExplicitServerRestoreRequested/);
  });

  it("loadHcProjectResolved respects canRestoreFromServer", () => {
    const sync = readFileSync(join(process.cwd(), "src/lib/homecheff-project-sync.ts"), "utf8");
    assert.match(sync, /canRestoreFromServer/);
    assert.match(sync, /resolveHcProjectOrigin/);
  });

  it("explicit restore query param is recognized", () => {
    assert.equal(
      isExplicitServerRestoreRequested(new URLSearchParams("restoreServer=1")),
      true
    );
    assert.equal(
      isExplicitServerRestoreRequested(new URLSearchParams("session=abc")),
      false
    );
  });

  it("resolveEditorDocumentOrigin defaults to local", () => {
    assert.equal(resolveEditorDocumentOrigin(baseDoc()), "local");
  });

  it("stampHcProjectOrigin persists in metadata", () => {
    const project = stampHcProjectOrigin(
      {
        id: "hcproj_test",
        version: 1,
        projectType: "editor",
        createdAt: "",
        updatedAt: "",
        title: "T",
        permissions: { shareMode: "private_backup", canEdit: true, canExport: true, canHandoff: true },
        assetReferences: [],
        generationPackageIds: [],
        workflowState: {},
        metadata: {},
        prompts: {},
        settings: {},
        handoffHistory: [],
        servicePayload: {},
      },
      "local"
    );
    assert.equal(project.metadata.projectOrigin, "local");
  });

  it("restore audit panel is wired in debug UI", () => {
    const debug = readFileSync(
      join(process.cwd(), "src/components/editor/editor-vision-v6-debug-panel.tsx"),
      "utf8"
    );
    const audit = readFileSync(
      join(process.cwd(), "src/components/editor/editor-project-restore-audit-panel.tsx"),
      "utf8"
    );
    assert.match(debug, /EditorProjectRestoreAuditPanel/);
    assert.match(audit, /Project Restore Audit/);
  });

  it("records audit reset helper", () => {
    resetProjectRestoreAuditForTests();
    assert.equal(getProjectRestoreAudit(), null);
  });
});
