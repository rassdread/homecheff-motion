import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRenderableImageUrl, isValidHttpUrl, resolveRenderableImageSrc, resolveRemoteImageSrc } from "@/lib/is-valid-http-url";

describe("isValidHttpUrl", () => {
  it("accepts https URLs", () => {
    assert.equal(isValidHttpUrl("https://example.com/a.jpg"), true);
  });

  it("rejects relative /images paths", () => {
    assert.equal(isValidHttpUrl("/images"), false);
    assert.equal(isValidHttpUrl("/images/foo.jpg"), false);
  });

  it("rejects empty and undefined", () => {
    assert.equal(isValidHttpUrl(""), false);
    assert.equal(isValidHttpUrl(undefined), false);
  });

  it("rejects unregistered blob URLs for generic render checks", () => {
    assert.equal(isRenderableImageUrl("blob:http://localhost/abc"), false);
    assert.equal(isRenderableImageUrl("/images"), false);
    assert.equal(isRenderableImageUrl("images"), false);
  });

  it("resolveRenderableImageSrc picks first valid https candidate", () => {
    assert.equal(
      resolveRenderableImageSrc("", "/images", "images", "https://cdn.example.com/a.jpg"),
      "https://cdn.example.com/a.jpg"
    );
    assert.equal(resolveRenderableImageSrc(undefined, null), null);
  });

  it("resolveRemoteImageSrc rejects blob and relative paths", () => {
    assert.equal(resolveRemoteImageSrc("blob:http://localhost/x"), null);
    assert.equal(resolveRemoteImageSrc("/images/foo.jpg"), null);
    assert.equal(resolveRemoteImageSrc("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
  });
});
