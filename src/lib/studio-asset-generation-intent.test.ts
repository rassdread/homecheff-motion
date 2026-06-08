import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAssetGenerationIntent } from "@/lib/studio-asset-generation-intent";

describe("studio-asset-generation-intent", () => {
  it("returns TRANSFORM_EXISTING_ASSET when source image is present", () => {
    assert.equal(
      resolveAssetGenerationIntent({ sourceImageUrl: "https://example.com/globe.png" }),
      "TRANSFORM_EXISTING_ASSET"
    );
  });

  it("returns TRANSFORM_EXISTING_ASSET when parent or derived asset exists", () => {
    assert.equal(
      resolveAssetGenerationIntent({ parentAssetId: "asset-1" }),
      "TRANSFORM_EXISTING_ASSET"
    );
    assert.equal(
      resolveAssetGenerationIntent({ derivedFromAssetId: "asset-2" }),
      "TRANSFORM_EXISTING_ASSET"
    );
    assert.equal(
      resolveAssetGenerationIntent({ derivationSourceAssetId: "asset-3" }),
      "TRANSFORM_EXISTING_ASSET"
    );
  });

  it("returns CREATE_NEW_ASSET when no source lineage exists", () => {
    assert.equal(resolveAssetGenerationIntent({}), "CREATE_NEW_ASSET");
  });
});
