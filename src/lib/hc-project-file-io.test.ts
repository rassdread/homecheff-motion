import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import {
  buildHcProjectExportManifest,
  importHcProjectFileAsNewProject,
  serializeHcProjectExportForTests,
  validateHcProjectFileContent,
} from "@/lib/hc-project-file-io";
import {
  buildHcHandoffUrl,
  hcProjectFilename,
  parseHomeCheffProjectFile,
} from "@/lib/homecheff-project-package-core";
import {
  __resetHomeCheffProjectsForTests,
  listHomeCheffProjectsFiltered,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { HOMECHEFF_PACKAGE_VERSION } from "@/types/homecheff-project-package";

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

function sampleProject(title = "HomeCheff Community Video") {
  const doc = createEditorDocumentFromUpload({
    name: title,
    backgroundUrl: "https://cdn.example.com/base.jpg",
  });
  return buildHomeCheffProjectFromEditorDocument({ document: doc, ownerId: "owner_a" });
}

describe("hc-project-file-io v2.2", () => {
  it("1. project menu contains Download .hc", () => {
    const menu = readFileSync(join(process.cwd(), "src/components/projects/hc-project-menu.tsx"), "utf8");
    assert.match(menu, /downloadProject/);
    assert.match(menu, /hcProject\.menu\.downloadProject/);
  });

  it("2. projects page contains Import .hc", () => {
    const hub = readFileSync(join(process.cwd(), "src/components/projects/homecheff-project-hub.tsx"), "utf8");
    const button = readFileSync(join(process.cwd(), "src/components/projects/hc-project-import-button.tsx"), "utf8");
    assert.match(hub, /HcProjectImportButton/);
    assert.match(button, /hcProject\.file\.importButton/);
  });

  it("3. export creates valid .hc manifest", () => {
    const project = sampleProject();
    const serialized = serializeHcProjectExportForTests(project);
    const parsed = parseHomeCheffProjectFile(serialized);
    assert.equal(parsed.version, HOMECHEFF_PACKAGE_VERSION);
    assert.equal(parsed.title, "HomeCheff Community Video");
    assert.equal(parsed.metadata.hcProjectFileVersion, HOMECHEFF_PACKAGE_VERSION);
    assert.ok(parsed.servicePayload.editor);
    assert.ok(parsed.workflowState);
    assert.ok(Array.isArray(parsed.assetReferences));
  });

  it("4. import validates .hc file", () => {
    const project = sampleProject();
    const content = serializeHcProjectExportForTests(project);
    const validation = validateHcProjectFileContent(content);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.preview.title, project.title);
    assert.equal(validation.preview.projectType, "editor");
  });

  it("5. import creates new HC Project", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    const content = serializeHcProjectExportForTests(sampleProject());
    const result = importHcProjectFileAsNewProject({ content, userId: "recipient_b" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.notEqual(result.project.id, parseHomeCheffProjectFile(content).id);
    assert.equal(result.project.ownerId, "recipient_b");
    assert.ok(loadHomeCheffProject(result.project.id));
  });

  it("6. import handles missing assets gracefully", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    const project = sampleProject();
    project.assetReferences = [
      ...project.assetReferences,
      {
        id: "missing-asset",
        url: "",
        kind: "image",
        sourceService: "editor",
        createdAt: new Date().toISOString(),
        accessScope: "project",
      },
    ];
    const content = serializeHcProjectExportForTests(project);
    const validation = validateHcProjectFileContent(content);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.preview.hasMissingAssets, true);

    const imported = importHcProjectFileAsNewProject({ content, userId: "user_c" });
    assert.equal(imported.ok, true);
    if (!imported.ok) return;
    assert.equal(imported.project.metadata.importHadMissingAssets, true);
  });

  it("7. invalid file shows readable error", () => {
    const html = validateHcProjectFileContent("<html><script>alert(1)</script></html>");
    assert.equal(html.ok, false);
    if (html.ok) return;
    assert.equal(html.errorKey, "hcProject.file.invalid");

    const broken = validateHcProjectFileContent("{not-json");
    assert.equal(broken.ok, false);
    if (broken.ok) return;
    assert.equal(broken.errorKey, "hcProject.file.invalid");
  });

  it("8. export file name uses project title", () => {
    const project = sampleProject("HomeCheff Community Video");
    const manifest = buildHcProjectExportManifest(project);
    assert.equal(hcProjectFilename(manifest.title), "HomeCheff-Community-Video.hc");
    assert.equal(manifest.metadata.hcProjectFileVersion, HOMECHEFF_PACKAGE_VERSION);
  });

  it("9. imported project appears in Projects", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    const content = serializeHcProjectExportForTests(sampleProject("Shared Story"));
    const result = importHcProjectFileAsNewProject({ content, userId: "user_d" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const listed = listHomeCheffProjectsFiltered("hc");
    assert.equal(listed.some((entry) => entry.id === result.project.id), true);
  });

  it("10. imported project can be opened", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    const content = serializeHcProjectExportForTests(sampleProject("Open Me"));
    const result = importHcProjectFileAsNewProject({ content, userId: "user_e" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const href = buildHcHandoffUrl(result.project.id, "editor");
    assert.match(href, /\/editor\/start\?hcProject=/);
    assert.match(href, /handoff=1/);
  });

  it("import adds suffix when title already exists", () => {
    installMemoryLocalStorage();
    __resetHomeCheffProjectsForTests();
    persistHomeCheffProject(sampleProject("Duplicate Title"));
    const content = serializeHcProjectExportForTests(sampleProject("Duplicate Title"));
    const result = importHcProjectFileAsNewProject({ content, userId: "user_f" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.project.title, "Duplicate Title (2)");
  });
});
