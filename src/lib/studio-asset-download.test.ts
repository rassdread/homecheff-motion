import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assetDownloadFilename,
  hasDownloadableImage,
  resolveAssetDownloadUrl,
} from "@/lib/studio-asset-download";

describe("studio-asset-download", () => {
  it("builds safe download filename", () => {
    const name = assetDownloadFilename("Globe Man Chef!", "https://example.com/main.png");
    assert.ok(name.endsWith(".png"));
    assert.ok(!name.includes("!"));
  });

  it("detects downloadable images", () => {
    assert.equal(hasDownloadableImage({ previewUrl: "https://example.com/a.jpg" }), true);
    assert.equal(hasDownloadableImage({ previewUrl: null }), false);
  });

  it("prefers downloadUrl over previewUrl", () => {
    assert.equal(
      resolveAssetDownloadUrl({
        previewUrl: "https://example.com/preview.jpg",
        downloadUrl: "https://example.com/full.jpg",
      }),
      "https://example.com/full.jpg"
    );
  });
});
