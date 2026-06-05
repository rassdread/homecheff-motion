import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import {
  formatVersionIdentityResultLabel,
  formatVersionIdentityWillCreateLabel,
  resolveTargetLanguageCode,
  suggestVersionNameForLanguage,
} from "@/lib/version-identity";
import { validateVersionNameInput } from "@/lib/smart-version-naming";

describe("version-identity", () => {
  it("resolves target language with fallback", () => {
    assert.equal(resolveTargetLanguageCode("", "nl"), "nl");
    assert.equal(resolveTargetLanguageCode("en", "nl"), "en");
    assert.equal(resolveTargetLanguageCode("xx", "de"), "nl");
  });

  it("language switch updates bundle-aware suggestion", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: "NL V3",
          finalVideoUrl: "https://cdn.example/v3.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      languageExports: [
        {
          id: "le1",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en.mp4",
          version: 1,
          isDefault: true,
          versionNote: "EN V1",
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    });

    assert.equal(
      suggestVersionNameForLanguage({ languageCode: "nl", catalog }),
      "NL V4"
    );
    assert.equal(
      suggestVersionNameForLanguage({ languageCode: "en", catalog }),
      "EN V2"
    );
    assert.equal(
      suggestVersionNameForLanguage({ languageCode: "de", catalog }),
      "DE V1"
    );
  });

  it("formats custom and language-prefixed result labels", () => {
    assert.equal(formatVersionIdentityResultLabel("en", "Director Cut"), "EN Director Cut");
    assert.equal(formatVersionIdentityResultLabel("nl", "NL V4"), "NL V4");
  });

  it("detects duplicate custom names", () => {
    const validation = validateVersionNameInput("Director Cut", ["Director Cut"]);
    assert.equal(validation.duplicate, true);
    assert.equal(validation.suggestion, "Director Cut V2");
  });

  it("builds will-create header from identity state", () => {
    assert.equal(
      formatVersionIdentityWillCreateLabel("en", "Director Cut", "nl"),
      "Dit concept wordt: EN Director Cut"
    );
  });
});
