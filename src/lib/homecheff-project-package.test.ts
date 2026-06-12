import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { patchDocumentGenerationPackage } from "@/lib/editor-generation-package";
import { buildGenerationPackageMetadataJson } from "@/lib/editor-generation-package-download";
import { createTransformationSession } from "@/lib/editor-transformation-session";
import { buildStoreZip } from "@/lib/store-zip";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { exportEditorDocumentAsHcProject } from "@/lib/homecheff-project-export";
import {
  extendHcProjectWithMotionState,
  extendHcProjectWithPublishState,
  extendHcProjectWithStudioState,
  importHcProjectAsCopy,
  validateImportPermissions,
} from "@/lib/homecheff-project-handoff";
import { importHomeCheffProjectFile, validateProjectAssetAccess } from "@/lib/homecheff-project-import";
import {
  buildHcHandoffUrl,
  defaultProjectPermissions,
  hcProjectFilename,
  migrateHomeCheffPackage,
  parseHomeCheffProjectFile,
  projectAssetIds,
  resolveHcProjectOpenRoute,
  resolveHcProjectOpenTargets,
  serializeHomeCheffProjectPackage,
  stripUnrelatedOwnerData,
  validateHomeCheffProjectPackage,
} from "@/lib/homecheff-project-package-core";
import { hydratePublishFromHcProject } from "@/lib/homecheff-project-open";
import {
  __resetHomeCheffProjectsForTests,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import {
  editorLandingHasDeepLink,
  motionLandingHasDeepLink,
  publishLandingHasDeepLink,
} from "@/lib/studio-product-landing-routes";
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

function sampleDocumentWithPackage() {
  let doc = createEditorDocumentFromUpload({
    name: "Outfit Project",
    backgroundUrl: "https://cdn.example.com/base.jpg",
  });
  const session = createTransformationSession({
    type: "HUMAN_TO_MASCOT",
    sourceImageUrl: doc.backgroundUrl,
    stepCount: 2,
  });
  session.steps[0]!.resultUrl = "https://cdn.example.com/step1.jpg";
  session.steps[1]!.resultUrl = "https://cdn.example.com/result.jpg";

  doc = patchDocumentGenerationPackage({
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      combineIntent: "outfit_swap",
      fusionPlan: { intent: "outfit_swap" } as never,
      transformationSession: session,
    },
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

test("create .hc manifest from editor document", () => {
  const doc = sampleDocumentWithPackage();
  const project = buildHomeCheffProjectFromEditorDocument({ document: doc, ownerId: "user_a" });

  assert.equal(project.version, HOMECHEFF_PACKAGE_VERSION);
  assert.equal(project.projectType, "editor");
  assert.match(project.id, /^hcproj_/);
  assert.equal(project.ownerId, "user_a");
  assert.ok(project.servicePayload.editor?.generationPackages?.length);
  assert.ok(project.assetReferences.some((a) => a.url.includes("result.jpg")));
  assert.equal(validateHomeCheffProjectPackage(project).ok, true);
});

test("export editor project file serializes manifest without unrelated assets", () => {
  const doc = sampleDocumentWithPackage();
  const project = buildHomeCheffProjectFromEditorDocument({ document: doc, ownerId: "user_a" });
  const unrelated = buildHomeCheffProjectFromEditorDocument({
    document: createEditorDocumentFromUpload({ name: "Other", backgroundUrl: "https://cdn.example.com/other.jpg" }),
    ownerId: "user_a",
  });

  const serialized = serializeHomeCheffProjectPackage(project);
  const parsed = parseHomeCheffProjectFile(serialized);
  const assetIds = projectAssetIds(parsed);

  assert.ok(assetIds.has("gen_v1") || assetIds.has(`seq_${doc.instructionStudioState?.transformationSession?.steps[0]?.id}`));
  assert.equal(assetIds.has("gen_unrelated"), false);
  assert.equal(parsed.assetReferences.some((a) => a.url.includes("other.jpg")), false);
  assert.notEqual(parsed.id, unrelated.id);
  assert.equal(hcProjectFilename(project.title), "Outfit-Project.hc");
});

test("import editor project file persists copy for editable share", async () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();

  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({
    document: doc,
    ownerId: "owner_1",
    shareMode: "editable_copy",
  });
  project = stripUnrelatedOwnerData(project);
  const content = serializeHomeCheffProjectPackage(project);

  const result = await importHomeCheffProjectFile({ content, userId: "recipient_1" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.copied, true);
  assert.notEqual(result.project.id, project.id);
  assert.equal(result.project.ownerId, "recipient_1");
  assert.ok(loadHomeCheffProject(result.project.id));
});

test(".hc open routes target correct service workspaces", () => {
  const projectId = "hcproj_test";
  assert.match(resolveHcProjectOpenRoute(projectId, "editor"), /\/editor\/start\?hcProject=/);
  assert.match(resolveHcProjectOpenRoute(projectId, "motion"), /\/motion\/start\?hcProject=/);
  assert.match(resolveHcProjectOpenRoute(projectId, "publish"), /\/publish\/start\?hcProject=/);
  assert.match(resolveHcProjectOpenRoute(projectId, "studio"), /\/studio\/start\?hcProject=/);
  assert.match(buildHcHandoffUrl(projectId, "motion"), /handoff=1/);
});

test("landing routes treat hcProject as deep links", () => {
  const params = new URLSearchParams("hcProject=hcproj_abc");
  assert.equal(editorLandingHasDeepLink(params), true);
  assert.equal(motionLandingHasDeepLink(params), true);
  assert.equal(publishLandingHasDeepLink(params), true);
});

test("permissions restrict asset access to project references", () => {
  const doc = sampleDocumentWithPackage();
  const project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  const firstAssetId = project.assetReferences[0]?.id ?? "";
  assert.ok(firstAssetId);
  assert.equal(validateProjectAssetAccess(project, firstAssetId), true);
  assert.equal(validateProjectAssetAccess(project, "gen_not_in_project"), false);

  const viewOnly = {
    ...project,
    permissions: defaultProjectPermissions("view_only"),
  };
  const permission = validateImportPermissions(viewOnly, { userId: "other", isOwner: false });
  assert.equal(permission.allowed, true);
  assert.equal(permission.shouldCopy, false);
});

test("editable copy does not mutate owner original on import", () => {
  const doc = sampleDocumentWithPackage();
  const ownerProject = buildHomeCheffProjectFromEditorDocument({
    document: doc,
    ownerId: "owner",
    shareMode: "editable_copy",
  });
  const originalId = ownerProject.id;
  const copy = importHcProjectAsCopy(ownerProject, "recipient");
  assert.notEqual(copy.id, originalId);
  assert.equal(copy.ownerId, "recipient");
  assert.equal(ownerProject.id, originalId);
  assert.equal(ownerProject.ownerId, "owner");
});

test("Editor to Motion extends same HC project motionState", () => {
  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  const originalId = project.id;
  project = extendHcProjectWithMotionState(project, { durationSec: 5 });

  assert.equal(project.id, originalId);
  assert.ok(project.servicePayload.editor);
  assert.ok(project.servicePayload.motion);
  assert.match(project.prompts.motion_primary ?? "", /Animate this transformation sequence/);
  assert.equal(project.servicePayload.motion?.durationSec, 5);
  assert.equal(project.handoffHistory.at(-1)?.handoffType, "editor_to_motion");
});

test("Editor to Publish extends publishState with prompt", () => {
  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  project = extendHcProjectWithPublishState(project);

  assert.ok(project.servicePayload.publish);
  assert.match(project.prompts.publish_primary ?? "", /social-ready post/);
  assert.equal(project.handoffHistory.at(-1)?.handoffType, "editor_to_publish");
});

test("Editor to Studio extends studioState", () => {
  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  project = extendHcProjectWithStudioState(project, { sceneTitle: "Scene A" });

  assert.ok(project.servicePayload.studio);
  assert.equal(project.servicePayload.studio?.sceneTitle, "Scene A");
  assert.equal(project.handoffHistory.at(-1)?.handoffType, "editor_to_studio_scene");
});

test("Motion to Publish uses video prompt when motion output exists", () => {
  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  project = extendHcProjectWithMotionState(project);
  project = {
    ...project,
    servicePayload: {
      ...project.servicePayload,
      motion: {
        ...project.servicePayload.motion,
        generatedVideoUrl: "https://cdn.example.com/video.mp4",
      },
    },
  };
  project = extendHcProjectWithPublishState(project);
  assert.match(project.prompts.publish_primary ?? "", /social sharing/);
  assert.equal(project.servicePayload.publish?.videoUrl, "https://cdn.example.com/video.mp4");
});

test("resolve open targets from multi-state project", () => {
  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  project = extendHcProjectWithMotionState(project);
  project = extendHcProjectWithPublishState(project);

  const targets = resolveHcProjectOpenTargets(project);
  assert.deepEqual(targets, ["editor", "motion", "publish"]);
});

test("package survives refresh via local persistence", () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();

  const doc = sampleDocumentWithPackage();
  const built = buildHomeCheffProjectFromEditorDocument({ document: doc });
  persistHomeCheffProject(built);
  const reloaded = loadHomeCheffProject(built.id);
  assert.ok(reloaded);
  assert.equal(reloaded?.servicePayload.editor?.sessionId, doc.sessionId);
});

test("import restores workflow state and publish hydration", async () => {
  installMemoryLocalStorage();
  __resetHomeCheffProjectsForTests();

  const doc = sampleDocumentWithPackage();
  let project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  project = extendHcProjectWithPublishState(project);
  persistHomeCheffProject(project);

  const imported = await importHomeCheffProjectFile({
    content: serializeHomeCheffProjectPackage(project),
    userId: "user_a",
  });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;

  const publish = hydratePublishFromHcProject(imported.project);
  assert.ok(publish);
  assert.equal(publish?.source, "editor");
  assert.ok(publish?.imageUrls?.length || publish?.videoUrl);
});

test("zip export remains separate from .hc export", () => {
  const doc = sampleDocumentWithPackage();
  const pkg = doc.instructionStudioState?.generationPackage;
  assert.ok(pkg);

  const hc = serializeHomeCheffProjectPackage(buildHomeCheffProjectFromEditorDocument({ document: doc }));
  const zip = buildStoreZip([
    { path: "metadata.json", data: new TextEncoder().encode(buildGenerationPackageMetadataJson(pkg)) },
    { path: "result.jpg", data: new Uint8Array([1, 2, 3]) },
  ]);

  assert.match(hc, /"version":\s*1/);
  assert.ok(hc.includes("servicePayload"));
  assert.ok(!hc.includes("PK"));
  assert.ok(zip.length > 0);
  assert.equal(parseHomeCheffProjectFile(hc).projectType, "editor");
});

test("unsupported newer package version is rejected", () => {
  const doc = sampleDocumentWithPackage();
  const project = buildHomeCheffProjectFromEditorDocument({ document: doc });
  const future = { ...project, version: 99 as typeof HOMECHEFF_PACKAGE_VERSION };
  assert.throws(() => migrateHomeCheffPackage(future), /newer HomeCheff version/);
});

test("expired share permissions block import", () => {
  const doc = sampleDocumentWithPackage();
  const project = buildHomeCheffProjectFromEditorDocument({
    document: doc,
    shareMode: "view_only",
  });
  const expired = {
    ...project,
    permissions: {
      ...project.permissions,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
  };
  const permission = validateImportPermissions(expired, { userId: "other", isOwner: false });
  assert.equal(permission.allowed, false);
  assert.equal(permission.reason, "expired");
});
