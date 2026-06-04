import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionVersionCatalogForProject,
  findMotionVersionSlot,
  mergeMotionVersionCatalogs,
  resolveMotionSelectionFromUrl,
} from "@/lib/motion-version-catalog";

describe("motion-version-catalog", () => {
  it("maps NL render versions to v1/v2 and EN language exports to EN v1/v2", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: "https://cdn.example/final-v1.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/clean-v1.mp4",
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: false,
          versionNote: "Eerste versie",
          finalVideoUrl: "https://cdn.example/final-v1.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: "Nieuwe intro",
          finalVideoUrl: "https://cdn.example/final-v2.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      languageExports: [
        {
          id: "le1",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en-v1.mp4",
          version: 1,
          isDefault: false,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "le2",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en-v2.mp4",
          version: 2,
          isDefault: true,
          versionNote: "Updated copy",
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
    });

    assert.equal(catalog.languages.length, 2);
    assert.equal(catalog.slotsByLanguage.nl?.length, 2);
    assert.equal(catalog.slotsByLanguage.en?.length, 2);
    assert.equal(catalog.slotsByLanguage.nl?.[0]?.displayLabel, "v1 — Eerste versie");
    assert.equal(catalog.slotsByLanguage.nl?.[1]?.cleanVideoUrl, "https://cdn.example/clean-v2.mp4");
    assert.equal(catalog.slotsByLanguage.en?.[1]?.displayLabel, "v2 — Updated copy");
  });

  it("returns correct final and clean URLs for selected version", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/final-v2.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const slot = findMotionVersionSlot(catalog, "render:rv2");
    assert.equal(slot?.finalVideoUrl, "https://cdn.example/final-v2.mp4");
    assert.equal(slot?.cleanVideoUrl, "https://cdn.example/clean-v2.mp4");
  });

  it("merges same-name projects into sequential versions without losing project IDs", () => {
    const c1 = buildMotionVersionCatalogForProject({
      projectId: "p-a",
      exportOutputUrl: "https://cdn.example/a-final.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [],
      languageExports: [],
    });
    const c2 = buildMotionVersionCatalogForProject({
      projectId: "p-b",
      exportOutputUrl: "https://cdn.example/b-final.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [],
      languageExports: [],
    });
    const merged = mergeMotionVersionCatalogs([
      { catalog: c1, memberCreatedAt: "2026-01-01T00:00:00.000Z" },
      { catalog: c2, memberCreatedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    assert.equal(merged.slotsByLanguage.nl?.length, 2);
    assert.equal(merged.slotsByLanguage.nl?.[0]?.projectId, "p-a");
    assert.equal(merged.slotsByLanguage.nl?.[1]?.projectId, "p-b");
    assert.equal(merged.slotsByLanguage.nl?.[0]?.versionNumber, 1);
    assert.equal(merged.slotsByLanguage.nl?.[1]?.versionNumber, 2);
  });

  it("rejects invalid explicit ?ver= without falling back to another version", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/v1.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    assert.equal(resolveMotionSelectionFromUrl(catalog, "nl", "v9"), null);
    const ok = resolveMotionSelectionFromUrl(catalog, "nl", "v1");
    assert.equal(ok?.slot.finalVideoUrl, "https://cdn.example/v1.mp4");
  });
});
