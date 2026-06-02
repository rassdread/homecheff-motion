import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectDownloadOptions,
  pickDownloadableOptions,
  resolveDirectDownloadOption,
  shouldOpenDownloadPicker,
  splitDownloadOptionsBySection,
} from "@/lib/project-download-options";

describe("project-download-options", () => {
  const projectId = "proj-1";

  const baseExport = {
    sourceFinalVideoUrl: "https://cdn.example/original.mp4",
    textLayerJson: null,
    translationProvider: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:05:00.000Z",
  };

  it("downloads directly when only original is available", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [],
    });
    assert.equal(shouldOpenDownloadPicker(options), false);
    assert.equal(resolveDirectDownloadOption(options)?.kind, "original");
  });

  it("opens picker when multiple completed versions exist", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: "https://cdn.example/clean.mp4",
      languageExports: [
        {
          id: "exp-nl",
          languageCode: "nl",
          languageLabel: "Nederlands",
          status: "completed",
          outputVideoUrl: "https://cdn.example/nl.mp4",
          version: 1,
          isDefault: true,
          ...baseExport,
        },
      ],
    });
    assert.equal(pickDownloadableOptions(options).length, 3);
    assert.equal(shouldOpenDownloadPicker(options), true);
    assert.equal(resolveDirectDownloadOption(options), null);
  });

  it("creates Dutch v1 and v2 with archived history", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [
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
      ],
    });
    const { primary, history } = splitDownloadOptionsBySection(options);
    assert.equal(primary.filter((row) => row.kind === "language").length, 1);
    assert.equal(primary.find((row) => row.languageExportId === "nl-v2")?.lifecycle, "current");
    assert.equal(history.find((row) => row.languageExportId === "nl-v1")?.lifecycle, "archived");
  });

  it("includes completed language versions in picker", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [
        {
          id: "exp-en",
          languageCode: "en",
          languageLabel: "English",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en.mp4",
          version: 1,
          isDefault: true,
          ...baseExport,
          completedAt: null,
        },
      ],
    });
    const langs = pickDownloadableOptions(options).filter((row) => row.kind === "language");
    assert.equal(langs.length, 1);
    assert.equal(langs[0]?.languageCode, "en");
  });

  it("excludes failed language versions from downloadable options", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [
        {
          id: "exp-failed",
          languageCode: "de",
          languageLabel: "Deutsch",
          status: "failed",
          outputVideoUrl: null,
          version: 1,
          isDefault: false,
          ...baseExport,
          completedAt: null,
        },
      ],
    });
    assert.equal(pickDownloadableOptions(options).length, 1);
  });

  it("shows failed versions as disabled when includeNonDownloadable is true", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [
        {
          id: "exp-failed",
          languageCode: "de",
          languageLabel: "Deutsch",
          status: "failed",
          outputVideoUrl: null,
          version: 1,
          isDefault: false,
          ...baseExport,
          completedAt: null,
        },
      ],
      includeNonDownloadable: true,
    });
    const failed = options.find((row) => row.languageCode === "de");
    assert.equal(failed?.downloadable, false);
    assert.equal(failed?.status, "failed");
  });

  it("hides archived versions in primary section by default", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: null,
      languageExports: [
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
      ],
    });
    const { primary, history } = splitDownloadOptionsBySection(options);
    assert.equal(history.length, 1);
    assert.equal(primary.some((row) => row.languageExportId === "nl-v1"), false);
  });

  it("displays file sizes when sizeByUrl is provided", () => {
    const options = buildProjectDownloadOptions({
      projectId,
      originalVideoUrl: "https://cdn.example/original.mp4",
      cleanVideoUrl: "https://cdn.example/clean.mp4",
      languageExports: [],
      sizeByUrl: {
        "https://cdn.example/original.mp4": 12_000_000,
        "https://cdn.example/clean.mp4": 10_000_000,
      },
    });
    assert.equal(options.find((row) => row.kind === "original")?.sizeBytes, 12_000_000);
    assert.equal(options.find((row) => row.kind === "clean")?.sizeBytes, 10_000_000);
  });
});
