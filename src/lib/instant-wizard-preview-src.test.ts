import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearWizardBlobMemoryCache,
} from "@/lib/instant-wizard-blob-memory-cache";
import { EMPTY_WIZARD_IMAGE_BLOB } from "@/lib/instant-wizard-image-model";
import {
  allWizardImagesHaveValidSource,
  hasValidWizardImageSourceFromLocal,
  isValidBlobUrl,
  purgeWizardImagePreview,
  registerWizardImageBlobs,
  resolvePreviewSrc,
  resetWizardPreviewRegistryForTests,
  simulateSafariIndexedDbWriteFailure,
  toWizardPreviewInput,
} from "@/lib/instant-wizard-preview-src";
import { resetInstantCacheDiagnosticsForTests } from "@/lib/instant-cache-diagnostics";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { isIndexedDbAvailable, safeIndexedDbSet } from "@/lib/instant-premium-wizard-storage";

describe("instant wizard preview src", () => {
  it("rejects stale blob URLs without memory backing", () => {
    resetWizardPreviewRegistryForTests();
    clearWizardBlobMemoryCache();
    const stale = "blob:https://studio.homecheff.eu/stale-preview";
    assert.equal(isValidBlobUrl(stale), false);
    assert.equal(
      resolvePreviewSrc({
        id: "img-1",
        remoteWorkingUrl: "https://cdn.example.com/a.jpg",
      }),
      "https://cdn.example.com/a.jpg"
    );
  });

  it("rejects invalid fallback literals like images", () => {
    resetWizardPreviewRegistryForTests();
    assert.equal(
      resolvePreviewSrc({
        id: "img-2",
        previewUnavailable: true,
        remoteWorkingUrl: "https://cdn.example.com/b.jpg",
      }),
      null
    );
  });

  it("prefers registered in-memory blob URL over remote", () => {
    resetWizardPreviewRegistryForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    const urls = registerWizardImageBlobs("img-3", optimized, thumbnail);
    assert.ok(urls);
    assert.equal(isValidBlobUrl(urls!.workingPreviewUrl, "img-3"), true);
    assert.equal(
      resolvePreviewSrc({
        id: "img-3",
        remoteWorkingUrl: "https://cdn.example.com/c.jpg",
      }),
      urls!.workingPreviewUrl
    );
  });

  it("falls back to remote HTTPS after preview purge", () => {
    resetWizardPreviewRegistryForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    const urls = registerWizardImageBlobs("img-4", optimized, thumbnail);
    purgeWizardImagePreview("img-4");
    assert.equal(isValidBlobUrl(urls!.workingPreviewUrl, "img-4"), false);
    assert.equal(
      resolvePreviewSrc({
        id: "img-4",
        remoteWorkingUrl: "https://cdn.example.com/d.jpg",
      }),
      "https://cdn.example.com/d.jpg"
    );
  });

  it("Safari IndexedDB write failure keeps in-memory preview", async () => {
    resetWizardPreviewRegistryForTests();
    resetInstantCacheDiagnosticsForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    registerWizardImageBlobs("img-5", optimized, thumbnail);
    const ok = await safeIndexedDbSet("img-5", optimized, thumbnail);
    if (isIndexedDbAvailable()) {
      assert.equal(typeof ok, "boolean");
    }
    assert.equal(simulateSafariIndexedDbWriteFailure("img-5"), true);
    const resolved = resolvePreviewSrc({
      id: "img-5",
      remoteWorkingUrl: "https://cdn.example.com/e.jpg",
    });
    assert.ok(resolved?.startsWith("blob:"));
    assert.equal(isValidBlobUrl(resolved, "img-5"), true);
  });

  it("marks restored stale blob state as unavailable for generate", () => {
    resetWizardPreviewRegistryForTests();
    const staleBlob = "blob:https://studio.homecheff.eu/dead";
    const image = {
      id: "img-6",
      originalFileName: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 0,
      optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
      thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
      bakedText: { enabled: false, status: "none" as const, blocks: [], exactText: "", positionY: 0.12, manualMode: false },
      previewUnavailable: true,
    };
    assert.equal(isValidBlobUrl(staleBlob), false);
    assert.equal(hasValidWizardImageSourceFromLocal(image), false);
    assert.equal(allWizardImagesHaveValidSource([image]), false);
  });
});

describe("instant wizard upload reorder preview flow", () => {
  it("supports upload → reorder → preview without stale blob URLs", () => {
    resetWizardPreviewRegistryForTests();
    const makeImage = (id: string) => {
      const optimized = new Blob([id], { type: "image/jpeg" });
      const thumbnail = new Blob([`${id}-t`], { type: "image/jpeg" });
      const urls = registerWizardImageBlobs(id, optimized, thumbnail);
      assert.ok(urls);
      return {
        id,
        originalFileName: `${id}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: optimized.size,
        optimizedBlob: optimized,
        thumbnailBlob: thumbnail,
        bakedText: { enabled: false, status: "none" as const, blocks: [], exactText: "", positionY: 0.12, manualMode: false },
        remoteWorkingUrl: `https://cdn.example.com/${id}.jpg`,
      };
    };

    const a = makeImage("a");
    const b = makeImage("b");
    const c = makeImage("c");

    for (const img of [c, a, b]) {
      const src = resolvePreviewSrc(toWizardPreviewInput(img));
      assert.ok(src);
      assert.equal(isValidBlobUrl(src, img.id), true);
      assert.equal(hasValidWizardImageSourceFromLocal(img), true);
    }

    purgeWizardImagePreview("b");
    assert.equal(
      resolvePreviewSrc(toWizardPreviewInput(b)),
      b.remoteWorkingUrl
    );
    assert.equal(hasValidWizardImageSourceFromLocal(b), true);
  });
});
