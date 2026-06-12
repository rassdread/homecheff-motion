import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import {
  buildGenerationPackageMetadataJson,
  primaryResultUrlFromPackage,
} from "@/lib/editor-generation-package-download";
import { patchDocumentGenerationPackage } from "@/lib/editor-generation-package";
import {
  __resetGenerationPackageStoresForTests,
  loadGenerationPackage,
  loadGenerationPackageBySession,
  persistGenerationPackage,
} from "@/lib/editor-generation-package-persist";
import { reopenEditorDocumentFromLibrary, workflowDisplayName } from "@/lib/editor-generation-package-save";
import {
  editorHandoffHasPublishPayload,
  hydratePublishProjectFromEditorHandoff,
} from "@/lib/editor-publish-handoff-hydrate";
import { isFreePostGenerationAction, resolveEditorNextBestActions } from "@/lib/editor-next-best-actions";
import { buildPublishHandoffUrl } from "@/lib/editor-publish-handoff";
import { buildMotionAnimateUrl, buildStudioSceneHandoffUrl } from "@/lib/editor-studio-scene-handoff";
import { buildStoreZip, crc32 } from "@/lib/store-zip";
import { createTransformationSession } from "@/lib/editor-transformation-session";
import { publishLandingHasDeepLink } from "@/lib/studio-product-landing-routes";

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

test("publish landing treats editor handoff params as deep links", () => {
  const params = new URLSearchParams(
    "editorSession=sess_1&publishIntent=text_overlay&generationPackage=genpkg_1&handoffSource=editor_generation"
  );
  assert.equal(publishLandingHasDeepLink(params), true);
  assert.equal(editorHandoffHasPublishPayload(params), true);
});

test("buildPublishHandoffUrl includes package and result metadata", () => {
  const url = buildPublishHandoffUrl({
    editorSessionId: "sess_1",
    intent: "social_carousel",
    packageId: "genpkg_abc",
    resultUrl: "https://example.com/result.jpg",
  });
  assert.match(url, /editorSession=sess_1/);
  assert.match(url, /publishIntent=social_carousel/);
  assert.match(url, /generationPackage=genpkg_abc/);
  assert.match(url, /resultUrl=/);
});

test("generation package persists across session reload", () => {
  installMemoryLocalStorage();
  __resetGenerationPackageStoresForTests();

  let doc = createEditorDocumentFromUpload({ name: "Outfit", backgroundUrl: "https://example.com/base.jpg" });
  doc.instructionVariants = [
    {
      id: "v1",
      name: "Result",
      status: "completed",
      resultUrl: "https://example.com/result.jpg",
      variantType: "combined",
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {} as never,
      prompt: "p",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  doc = patchDocumentGenerationPackage(doc);
  saveEditorCanvasDocument(doc);

  const pkg = loadGenerationPackageBySession(doc.sessionId);
  assert.ok(pkg);
  assert.equal(pkg?.generatedImages.length, 1);
  assert.equal(primaryResultUrlFromPackage(pkg!), "https://example.com/result.jpg");
});

test("publish handoff hydrates image project prefilled", () => {
  installMemoryLocalStorage();
  __resetGenerationPackageStoresForTests();

  const doc = createEditorDocumentFromUpload({ name: "Future Self", backgroundUrl: "https://example.com/base.jpg" });
  const patched = patchDocumentGenerationPackage({
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      combineIntent: "how_will_i_look",
      fusionPlan: { intent: "how_will_i_look" } as never,
    },
    instructionVariants: [
      {
        id: "v1",
        name: "Age result",
        status: "completed",
        resultUrl: "https://example.com/future.jpg",
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
  const pkg = patched.instructionStudioState!.generationPackage!;
  persistGenerationPackage(pkg);
  saveEditorCanvasDocument(patched);

  const project = hydratePublishProjectFromEditorHandoff(
    new URLSearchParams({
      editorSession: doc.sessionId,
      publishIntent: "text_overlay",
      generationPackage: pkg.id,
      handoffSource: "editor_generation",
    })
  );

  assert.ok(project);
  assert.equal(project?.source, "editor");
  assert.equal(project?.publishIntent, "text_overlay");
  assert.equal(project?.imageUrl, "https://example.com/future.jpg");
  assert.equal(project?.mediaKind, "image");
  assert.notEqual(project?.videoUrl, "");
});

test("publish handoff hydrates carousel from transformation sequence", () => {
  installMemoryLocalStorage();
  __resetGenerationPackageStoresForTests();

  let doc = createEditorDocumentFromUpload({ name: "Fusion", backgroundUrl: "https://example.com/base.jpg" });
  const session = createTransformationSession({
    type: "HUMAN_TO_MASCOT",
    sourceImageUrl: doc.backgroundUrl,
    stepCount: 3,
  });
  session.steps[0]!.resultUrl = "https://example.com/s1.jpg";
  session.steps[1]!.resultUrl = "https://example.com/s2.jpg";
  session.steps[2]!.resultUrl = "https://example.com/s3.jpg";

  doc = patchDocumentGenerationPackage({
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      transformationSession: session,
    },
  });
  const pkg = doc.instructionStudioState!.generationPackage!;
  persistGenerationPackage(pkg);

  const project = hydratePublishProjectFromEditorHandoff(
    new URLSearchParams({
      editorSession: doc.sessionId,
      publishIntent: "social_carousel",
      generationPackage: pkg.id,
    })
  );

  assert.ok(project);
  assert.equal(project?.mediaKind, "carousel");
  assert.equal(project?.imageUrls?.length, 3);
});

test("library reopen restores generation package and workflow", () => {
  installMemoryLocalStorage();
  __resetGenerationPackageStoresForTests();

  let doc = createEditorDocumentFromUpload({ name: "Animal", backgroundUrl: "https://example.com/base.jpg" });
  doc = patchDocumentGenerationPackage({
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      combineIntent: "human_into_animal",
    },
    instructionVariants: [
      {
        id: "v1",
        name: "Animal",
        status: "completed",
        resultUrl: "https://example.com/animal.jpg",
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
  saveEditorCanvasDocument(doc);
  persistGenerationPackage(doc.instructionStudioState!.generationPackage!);

  const reopened = reopenEditorDocumentFromLibrary(doc.sessionId);
  assert.ok(reopened?.instructionStudioState?.generationPackage);
  assert.equal(reopened?.instructionStudioState?.combineIntent, "human_into_animal");
});

test("store zip contains metadata.json and ordered sequence paths", () => {
  const metadata = buildGenerationPackageMetadataJson({
    id: "genpkg_test",
    editorSessionId: "sess",
    workflow: "human_into_animal",
    sourceReferences: [],
    metadataSnapshot: [],
    generatedImages: [],
    sequenceFrames: [
      {
        id: "f1",
        kind: "sequence_frame",
        url: "https://example.com/s1.jpg",
        stepIndex: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    thumbnails: [],
    motionOutputs: [],
    exportOutputs: [],
    orderedFrameUrls: ["https://example.com/s1.jpg"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const zip = buildStoreZip([
    { path: "metadata/metadata.json", data: metadata },
    { path: "sequence/step-01.png", data: new TextEncoder().encode("fake-png") },
  ]);

  assert.ok(zip.length > 100);
  assert.ok(crc32(metadata) > 0);
  const asText = new TextDecoder().decode(zip);
  assert.match(asText, /metadata\/metadata\.json/);
  assert.match(asText, /sequence\/step-01\.png/);
});

test("next best actions mark download and save as free post-generation", () => {
  assert.ok(isFreePostGenerationAction("download"));
  assert.ok(isFreePostGenerationAction("save_library"));
  assert.ok(isFreePostGenerationAction("download_package"));

  const sequenceActions = resolveEditorNextBestActions({
    resultType: "sequence",
    userTier: "free",
    credits: 0,
    editorSessionId: "sess_1",
  });
  assert.ok(sequenceActions.some((a) => a.id === "download_package"));
  assert.ok(sequenceActions.some((a) => a.id === "save_library"));
});

test("studio scene and motion animate URLs remain separated", () => {
  const studio = buildStudioSceneHandoffUrl({ editorSessionId: "sess_1", packageId: "genpkg_1" });
  const motion = buildMotionAnimateUrl({ editorSessionId: "sess_1", durationSec: 5, packageId: "genpkg_1" });
  assert.match(studio, /handoffMode=scene_only/);
  assert.match(motion, /handoffMode=animation/);
});

test("workflow display names cover major editor workflows", () => {
  assert.equal(workflowDisplayName("how_will_i_look"), "Future Self");
  assert.equal(workflowDisplayName("outfit_from_reference"), "Outfit Transfer");
  assert.equal(workflowDisplayName("human_into_animal"), "Animal Fusion");
});

test("loadGenerationPackage resolves by package id after persist", () => {
  installMemoryLocalStorage();
  __resetGenerationPackageStoresForTests();
  const pkg = persistGenerationPackage({
    id: "genpkg_reload",
    editorSessionId: "sess_reload",
    workflow: "character_upgrade",
    sourceReferences: [],
    metadataSnapshot: [],
    generatedImages: [],
    sequenceFrames: [],
    thumbnails: [],
    motionOutputs: [],
    exportOutputs: [],
    orderedFrameUrls: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.equal(loadGenerationPackage("genpkg_reload")?.id, pkg.id);
});
