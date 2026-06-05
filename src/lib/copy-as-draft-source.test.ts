import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseSelectionKeyIds } from "@/lib/bundle-slot-identity";
import {
  buildMotionVersionCatalogForProject,
  mergeMotionVersionCatalogs,
} from "@/lib/motion-version-catalog";
import {
  COPY_SOURCE_NOT_FOUND,
  isCopyAsDraftSourceReady,
  isRenderVersionCopyReady,
  resolveCopyAsDraftSource,
} from "@/lib/resolve-copy-as-draft-source";
import type { AnimationProjectWithMedia } from "@/server/animation-projects/queries";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_B = "cmpyb5kmm0001k1049zozow8z";
const RENDER_B = "rv-journey-b";

function failedParentWithCompletedRender(): AnimationProjectWithMedia {
  return {
    id: PROJECT_B,
    ownerId: "user-1",
    title: "Failed parent",
    status: "failed",
    projectType: "instant_premium",
    instantMode: "story",
    instantTransitionSeconds: 5,
    instantSceneTexts: [{ template: "scene", textBeats: [{ text: "Hi", startSec: 0, endSec: 2 }] }],
    instantUserIntent: "Test",
    instantSelectedChips: null,
    instantLockedTextLayers: null,
    languageTextLayersJson: null,
    instantLockedTextMode: false,
    instantTextRenderMode: "story_overlay",
    instantHybridOverlayStyle: "default",
    instantOutputDurationSeconds: 10,
    instantStoryboardDurationSeconds: 10,
    stylePreset: null,
    aspectRatio: "16:9",
    presetId: "default",
    userPrompt: null,
    intent: null,
    globalPromptContext: null,
    bundleName: "Journey",
    bundleKey: "journey",
    images: [
      {
        id: "img-1",
        order: 0,
        fileName: "a.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storageKey: "k1",
        previewUrl: "https://cdn/a.jpg",
        hasBakedText: false,
        bakedTextProtectionStatus: "none",
        bakedTextExactCopy: false,
        bakedTextMaskRegion: null,
        bakedTextBlocksJson: null,
        viduInputUrl: null,
        instantTextPatches: null,
        posterMotionLayersJson: null,
        studioSceneId: null,
        studioSceneImageId: null,
        projectId: PROJECT_B,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "img-2",
        order: 1,
        fileName: "b.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storageKey: "k2",
        previewUrl: "https://cdn/b.jpg",
        hasBakedText: false,
        bakedTextProtectionStatus: "none",
        bakedTextExactCopy: false,
        bakedTextMaskRegion: null,
        bakedTextBlocksJson: null,
        viduInputUrl: null,
        instantTextPatches: null,
        posterMotionLayersJson: null,
        studioSceneId: null,
        studioSceneImageId: null,
        projectId: PROJECT_B,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    transitions: [],
    exports: [{ id: "exp-1", status: "failed", outputVideoUrl: null, createdAt: new Date() }],
    languageExports: [],
    renderVersions: [
      {
        id: RENDER_B,
        projectId: PROJECT_B,
        renderVersionNumber: 1,
        kind: "initial",
        status: "completed",
        sourceImageSetId: "0:img-1|1:img-2",
        createdFromRenderId: null,
        versionNote: null,
        isDefault: true,
        promptSnapshot: { instantUserIntent: "From render" },
        storyboardSnapshot: {
          instantSceneTexts: [{ template: "scene", textBeats: [{ text: "Render copy", startSec: 0, endSec: 2 }] }],
          sceneCount: 1,
        },
        settingsSnapshot: { instantMode: "story", instantTransitionSeconds: 5 },
        segmentSnapshot: null,
        finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
        cleanVideoUrl: null,
        exportId: null,
        errorMessage: null,
        createdAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as unknown as AnimationProjectWithMedia;
}

describe("copy-as-draft source resolution", () => {
  it("parses render and language ids from selectionKey", () => {
    assert.deepEqual(parseSelectionKeyIds("render:rv-abc"), { renderVersionId: "rv-abc" });
    assert.deepEqual(parseSelectionKeyIds("lang:le-xyz"), { languageExportId: "le-xyz" });
  });

  it("allows copy from failed parent when render version is completed", () => {
    const project = failedParentWithCompletedRender();
    const resolved = resolveCopyAsDraftSource(project, {
      renderVersionId: RENDER_B,
      sourceLanguage: "nl",
    });
    assert.ok(resolved);
    assert.equal(resolved!.sourceVersion, 1);
    assert.ok(isCopyAsDraftSourceReady({ project, resolved: resolved! }));
    assert.ok(resolved!.overrides.instantSceneTexts);
  });

  it("falls back to completed render when export is missing (ignores catalog ordinal)", () => {
    const project = failedParentWithCompletedRender();
    const resolved = resolveCopyAsDraftSource(project, {
      sourceLanguage: "nl",
      sourceVersion: 2,
    });
    assert.ok(resolved);
    assert.equal(resolved!.renderVersion?.id, RENDER_B);
    assert.equal(resolved!.sourceVersion, 1);
  });

  it("returns null for invalid renderVersionId", () => {
    const project = failedParentWithCompletedRender();
    const resolved = resolveCopyAsDraftSource(project, {
      renderVersionId: "missing-render",
    });
    assert.equal(resolved, null);
  });

  it("copies from languageExportId when completed", () => {
    const project = {
      ...failedParentWithCompletedRender(),
      exports: [{ id: "exp-1", status: "completed", outputVideoUrl: "https://cdn/main.mp4", createdAt: new Date() }],
      languageExports: [
        {
          id: "le-en-1",
          projectId: PROJECT_B,
          languageCode: "en",
          languageLabel: "EN",
          outputVideoUrl: "https://cdn/en-v1.mp4",
          status: "completed",
          sourceFinalVideoUrl: "https://cdn/main.mp4",
          sourceCleanVideoUrl: null,
          overlayRenderMode: "typography",
          sceneTextsJson: [{ template: "scene", textBeats: [{ text: "Hello", startSec: 0, endSec: 2 }] }],
          textLayerJson: [],
          translationProvider: null,
          translationAuditJson: null,
          isDefault: false,
          version: 1,
          versionNote: null,
          errorMessage: null,
          createdAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as unknown as AnimationProjectWithMedia;

    const resolved = resolveCopyAsDraftSource(project, { languageExportId: "le-en-1" });
    assert.ok(resolved);
    assert.equal(resolved!.sourceLanguage, "en");
    assert.equal(resolved!.sourceVersion, 1);
    assert.ok(isCopyAsDraftSourceReady({ project, resolved: resolved! }));
  });

  it("merged bundle slot uses stable render id not catalog ordinal", () => {
    const catalogB = buildMotionVersionCatalogForProject({
      projectId: PROJECT_B,
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "failed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: RENDER_B,
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-04T10:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const merged = mergeMotionVersionCatalogs([
      {
        catalog: buildMotionVersionCatalogForProject({
          projectId: "other",
          exportOutputUrl: "https://cdn/a.mp4",
          exportStatus: "completed",
          projectStatus: "completed",
          projectCleanUrl: null,
          renderVersions: [],
          languageExports: [],
        }),
        memberCreatedAt: "2026-06-03T10:00:00.000Z",
      },
      { catalog: catalogB, memberCreatedAt: "2026-06-04T10:00:00.000Z" },
    ]);
    const slot = merged.slotsByLanguage.nl?.find((s) => s.renderVersionId === RENDER_B);
    assert.ok(slot);
    assert.equal(slot!.catalogVersionNumber, 2);
    assert.equal(slot!.sourceRenderVersionNumber, 1);

    const project = failedParentWithCompletedRender();
    const resolved = resolveCopyAsDraftSource(project, {
      renderVersionId: slot!.renderVersionId,
      selectionKey: `render:${RENDER_B}`,
      sourceVersion: slot!.catalogVersionNumber,
    });
    assert.ok(resolved);
    assert.equal(resolved!.sourceVersion, 1);
  });

  it("exposes COPY_SOURCE_NOT_FOUND in API route", () => {
    const route = readFileSync(
      join(__dirname, "../app/api/instant-premium/projects/[id]/copy-as-draft/route.ts"),
      "utf8"
    );
    assert.match(route, /COPY_SOURCE_NOT_FOUND/);
    assert.match(route, /renderVersionId/);
    assert.match(route, /languageExportId/);
    assert.match(route, /selectionKey/);
  });

  it("copy service uses resolver and does not require export when render is ready", () => {
    const src = readFileSync(
      join(__dirname, "../server/instant-premium/copy-project-as-draft.ts"),
      "utf8"
    );
    assert.match(src, /resolveCopyAsDraftSource/);
    assert.match(src, /COPY_SOURCE_NOT_FOUND/);
    assert.doesNotMatch(src, /isProjectPlayablyComplete/);
    assert.match(src, /renderVersionId: resolved\.renderVersion\?\.id/);
  });

  it("isRenderVersionCopyReady accepts completed render with final url", () => {
    const rv = failedParentWithCompletedRender().renderVersions[0]!;
    assert.equal(isRenderVersionCopyReady(rv), true);
  });

  it("client sends stable slot identifiers", () => {
    const client = readFileSync(join(__dirname, "copy-project-as-draft-client.ts"), "utf8");
    assert.match(client, /renderVersionId/);
    assert.match(client, /languageExportId/);
    assert.match(client, /selectionKey/);
  });
});
