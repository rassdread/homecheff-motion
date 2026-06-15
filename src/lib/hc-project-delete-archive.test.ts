import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  __resetEditorCanvasSessionsForTests,
  createEditorDocumentFromUpload,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import {
  __resetGenerationPackageStoresForTests,
  listGenerationLibraryRecords,
  persistGenerationLibraryRecord,
} from "@/lib/editor-generation-package-persist";
import {
  archiveHcProjectRecord,
  bulkArchiveHcProjectRecords,
  hcProjectHasExportedResults,
  listActiveHcProjectsForHub,
  permanentlyDeleteHcProjectRecord,
  restoreHcProjectRecord,
} from "@/lib/hc-project-delete-archive";
import { attachStoryboardToHcProject, readHcProjectWorkflowStatus, transitionHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import {
  extendHcProjectWithMotionState,
  extendHcProjectWithPublishState,
} from "@/lib/homecheff-project-handoff";
import { getLegacyProjectRegistryEntry, linkLegacyToHcProject, registerLegacyProject } from "@/lib/homecheff-project-legacy-registry";
import {
  __resetHomeCheffProjectsForTests,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { listRecentLocalEdits } from "@/lib/recent-local-edits";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

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
    value: { localStorage: storage },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return storage;
}

function resetStores() {
  __resetHomeCheffProjectsForTests();
  __resetEditorCanvasSessionsForTests();
  __resetGenerationPackageStoresForTests();
}

function sampleProject(overrides: Partial<HomeCheffProjectPackage> = {}): HomeCheffProjectPackage {
  const doc = createEditorDocumentFromUpload({
    name: "Test Project",
    backgroundUrl: "https://cdn.example.com/base.jpg",
  });
  const project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  return { ...project, ...overrides };
}

function persistSample(overrides: Partial<HomeCheffProjectPackage> = {}): HomeCheffProjectPackage {
  const project = sampleProject(overrides);
  return persistHomeCheffProject(project);
}

describe("hc-project-delete-archive", () => {
  it("1. deletes active project", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample();
    const result = permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(result.ok, true);
    assert.equal(loadHomeCheffProject(project.id), null);
  });

  it("2. deletes archived project", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample({ isArchived: true, metadata: { workflowStatus: "archived" } });
    const result = permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(result.ok, true);
    assert.equal(loadHomeCheffProject(project.id), null);
  });

  it("3. archives project with archived workflow status", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample();
    const archived = archiveHcProjectRecord(project.id);
    assert.ok(archived);
    assert.equal(archived.isArchived, true);
    assert.equal(readHcProjectWorkflowStatus(archived), "archived");
    assert.equal(listActiveHcProjectsForHub().some((p) => p.id === project.id), false);
  });

  it("4. restores archived project", () => {
    installMemoryLocalStorage();
    resetStores();
    let project = persistSample();
    project = transitionHcProjectWorkflowStatus(project, "motion_ready");
    archiveHcProjectRecord(project.id);
    const restored = restoreHcProjectRecord(project.id);
    assert.ok(restored);
    assert.equal(restored.isArchived, false);
    assert.equal(readHcProjectWorkflowStatus(restored), "motion_ready");
  });

  it("5. deletes project with storyboard link without deleting storyboard id from elsewhere", () => {
    installMemoryLocalStorage();
    resetStores();
    let project = persistSample();
    project = attachStoryboardToHcProject(project, "sb-123");
    persistHomeCheffProject(project);
    const storyboardId = project.servicePayload.studio?.storyboardId;
    assert.equal(storyboardId, "sb-123");
    permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(loadHomeCheffProject(project.id), null);
  });

  it("6. deletes project with motion link", () => {
    installMemoryLocalStorage();
    resetStores();
    let project = persistSample();
    project = extendHcProjectWithMotionState(project, { durationSec: 6 });
    persistHomeCheffProject(project);
    permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(loadHomeCheffProject(project.id), null);
  });

  it("7. deletes project with publish link", () => {
    installMemoryLocalStorage();
    resetStores();
    let project = persistSample();
    project = extendHcProjectWithPublishState(project);
    persistHomeCheffProject(project);
    permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(loadHomeCheffProject(project.id), null);
  });

  it("8. shared library assets remain intact after project delete", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample({
      assetReferences: [
        {
          id: "asset-char-1",
          url: "https://cdn.example.com/char.png",
          kind: "character",
          sourceService: "library",
          createdAt: new Date().toISOString(),
          accessScope: "owner",
        },
      ],
      servicePayload: {
        library: { savedAssetIds: ["asset-char-1"] },
      },
    });
    persistGenerationLibraryRecord({
      sessionId: "lib-session-1",
      packageId: "pkg-char-1",
      workflow: "character",
      name: "Mascot",
      primaryUrl: "https://cdn.example.com/char.png",
      savedAt: new Date().toISOString(),
      package: {
        id: "pkg-char-1",
        name: "Mascot",
        workflow: "character",
        updatedAt: new Date().toISOString(),
      } as never,
    });
    permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(loadHomeCheffProject(project.id), null);
    assert.equal(listGenerationLibraryRecords().length, 1);
    assert.equal(listGenerationLibraryRecords()[0]?.packageId, "pkg-char-1");
  });

  it("9. recent edits cleaned up after delete", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample();
    let doc = createEditorDocumentFromUpload({
      name: "Linked edit",
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
    const before = listRecentLocalEdits();
    assert.equal(before[0]?.storage, "linked");

    permanentlyDeleteHcProjectRecord(project.id);
    const recent = listRecentLocalEdits();
    assert.equal(recent.length, 1);
    assert.equal(recent[0]?.storage, "local");
  });

  it("10. project disappears from Projects hub list", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample();
    assert.equal(listActiveHcProjectsForHub().some((p) => p.id === project.id), true);
    permanentlyDeleteHcProjectRecord(project.id);
    assert.equal(listActiveHcProjectsForHub().some((p) => p.id === project.id), false);
  });

  it("bulk archive archives multiple projects", () => {
    installMemoryLocalStorage();
    resetStores();
    const a = persistSample({ title: "A" });
    const b = persistSample({ title: "B" });
    const count = bulkArchiveHcProjectRecords([a.id, b.id]);
    assert.equal(count, 2);
    assert.equal(readHcProjectWorkflowStatus(loadHomeCheffProject(a.id)!), "archived");
    assert.equal(readHcProjectWorkflowStatus(loadHomeCheffProject(b.id)!), "archived");
  });

  it("exported projects are flagged for delete warning", () => {
    installMemoryLocalStorage();
    resetStores();
    let project = persistSample();
    project = transitionHcProjectWorkflowStatus(project, "exported");
    assert.equal(hcProjectHasExportedResults(project), true);
  });

  it("delete clears legacy registry links", () => {
    installMemoryLocalStorage();
    resetStores();
    const project = persistSample();
    registerLegacyProject({ legacyId: "legacy-1", service: "motion", title: "Old motion" });
    linkLegacyToHcProject("motion", "legacy-1", project.id);
    permanentlyDeleteHcProjectRecord(project.id);
    const entry = getLegacyProjectRegistryEntry("motion", "legacy-1");
    assert.ok(entry);
    assert.equal(entry.linkedHcProjectId, undefined);
  });
});
