import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import {
  collectVersionNamesFromCatalog,
  formatLanguageVersionName,
  resolveVersionNameForPersist,
  suggestAlternateVersionName,
  suggestDefaultVersionName,
  validateVersionNameInput,
} from "@/lib/smart-version-naming";

describe("smart-version-naming", () => {
  it("suggests next language version from bundle catalog", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: "https://cdn.example/final.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: false,
          versionNote: "NL V1",
          finalVideoUrl: "https://cdn.example/v1.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: "NL V3",
          finalVideoUrl: "https://cdn.example/v3.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      languageExports: [
        {
          id: "le1",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en1.mp4",
          version: 1,
          isDefault: true,
          versionNote: "EN V1",
          createdAt: "2026-06-03T00:00:00.000Z",
        },
      ],
    });

    assert.equal(
      suggestDefaultVersionName({ languageCode: "nl", catalog }),
      "NL V4"
    );
    assert.equal(
      suggestDefaultVersionName({ languageCode: "en", catalog }),
      "EN V2"
    );
    assert.equal(
      suggestDefaultVersionName({ languageCode: "de", catalog }),
      "DE V1"
    );
  });

  it("collects existing names including generated language labels", () => {
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
          versionNote: "Director Cut",
          finalVideoUrl: "https://cdn.example/v1.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const names = collectVersionNamesFromCatalog(catalog);
    assert.ok(names.includes("Director Cut"));
  });

  it("warns on duplicate and suggests alternate names", () => {
    const existing = ["Director Cut", "NL V2"];
    const validation = validateVersionNameInput("Director Cut", existing);
    assert.equal(validation.duplicate, true);
    assert.equal(validation.suggestion, "Director Cut V2");

    assert.equal(
      suggestAlternateVersionName("Director Cut", existing),
      "Director Cut V2"
    );
    assert.equal(
      resolveVersionNameForPersist("Director Cut", existing),
      "Director Cut V2"
    );
  });

  it("formats language version labels", () => {
    assert.equal(formatLanguageVersionName("nl", 4), "NL V4");
    assert.equal(formatLanguageVersionName("en", 1), "EN V1");
  });
});
