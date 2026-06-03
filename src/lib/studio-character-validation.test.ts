import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateStudioCharacterCreateInput,
  validateStudioCharacterUpdateInput,
} from "@/lib/studio-character-validation";

describe("studio character validation", () => {
  it("requires name and reference on create", () => {
    const missing = validateStudioCharacterCreateInput({
      name: "",
      role: "mascot",
      referenceImageUrl: "",
      referenceStorageKey: "",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.equal(missing.code, "NAME_REQUIRED");
    }

    const noImage = validateStudioCharacterCreateInput({
      name: "Chef",
      role: "mascot",
      referenceImageUrl: "",
      referenceStorageKey: "",
    });
    assert.equal(noImage.ok, false);
    if (!noImage.ok) {
      assert.equal(noImage.code, "REFERENCE_IMAGE_REQUIRED");
    }
  });

  it("accepts valid create payload", () => {
    const ok = validateStudioCharacterCreateInput({
      name: "Chef",
      role: "mascot",
      description: "HomeCheff chef mascot.",
      personality: "Friendly",
      referenceImageUrl: "https://example.blob.vercel-storage.com/chef.jpg",
      referenceStorageKey: "studio/x/ref.jpg",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.name, "Chef");
      assert.equal(ok.value.role, "mascot");
    }
  });

  it("rejects invalid role", () => {
    const bad = validateStudioCharacterCreateInput({
      name: "X",
      role: "robot",
      referenceImageUrl: "https://example.com/a.jpg",
      referenceStorageKey: "k",
    });
    assert.equal(bad.ok, false);
  });

  it("requires paired reference fields on update", () => {
    const partial = validateStudioCharacterUpdateInput({
      referenceImageUrl: "https://example.com/a.jpg",
    });
    assert.equal(partial.ok, false);
    if (!partial.ok) {
      assert.equal(partial.code, "REFERENCE_PAIR_REQUIRED");
    }
  });

  it("allows metadata-only update", () => {
    const ok = validateStudioCharacterUpdateInput({
      personality: "Calm and focused",
    });
    assert.equal(ok.ok, true);
  });
});
