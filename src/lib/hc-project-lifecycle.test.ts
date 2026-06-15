import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  defaultHcProjectTitleFallback,
  ensureHcProjectOnEditorOpen,
  isUntitledHcProjectName,
  listHcProjectsByWorkflowStatus,
  readHcProjectWorkflowStatus,
  resolveHcProjectSaveMessageKey,
} from "@/lib/hc-project-lifecycle";
import { nl } from "@/i18n/locales/nl";

describe("hc-project-lifecycle", () => {
  it("creates concept project when editor opens without hcProjectId", () => {
    const document = {
      sessionId: "sess-1",
      name: "Logo The Brand",
      backgroundUrl: "https://example.com/a.png",
      objects: [],
      instructionStudioState: {},
      updatedAt: new Date().toISOString(),
    } as never;
    const linked = ensureHcProjectOnEditorOpen({ document });
    assert.ok(linked.instructionStudioState?.hcProjectId);
    assert.equal(readHcProjectWorkflowStatus({ metadata: { workflowStatus: "concept" } } as never), "concept");
  });

  it("uses workflow status filters for projects hub", () => {
    const projects = [
      { id: "1", isArchived: false, metadata: { workflowStatus: "concept" }, updatedAt: "2026-01-01" },
      { id: "2", isArchived: false, metadata: { workflowStatus: "in_progress" }, updatedAt: "2026-01-02" },
      { id: "3", isArchived: true, metadata: { workflowStatus: "archived" }, updatedAt: "2026-01-03" },
    ] as never[];
    assert.equal(listHcProjectsByWorkflowStatus(projects, "concept").length, 1);
    assert.equal(listHcProjectsByWorkflowStatus(projects, "active").length, 2);
    assert.equal(listHcProjectsByWorkflowStatus(projects, "archived").length, 1);
  });

  it("maps save messages to project-first copy", () => {
    assert.equal(
      resolveHcProjectSaveMessageKey({ workflowStatus: "concept", created: true }),
      "hcProject.save.savedConcept"
    );
    assert.equal(
      resolveHcProjectSaveMessageKey({ workflowStatus: "in_progress", created: false }),
      "hcProject.save.updated"
    );
    assert.ok(nl["hcProject.save.savedConcept"]);
    assert.ok(nl["editor.menu.saveProject"]);
  });

  it("detects default untitled project names", () => {
    assert.equal(isUntitledHcProjectName("Nieuw Editor-project"), true);
    assert.equal(isUntitledHcProjectName("Logo The Brand"), false);
    assert.equal(defaultHcProjectTitleFallback("editor"), "Nieuw Editor-project");
  });
});

describe("hc project menu audit", () => {
  const menu = readFileSync(join(process.cwd(), "src/components/editor/editor-menu.tsx"), "utf8");
  const workspace = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );

  it("editor menu exposes project-first actions with handlers", () => {
    assert.match(menu, /onSaveProject/);
    assert.match(menu, /onRenameProject/);
    assert.match(menu, /onSaveAsNewProject/);
    assert.match(menu, /onOpenInProjects/);
    assert.doesNotMatch(menu, /saveDraft/);
    assert.doesNotMatch(menu, /editor\.menu\.save"/);
  });

  it("workspace wires menu handlers and open in projects route", () => {
    assert.match(workspace, /onSaveProject=\{requestSaveProject\}/);
    assert.match(workspace, /onOpenInProjects=\{handleOpenInProjects\}/);
    assert.match(workspace, /router\.push\(`\/projects/);
    assert.match(workspace, /saveEditorDocumentToHcProject/);
  });

  it("local edit panel can save as project", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/projects/recent-local-edits-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /saveLocalEditAsHcProject/);
    assert.match(panel, /router\.push\(`\/projects/);
  });
});
