import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompletedGalleryWhere,
  projectMatchesCompletedGalleryFilter,
} from "@/server/animation-projects/gallery-completed-where";

describe("gallery completed where", () => {
  it("includes export with final URL", () => {
    assert.equal(
      projectMatchesCompletedGalleryFilter({
        exports: [{ outputVideoUrl: "https://cdn.example/final.mp4" }],
        instantPreviousFinalVideoUrl: null,
      }),
      true
    );
  });

  it("includes project mid full rerender when previous final is archived", () => {
    assert.equal(
      projectMatchesCompletedGalleryFilter({
        exports: [{ outputVideoUrl: null }],
        instantPreviousFinalVideoUrl: "https://cdn.example/previous.mp4",
      }),
      true
    );
  });

  it("excludes project with no final and no archived previous", () => {
    assert.equal(
      projectMatchesCompletedGalleryFilter({
        exports: [{ outputVideoUrl: null }],
        instantPreviousFinalVideoUrl: null,
      }),
      false
    );
  });

  it("includes completed render version rows in gallery filter", () => {
    assert.equal(
      projectMatchesCompletedGalleryFilter({
        exports: [{ outputVideoUrl: null }],
        instantPreviousFinalVideoUrl: null,
        renderVersions: [
          { status: "completed", finalVideoUrl: "https://blob.example/v1.mp4" },
        ],
      }),
      true
    );
  });

  it("buildCompletedGalleryWhere adds OR for export, archived previous, or render versions", () => {
    const where = buildCompletedGalleryWhere({ ownerId: "user-1" });
    assert.equal(where.ownerId, "user-1");
    assert.ok(Array.isArray(where.OR));
    assert.equal(where.OR?.length, 3);
  });
});
