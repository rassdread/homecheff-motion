import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload, loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { patchDocumentGenerationPackage } from "@/lib/editor-generation-package";
import {
  extendAndPersistHcHandoff,
  resolveEditorToMotionHandoffUrl,
  resolveEditorToPublishHandoffUrl,
} from "@/lib/homecheff-project-handoff-routes";
import {
  buildMotionHandoffSearchParamsFromHcProject,
  hydrateEditorDocumentFromHcProject,
  rehydrateMotionProjectFromHcProject,
  rehydrateStudioProjectFromHcProject,
} from "@/lib/homecheff-project-open";
import { convertLegacyMotionToHCProject } from "@/lib/homecheff-project-legacy-convert";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import {
  __resetHomeCheffProjectsForTests,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { resolveHcProjectStateIndicators } from "@/lib/homecheff-project-state";

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
  Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return storage;
}

function sampleDoc() {
  let doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/base.jpg" });
  doc = patchDocumentGenerationPackage({
    ...doc,
    instructionVariants: [
      {
        id: "v1",
        name: "Result",
        status: "completed",
        resultUrl: "https://cdn.example.com/result.jpg",
        variantType: "combined",
        sourceImageUrl: doc.backgroundUrl,
        sourceImageId: "background",
        instruction: {} as never,
        prompt: "p",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  return doc;
}

test("editor HC hydration restores document with hcProjectId", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();
  const doc = sampleDoc();
  const { projectId } = extendAndPersistHcHandoff({ document: doc, target: "publish" });
  const project = loadHomeCheffProject(projectId);
  assert.ok(project);
  const hydrated = hydrateEditorDocumentFromHcProject(project!);
  assert.ok(hydrated);
  assert.equal(hydrated?.instructionStudioState?.hcProjectId, project!.id);
  assert.ok(hydrated?.instructionStudioState?.generationPackage);
});

test("motion HC hydration preserves hcProject query params", () => {
  const legacy = convertLegacyMotionToHCProject({
    id: "motion_1",
    title: "Clip",
    videoUrl: "https://cdn.example.com/out.mp4",
    sourceImageUrls: ["https://cdn.example.com/a.jpg"],
    durationSec: 5,
  });
  const params = buildMotionHandoffSearchParamsFromHcProject(legacy);
  assert.equal(params.get("hcProject"), legacy.id);
  assert.equal(params.get("handoffMode"), "animation");
  assert.ok(params.get("sourceImage"));
  const bootstrap = rehydrateMotionProjectFromHcProject(legacy);
  assert.ok(bootstrap);
  assert.equal(bootstrap?.durationSec, 5);
});

test("studio HC hydration routes to storyboard or new scene", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();
  const doc = sampleDoc();
  const { projectId } = extendAndPersistHcHandoff({ document: doc, target: "studio" });
  const editorProject = loadHomeCheffProject(projectId)!;

  const withBoard = rehydrateStudioProjectFromHcProject({
    ...editorProject,
    servicePayload: {
      ...editorProject.servicePayload,
      studio: { storyboardId: "sb_1", sceneTitle: "Scene" },
    },
  });
  assert.match(withBoard?.redirectPath ?? "", /storyboardId=sb_1/);

  const withScene = rehydrateStudioProjectFromHcProject(editorProject);
  assert.match(withScene?.redirectPath ?? "", /storyboards\/new/);
});

test("HC-first handoffs extend same project id", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();
  const doc = sampleDoc();
  const motion = extendAndPersistHcHandoff({ document: doc, target: "motion", durationSec: 5 });
  const reloaded = loadEditorCanvasDocument(doc.sessionId)!;
  const publish = extendAndPersistHcHandoff({
    document: reloaded,
    target: "publish",
  });
  assert.equal(motion.projectId, publish.projectId);
  const project = loadHomeCheffProject(motion.projectId);
  assert.ok(project?.servicePayload.motion);
  assert.ok(project?.servicePayload.publish);
});

test("HC handoff URLs use motion start with query preservation path", () => {
  const id = "hcproj_test";
  const url = buildHcHandoffUrl(id, "motion");
  assert.match(url, /\/motion\/start\?hcProject=/);
});

test("resolveEditorToPublishHandoffUrl uses HC when document provided", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();
  const doc = sampleDoc();
  const url = resolveEditorToPublishHandoffUrl({
    document: doc,
    editorSessionId: doc.sessionId,
  });
  assert.match(url, /hcProject=/);
});

test("HC state indicators reflect service payload", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();
  const doc = sampleDoc();
  const { projectId } = extendAndPersistHcHandoff({ document: doc, target: "motion" });
  const project = loadHomeCheffProject(projectId);
  assert.ok(project);
  const states = resolveHcProjectStateIndicators(project!);
  assert.ok(states.find((s) => s.service === "editor")?.available);
  assert.ok(states.find((s) => s.service === "motion")?.available);
});
