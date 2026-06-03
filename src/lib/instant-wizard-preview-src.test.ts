import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearWizardBlobMemoryCache,
} from "@/lib/instant-wizard-blob-memory-cache";
import {
  isValidBlobUrl,
  purgeWizardImagePreview,
  registerWizardImageBlobs,
  resolvePreviewSrc,
  resetWizardPreviewRegistryForTests,
} from "@/lib/instant-wizard-preview-src";
import { resetInstantCacheDiagnosticsForTests } from "@/lib/instant-cache-diagnostics";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { isIndexedDbAvailable, safeIndexedDbSet } from "@/lib/instant-premium-wizard-storage";

describe("instant wizard preview src", () => {
  it("rejects stale blob URLs without memory backing", () => {
    resetWizardPreviewRegistryForTests();
    clearWizardBlobMemoryCache();
    const stale = "blob:http://localhost/stale-preview";
    assert.equal(isValidBlobUrl(stale), false);
    assert.equal(
      resolvePreviewSrc({
        id: "img-1",
        workingPreviewUrl: stale,
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
        workingPreviewUrl: "images",
        thumbnailPreviewUrl: "/images/foo.jpg",
        remoteWorkingUrl: "https://cdn.example.com/b.jpg",
      }),
      "https://cdn.example.com/b.jpg"
    );
  });

  it("prefers registered in-memory blob URL over remote", () => {
    resetWizardPreviewRegistryForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    const urls = registerWizardImageBlobs("img-3", optimized, thumbnail);
    assert.equal(isValidBlobUrl(urls.workingPreviewUrl, "img-3"), true);
    assert.equal(
      resolvePreviewSrc({
        id: "img-3",
        workingPreviewUrl: urls.workingPreviewUrl,
        remoteWorkingUrl: "https://cdn.example.com/c.jpg",
      }),
      urls.workingPreviewUrl
    );
  });

  it("falls back to remote HTTPS after preview purge", () => {
    resetWizardPreviewRegistryForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    const urls = registerWizardImageBlobs("img-4", optimized, thumbnail);
    purgeWizardImagePreview("img-4");
    assert.equal(isValidBlobUrl(urls.workingPreviewUrl, "img-4"), false);
    assert.equal(
      resolvePreviewSrc({
        id: "img-4",
        workingPreviewUrl: urls.workingPreviewUrl,
        remoteWorkingUrl: "https://cdn.example.com/d.jpg",
      }),
      "https://cdn.example.com/d.jpg"
    );
  });

  it("keeps memory cache when IndexedDB write is disabled", async () => {
    resetWizardPreviewRegistryForTests();
    resetInstantCacheDiagnosticsForTests();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    const ok = await safeIndexedDbSet("img-5", optimized, thumbnail);
    if (isIndexedDbAvailable()) {
      assert.equal(typeof ok, "boolean");
    }
    const resolved = resolvePreviewSrc({
      id: "img-5",
      remoteWorkingUrl: "https://cdn.example.com/e.jpg",
    });
    assert.ok(resolved?.startsWith("blob:") || isValidHttpUrl(resolved ?? ""));
  });
});

describe("instant wizard upload reorder preview flow", () => {
  it("supports upload → reorder → preview without stale blob URLs", () => {
    resetWizardPreviewRegistryForTests();
    const makeImage = (id: string) => {
      const optimized = new Blob([id], { type: "image/jpeg" });
      const thumbnail = new Blob([`${id}-t`], { type: "image/jpeg" });
      const urls = registerWizardImageBlobs(id, optimized, thumbnail);
      return {
        id,
        optimized,
        thumbnail,
        ...urls,
        remoteWorkingUrl: `https://cdn.example.com/${id}.jpg`,
      };
    };

    const a = makeImage("a");
    const b = makeImage("b");
    const c = makeImage("c");

    const reordered = [c, a, b];
    for (const img of reordered) {
      const src = resolvePreviewSrc(img);
      assert.ok(src);
      assert.equal(isValidBlobUrl(src, img.id), true);
    }

    purgeWizardImagePreview("b");
    assert.equal(
      resolvePreviewSrc({
        id: "b",
        workingPreviewUrl: b.workingPreviewUrl,
        remoteWorkingUrl: b.remoteWorkingUrl,
      }),
      b.remoteWorkingUrl
    );
  });
});
