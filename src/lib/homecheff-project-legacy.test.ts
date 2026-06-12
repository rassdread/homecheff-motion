import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { patchDocumentGenerationPackage } from "@/lib/editor-generation-package";
import { createPublishProject } from "@/lib/publish-overlay-session";
import {
  convertLegacyEditorToHCProject,
  convertLegacyMotionToHCProject,
  convertLegacyMotionToPublishShortcut,
  convertLegacyPublishToHCProject,
  convertLegacyStudioToHCProject,
  convertAndPersistLegacyMotion,
  legacyMotionToPublishShortcut,
  safeLegacyConversion,
} from "@/lib/homecheff-project-legacy-convert";
import { detectProjectFormat, isHcProject, shouldUseLegacyWorkflow } from "@/lib/homecheff-project-legacy-detect";
import {
  __resetLegacyProjectRegistryForTests,
  archiveLegacyProject,
  getLegacyProjectRegistryEntry,
  listLegacyProjects,
  registerLegacyProject,
  restoreLegacyProject,
} from "@/lib/homecheff-project-legacy-registry";
import { resolveLegacyProjectOpenPath, resolveHcProjectOpenOptions } from "@/lib/homecheff-project-legacy-open";
import {
  __resetHomeCheffProjectsForTests,
  loadHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { listUnifiedProjects } from "@/lib/homecheff-project-list";
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
  Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return storage;
}

function sampleEditorInput() {
  let doc = createEditorDocumentFromUpload({ name: "Legacy Editor", backgroundUrl: "https://cdn.example.com/base.jpg" });
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
  return { id: "editor_legacy_1", name: "Legacy Editor", document: doc };
}

test("open legacy project keeps legacy workflow", () => {
  const entry = registerLegacyProject({
    legacyId: "motion_abc",
    service: "motion",
    title: "Old Motion",
    openPath: "/animate/motion_abc",
  });
  assert.equal(detectProjectFormat(entry), "legacy");
  assert.equal(shouldUseLegacyWorkflow(entry), true);
  assert.equal(resolveLegacyProjectOpenPath(entry), "/animate/motion_abc");
});

test("convert legacy motion project populates motionState only", () => {
  const hc = convertLegacyMotionToHCProject({
    id: "motion_1",
    title: "Motion One",
    videoUrl: "https://cdn.example.com/out.mp4",
    sourceImageUrls: ["https://cdn.example.com/a.jpg"],
  });
  assert.equal(hc.projectFormat, "hc");
  assert.equal(hc.projectVersion, 1);
  assert.ok(hc.servicePayload.motion);
  assert.equal(hc.servicePayload.editor, undefined);
  assert.equal(hc.servicePayload.publish, undefined);
  assert.equal(hc.servicePayload.studio, undefined);
  assert.equal(hc.legacySource?.projectId, "motion_1");
  assert.ok(hc.assetReferences.some((a) => a.url.includes("out.mp4")));
});

test("convert legacy editor project restores editorState", () => {
  const input = sampleEditorInput();
  const hc = convertLegacyEditorToHCProject(input);
  assert.ok(hc.servicePayload.editor);
  assert.equal(hc.legacySource?.service, "editor");
  assert.equal(hc.metadata.legacyEditorProjectId, input.id);
});

test("convert legacy publish project preserves overlays and subtitles", () => {
  const publish = createPublishProject({
    name: "Social Post",
    videoUrl: "https://cdn.example.com/v.mp4",
    source: "motion",
  });
  publish.overlays = [
    {
      id: "o1",
      type: "title",
      text: "Hello",
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.2,
      startTime: 0,
      endTime: 5,
      zIndex: 1,
      style: {},
      safeAreaStatus: "ok",
      language: "en",
      locked: false,
    },
  ];
  const hc = convertLegacyPublishToHCProject(publish);
  assert.ok(hc.servicePayload.publish?.projectSnapshot);
  assert.equal(hc.servicePayload.publish?.settings?.overlays?.length, 1);
  assert.equal(hc.legacySource?.projectId, publish.id);
});

test("convert legacy studio project preserves storyboard references", () => {
  const hc = convertLegacyStudioToHCProject({
    id: "sb_1",
    title: "Story A",
    storyboardId: "sb_1",
    sceneIds: ["sc_1", "sc_2"],
    sceneImageUrl: "https://cdn.example.com/scene.jpg",
  });
  assert.ok(hc.servicePayload.studio);
  assert.equal(hc.metadata.legacyStoryboardId, "sb_1");
  assert.deepEqual(hc.metadata.legacySceneIds, ["sc_1", "sc_2"]);
});

test("legacy motion to publish shortcut creates publishState", () => {
  const hc = convertLegacyMotionToPublishShortcut({
    id: "motion_pub",
    title: "Anim",
    videoUrl: "https://cdn.example.com/final.mp4",
  });
  assert.ok(hc.servicePayload.motion);
  assert.ok(hc.servicePayload.publish);
  assert.equal(hc.metadata.legacyMotionPublishShortcut, true);
  assert.match(hc.prompts.publish_primary ?? "", /social sharing/i);
});

test("archive and restore legacy project", () => {
  installMemoryLocalStorage();
  __resetLegacyProjectRegistryForTests();
  registerLegacyProject({ legacyId: "old_1", service: "motion", title: "Test" });
  archiveLegacyProject("motion", "old_1");
  assert.equal(listLegacyProjects("archived").length, 1);
  assert.equal(listLegacyProjects("active").length, 0);
  restoreLegacyProject("motion", "old_1");
  assert.equal(listLegacyProjects("active").length, 1);
});

test("failed conversion fallback does not block legacy access", () => {
  const result = safeLegacyConversion(() => {
    throw new Error("simulated_failure");
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fallback, "open_legacy");
  assert.match(result.reason, /simulated_failure/);
});

test("legacy project remains usable after conversion", () => {
  installMemoryLocalStorage();
  __resetLegacyProjectRegistryForTests();
  __resetHomeCheffProjectsForTests();

  const motion = { id: "m_keep", title: "Keep Me", videoUrl: "https://cdn.example.com/v.mp4" };
  registerLegacyProject({ legacyId: motion.id, service: "motion", title: motion.title, openPath: `/animate/${motion.id}` });

  const result = convertAndPersistLegacyMotion(motion);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const registry = getLegacyProjectRegistryEntry("motion", motion.id);
  assert.ok(registry);
  assert.equal(registry?.linkedHcProjectId, result.hcProjectId);
  assert.equal(resolveLegacyProjectOpenPath(registry!), `/animate/${motion.id}`);

  const hc = loadHomeCheffProject(result.hcProjectId);
  assert.ok(hc);
  assert.equal(isHcProject(hc!), true);
});

test("hc project retains migration source metadata", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();

  const result = legacyMotionToPublishShortcut({
    id: "m_src",
    title: "Source Motion",
    videoUrl: "https://cdn.example.com/x.mp4",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const hc = loadHomeCheffProject(result.hcProjectId);
  assert.ok(hc?.legacySource);
  assert.equal(hc?.legacySource?.service, "motion");
  assert.equal(hc?.legacySource?.projectId, "m_src");
  assert.ok((hc?.conversionHistory?.length ?? 0) >= 1);
});

test("hc project open options reflect available states", () => {
  let hc = convertLegacyMotionToHCProject({ id: "m1", title: "M", videoUrl: "https://cdn.example.com/v.mp4" });
  hc = convertLegacyMotionToPublishShortcut({ id: "m1", title: "M", videoUrl: "https://cdn.example.com/v.mp4" });
  const options = resolveHcProjectOpenOptions(hc);
  assert.ok(options.some((o) => o.service === "motion"));
  assert.ok(options.some((o) => o.service === "publish"));
});

test("unified list separates hc and legacy filters", () => {
  installMemoryLocalStorage();
  __resetLegacyProjectRegistryForTests();
  __resetHomeCheffProjectsForTests();

  registerLegacyProject({ legacyId: "leg_1", service: "motion", title: "Legacy" });
  convertAndPersistLegacyMotion({ id: "leg_2", title: "Converted", videoUrl: "https://cdn.example.com/a.mp4" });

  const legacyOnly = listUnifiedProjects("legacy");
  assert.ok(legacyOnly.every((i) => i.kind === "legacy"));

  const hcOnly = listUnifiedProjects("hc");
  assert.ok(hcOnly.every((i) => i.kind === "hc"));
});

test("new hc projects default to hc format version", () => {
  const hc = convertLegacyEditorToHCProject(sampleEditorInput());
  assert.equal(hc.projectFormat, "hc");
  assert.equal(hc.version, HOMECHEFF_PACKAGE_VERSION);
});
