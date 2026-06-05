import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionVersionCatalogForProject,
  mergeMotionVersionCatalogs,
} from "@/lib/motion-version-catalog";

/**
 * Unit-level mirror of server bundle merge used by buildDetailBundleCatalog.
 * Integration with Prisma is covered indirectly via gallery bundle tests.
 */
describe("buildDetailBundleCatalog — merged member grouping", () => {
  it("groups two projects into one catalog with two NL slots", () => {
    const catalogA = buildMotionVersionCatalogForProject({
      projectId: "proj-a",
      exportOutputUrl: "https://cdn.example/a.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv-a",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/a-final.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const catalogB = buildMotionVersionCatalogForProject({
      projectId: "proj-b",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "failed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv-b",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: "V2 note",
          finalVideoUrl: "https://cdn.example/b-final.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const merged = mergeMotionVersionCatalogs([
      { catalog: catalogA, memberCreatedAt: "2026-06-01T00:00:00.000Z" },
      { catalog: catalogB, memberCreatedAt: "2026-06-02T00:00:00.000Z" },
    ]);
    assert.equal(merged.slotsByLanguage.nl?.length, 2);
    assert.equal(merged.slotsByLanguage.nl![0]!.sourceProjectId, "proj-a");
    assert.equal(merged.slotsByLanguage.nl![1]!.sourceProjectId, "proj-b");
    assert.equal(merged.slotsByLanguage.nl![1]!.catalogVersionNumber, 2);
  });
});
