import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRenderableImageUrl, isValidHttpUrl } from "@/lib/is-valid-http-url";

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

  it("allows blob previews for render", () => {
    assert.equal(isRenderableImageUrl("blob:http://localhost/abc"), true);
    assert.equal(isRenderableImageUrl("/images"), false);
  });
});
