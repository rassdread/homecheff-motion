import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearWizardBlobMemoryCache,
  getWizardBlobMemoryCache,
  setWizardBlobMemoryCache,
  wizardBlobMemoryCacheSize,
} from "@/lib/instant-wizard-blob-memory-cache";

describe("instant wizard blob memory cache", () => {
  it("stores and retrieves blob pairs by image id", () => {
    clearWizardBlobMemoryCache();
    const optimized = new Blob(["optimized"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });
    setWizardBlobMemoryCache("img-1", optimized, thumbnail);
    const loaded = getWizardBlobMemoryCache("img-1");
    assert.ok(loaded);
    assert.equal(loaded!.optimized, optimized);
    assert.equal(loaded!.thumbnail, thumbnail);
    assert.equal(wizardBlobMemoryCacheSize(), 1);
    clearWizardBlobMemoryCache();
  });
});
