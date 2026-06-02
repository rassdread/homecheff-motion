import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectVideoVersionCatalog,
  normalizeLanguageExportRows,
  pickCurrentLanguageExportPerLanguage,
  resolveLanguageVersionLifecycle,
} from "@/lib/project-video-versions";

describe("project-video-versions", () => {
  const projectId = "proj-versions";

  const baseExport = {
    sourceFinalVideoUrl: "https://cdn.example/original.mp4",
    textLayerJson: null,
    translationProvider: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:05:00.000Z",
  };

  it("assigns Dutch v1 then v2 version numbers", () => {
    const rows = normalizeLanguageExportRows([
      {
        id: "nl-v1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v1.mp4",
        version: 1,
        isDefault: false,
        ...baseExport,
      },
      {
        id: "nl-v2",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v2.mp4",
        version: 2,
        isDefault: true,
        ...baseExport,
        completedAt: "2026-01-02T00:05:00.000Z",
      },
    ]);

    assert.equal(rows[0]?.version, 1);
    assert.equal(rows[1]?.version, 2);
  });

  it("marks latest successful language version as current", () => {
    const rows = normalizeLanguageExportRows([
      {
        id: "nl-v1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v1.mp4",
        version: 1,
        isDefault: false,
        ...baseExport,
      },
      {
        id: "nl-v2",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v2.mp4",
        version: 2,
        isDefault: true,
        ...baseExport,
      },
    ]);

    const current = pickCurrentLanguageExportPerLanguage(rows)[0];
    assert.equal(current?.id, "nl-v2");
    assert.equal(
      resolveLanguageVersionLifecycle(rows[1]!, current),
      "current"
    );
  });

  it("archives previous language version", () => {
    const rows = normalizeLanguageExportRows([
      {
        id: "nl-v1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v1.mp4",
        version: 1,
        isDefault: false,
        ...baseExport,
      },
      {
        id: "nl-v2",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v2.mp4",
        version: 2,
        isDefault: true,
        ...baseExport,
      },
    ]);
    const current = pickCurrentLanguageExportPerLanguage(rows)[0];
    assert.equal(resolveLanguageVersionLifecycle(rows[0]!, current), "archived");
  });

  it("does not mark failed version as current", () => {
    const rows = normalizeLanguageExportRows([
      {
        id: "nl-failed",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "failed",
        outputVideoUrl: null,
        version: 2,
        isDefault: false,
        ...baseExport,
        completedAt: null,
      },
      {
        id: "nl-v1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl-v1.mp4",
        version: 1,
        isDefault: true,
        ...baseExport,
      },
    ]);
    const current = pickCurrentLanguageExportPerLanguage(rows)[0];
    assert.equal(current?.id, "nl-v1");
    assert.equal(resolveLanguageVersionLifecycle(rows[0]!, current), "failed");
  });

  it("places archived versions in history section", () => {
    const catalog = buildProjectVideoVersionCatalog({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: normalizeLanguageExportRows([
        {
          id: "nl-v1",
          languageCode: "nl",
          languageLabel: "Nederlands",
          status: "completed",
          outputVideoUrl: "https://cdn.example/nl-v1.mp4",
          version: 1,
          isDefault: false,
          ...baseExport,
        },
        {
          id: "nl-v2",
          languageCode: "nl",
          languageLabel: "Nederlands",
          status: "completed",
          outputVideoUrl: "https://cdn.example/nl-v2.mp4",
          version: 2,
          isDefault: true,
          ...baseExport,
        },
      ]),
    });

    assert.equal(catalog.primary.some((item) => item.languageExportId === "nl-v2"), true);
    assert.equal(catalog.history.some((item) => item.languageExportId === "nl-v1"), true);
    assert.equal(catalog.history.some((item) => item.languageExportId === "nl-v2"), false);
  });
});
