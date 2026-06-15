import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  __resetEditorCanvasSessionsForTests,
  createEditorDocumentFromUpload,
  loadEditorCanvasDocument,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import {
  formatHcProjectRelativeUpdatedAt,
  hcProjectDuplicateTitle,
  shouldShowDefaultTitleReminder,
} from "@/lib/hc-project-card-utils";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { transitionHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import {
  __resetHomeCheffProjectsForTests,
  duplicateHcProject,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import {
  HC_PROJECT_TITLE_CHANGED_EVENT,
  renameHcProjectEverywhere,
} from "@/lib/hc-project-title-sync";

type MemoryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function installMemoryLocalStorage(): MemoryStorage {
  const map = new Map<string, string>();
  const storage: MemoryStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return storage;
}

function sampleProject(title = "Nieuw Studio-verhaal") {
  const doc = createEditorDocumentFromUpload({
    name: title,
    backgroundUrl: "https://cdn.example.com/base.jpg",
  });
  return buildHomeCheffProjectFromEditorDocument({ document: doc, ownerId: "owner" });
}

describe("hc-project-card-title v2.3", () => {
  it("1. rename from project card uses inline title editor", () => {
    const card = readFileSync(join(process.cwd(), "src/components/projects/hc-project-hub-card.tsx"), "utf8");
    const inline = readFileSync(join(process.cwd(), "src/components/projects/hc-project-inline-title.tsx"), "utf8");
    assert.match(card, /HcProjectInlineTitle/);
    assert.match(card, /renameHcProjectEverywhere/);
    assert.match(inline, /hc-project-inline-title-edit-button/);
  });

  it("2. rename from menu starts inline editing", () => {
    const card = readFileSync(join(process.cwd(), "src/components/projects/hc-project-hub-card.tsx"), "utf8");
    const menu = readFileSync(join(process.cwd(), "src/components/projects/hc-project-hub-card-menu.tsx"), "utf8");
    assert.match(menu, /onRename/);
    assert.match(card, /setRenaming\(true\)/);
  });

  it("3. inline title editor supports Enter save", () => {
    const inline = readFileSync(join(process.cwd(), "src/components/projects/hc-project-inline-title.tsx"), "utf8");
    assert.match(inline, /event\.key === "Enter"/);
    assert.match(inline, /hc-project-inline-title-save/);
  });

  it("4. inline title editor supports Escape cancel", () => {
    const inline = readFileSync(join(process.cwd(), "src/components/projects/hc-project-inline-title.tsx"), "utf8");
    assert.match(inline, /event\.key === "Escape"/);
    assert.match(inline, /hc-project-inline-title-cancel/);
  });

  it("5. title updates across modules via editor session sync", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    __resetEditorCanvasSessionsForTests();

    const project = persistHomeCheffProject(sampleProject("Nieuw Editor-project"));
    let doc = createEditorDocumentFromUpload({
      name: "Nieuw Editor-project",
      backgroundUrl: "https://cdn.example.com/edit.jpg",
    });
    doc = {
      ...doc,
      instructionStudioState: {
        ...doc.instructionStudioState,
        hcProjectId: project.id,
      },
    };
    saveEditorCanvasDocument(doc);

    const renamed = renameHcProjectEverywhere({
      project,
      title: "HomeCheff Community Video",
    });
    assert.ok(renamed);
    assert.equal(loadHomeCheffProject(project.id)?.title, "HomeCheff Community Video");
    const updatedDoc = loadEditorCanvasDocument(doc.sessionId);
    assert.equal(updatedDoc?.name, "HomeCheff Community Video");
  });

  it("6. project card hub keeps live project override for immediate refresh", () => {
    const hub = readFileSync(join(process.cwd(), "src/components/projects/homecheff-project-hub.tsx"), "utf8");
    assert.match(hub, /liveProjects/);
    assert.match(hub, /onRenamed/);
  });

  it("7. default title reminder appears for saved default titles", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    let project = sampleProject("Nieuw Studio-verhaal");
    project = {
      ...project,
      metadata: { ...project.metadata, workflowStatus: "concept" },
    };
    assert.equal(shouldShowDefaultTitleReminder(project), false);
    project = transitionHcProjectWorkflowStatus(project, "in_progress");
    assert.equal(shouldShowDefaultTitleReminder(project), true);
    const card = readFileSync(join(process.cwd(), "src/components/projects/hc-project-hub-card.tsx"), "utf8");
    assert.match(card, /hc-project-default-title-reminder/);
  });

  it("8. duplicate keeps original title with copy suffix", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    const project = persistHomeCheffProject(sampleProject("HomeCheff Community Video"));
    const copy = duplicateHcProject(project.id);
    assert.ok(copy);
    assert.equal(copy.title, hcProjectDuplicateTitle("HomeCheff Community Video"));
    assert.equal(copy.title, "HomeCheff Community Video (kopie)");
  });

  it("title sync dispatches cross-module event", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    let dispatched = false;
    Object.defineProperty(globalThis.window, "dispatchEvent", {
      value: (event: Event) => {
        if (event.type === HC_PROJECT_TITLE_CHANGED_EVENT) {
          dispatched = true;
        }
        return true;
      },
      configurable: true,
    });
    const project = persistHomeCheffProject(sampleProject());
    renameHcProjectEverywhere({ project, title: "Renamed Project" });
    assert.equal(dispatched, true);
  });

  it("relative updated label uses minutes bucket", () => {
    const now = Date.parse("2026-06-14T12:00:00.000Z");
    const key = formatHcProjectRelativeUpdatedAt("2026-06-14T11:58:00.000Z", now);
    assert.equal(key, "minutes_2");
  });
});
