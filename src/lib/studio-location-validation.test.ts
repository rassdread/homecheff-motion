import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateStudioLocationCreateInput,
  validateStudioLocationUpdateInput,
} from "@/lib/studio-location-validation";

describe("studio location validation", () => {
  it("requires name and reference on create", () => {
    const missing = validateStudioLocationCreateInput({
      name: "",
      category: "garden",
      referenceImageUrl: "",
      referenceStorageKey: "",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.equal(missing.code, "NAME_REQUIRED");
    }

    const noImage = validateStudioLocationCreateInput({
      name: "Community Garden",
      category: "garden",
      referenceImageUrl: "",
      referenceStorageKey: "",
    });
    assert.equal(noImage.ok, false);
    if (!noImage.ok) {
      assert.equal(noImage.code, "REFERENCE_IMAGE_REQUIRED");
    }
  });

  it("accepts valid create payload", () => {
    const ok = validateStudioLocationCreateInput({
      name: "Rotterdam City Center",
      category: "city",
      description: "Modern Dutch city environment.",
      referenceImageUrl: "https://example.blob.vercel-storage.com/rotterdam.jpg",
      referenceStorageKey: "studio/x/ref.jpg",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.category, "city");
    }
  });

  it("rejects invalid category", () => {
    const bad = validateStudioLocationCreateInput({
      name: "X",
      category: "suburb",
      referenceImageUrl: "https://example.com/a.jpg",
      referenceStorageKey: "k",
    });
    assert.equal(bad.ok, false);
  });

  it("allows metadata-only update", () => {
    const ok = validateStudioLocationUpdateInput({
      description: "Updated garden description",
    });
    assert.equal(ok.ok, true);
  });
});
