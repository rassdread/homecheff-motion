import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS,
  libraryBrowseHrefForCategory,
  projectOpenHref,
  resolveLibraryCategory,
} from "@/lib/library-consistency";

describe("library-consistency", () => {
  it("maps generation types to library categories", () => {
    assert.equal(resolveLibraryCategory("character"), "characters");
    assert.equal(resolveLibraryCategory("mascot"), "mascots");
    assert.equal(resolveLibraryCategory("location"), "locations");
    assert.equal(resolveLibraryCategory("prop"), "props");
    assert.equal(resolveLibraryCategory("world"), "worlds");
    assert.equal(resolveLibraryCategory("logo"), "logos");
    assert.equal(resolveLibraryCategory("editor_variant"), "images");
    assert.equal(resolveLibraryCategory("motion_output"), "video");
    assert.equal(resolveLibraryCategory("publish_export"), "exports");
    assert.equal(resolveLibraryCategory("music"), "music");
    assert.equal(resolveLibraryCategory("sfx"), "sfx");
    assert.equal(resolveLibraryCategory("voice"), "voices");
  });

  it("resolves browse and project hrefs", () => {
    assert.equal(libraryBrowseHrefForCategory("characters"), "/studio/assets/creative/characters");
    assert.equal(libraryBrowseHrefForCategory("images"), "/studio/assets/library/generated");
    assert.equal(libraryBrowseHrefForCategory("video"), "/videos");
    assert.equal(projectOpenHref("proj_1", "editor"), "/editor?project=proj_1");
    assert.equal(projectOpenHref(null, "studio"), null);
  });

  it("audit lists all generation endpoints as wired", () => {
    const types = new Set(LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.map((e) => e.generationType));
    assert.ok(types.has("character"));
    assert.ok(types.has("editor_variant"));
    assert.ok(LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.some((e) => e.generationType === "motion_output"));
    assert.ok(LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.some((e) => e.generationType === "publish_export"));
    assert.ok(LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.filter((e) => e.wired).length >= 12);
    assert.ok(LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.every((e) => e.wired));
  });
});
