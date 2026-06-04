import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateStudioPropCreateInput,
  validateStudioPropUpdateInput,
} from "@/lib/studio-prop-validation";

describe("studio prop validation", () => {
  it("requires name and reference on create", () => {
    const noImage = validateStudioPropCreateInput({
      name: "HomeCheff Mug",
      category: "brand_asset",
      referenceImageUrl: "",
      referenceStorageKey: "",
    });
    assert.equal(noImage.ok, false);
    if (!noImage.ok) {
      assert.equal(noImage.code, "REFERENCE_IMAGE_REQUIRED");
    }
  });

  it("rejects empty update", () => {
    const empty = validateStudioPropUpdateInput({});
    assert.equal(empty.ok, false);
  });

  it("accepts valid create payload", () => {
    const ok = validateStudioPropCreateInput({
      name: "HomeCheff Mug",
      category: "brand_asset",
      description: "Official HomeCheff mug with globe logo.",
      referenceImageUrl: "https://example.blob.vercel-storage.com/mug.jpg",
      referenceStorageKey: "studio/x/mug.jpg",
    });
    assert.equal(ok.ok, true);
  });
});
