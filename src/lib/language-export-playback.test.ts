import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLanguagePlaybackOptions,
  buildPlaybackDownloadLanguageParam,
  resolveActivePlaybackLanguageFromQuery,
  resolveActivePlaybackState,
  resolveLanguagePlaybackUrl,
} from "@/lib/language-export-playback";

describe("language-export-playback", () => {
  const originalUrl = "https://cdn.example/original.mp4";
  const nlUrl = "https://cdn.example/nl.mp4";

  it("always includes original option even with zero exports", () => {
    const options = buildLanguagePlaybackOptions(originalUrl, [], "nl");
    assert.equal(options.length, 1);
    assert.equal(options[0]?.languageCode, "original");
    assert.equal(options[0]?.id, "original");
    assert.equal(options[0]?.label, "Origineel");
    assert.equal(options[0]?.outputVideoUrl, originalUrl);
  });

  it("resolves original → nl → original playback URLs", () => {
    const exports = [
      {
        id: "exp-nl",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed" as const,
        outputVideoUrl: nlUrl,
        errorMessage: null,
        createdAt: "2026-01-01",
        completedAt: "2026-01-02",
        version: 1,
        isDefault: true,
      },
    ];

    const original = resolveActivePlaybackState({
      langFromUrl: null,
      originalFinalUrl: originalUrl,
      languageExports: exports,
    });
    assert.equal(original.selectedLanguageCode, "original");
    assert.equal(original.activePlaybackUrl, originalUrl);
    assert.equal(original.activeExportId, null);
    assert.equal(original.activeLanguageVersion, null);

    const dutch = resolveActivePlaybackState({
      langFromUrl: "nl",
      originalFinalUrl: originalUrl,
      languageExports: exports,
    });
    assert.equal(dutch.selectedLanguageCode, "nl");
    assert.equal(dutch.activePlaybackUrl, nlUrl);
    assert.equal(dutch.activeExportId, "exp-nl");
    assert.equal(dutch.activeLanguageVersion, "nl");

    const backToOriginal = resolveActivePlaybackState({
      langFromUrl: null,
      originalFinalUrl: originalUrl,
      languageExports: exports,
    });
    assert.equal(backToOriginal.activePlaybackUrl, originalUrl);
    assert.equal(backToOriginal.activeExportId, null);
  });

  it("removing lang query restores original selection", () => {
    assert.equal(resolveActivePlaybackLanguageFromQuery(null, ["nl"]), "original");
    assert.equal(resolveActivePlaybackLanguageFromQuery("", ["nl"]), "original");
  });

  it("?lang=nl selects NL on refresh", () => {
    assert.equal(resolveActivePlaybackLanguageFromQuery("nl", ["nl"]), "nl");
  });

  it("falls back to original when export missing or failed", () => {
    const missing = resolveLanguagePlaybackUrl({
      selectedLanguageCode: "en",
      originalFinalUrl: originalUrl,
      languageExports: [],
    });
    assert.equal(missing.url, originalUrl);
    assert.equal(missing.fallbackToOriginal, true);

    const failed = resolveLanguagePlaybackUrl({
      selectedLanguageCode: "nl",
      originalFinalUrl: originalUrl,
      languageExports: [
        {
          id: "exp-fail",
          languageCode: "nl",
          languageLabel: "NL",
          status: "failed",
          outputVideoUrl: null,
          errorMessage: "x",
          createdAt: "",
          completedAt: null,
          version: 1,
          isDefault: false,
        },
      ],
    });
    assert.equal(failed.url, originalUrl);
    assert.equal(failed.fallbackToOriginal, true);
  });

  it("updates download/open params for original vs language", () => {
    assert.deepEqual(buildPlaybackDownloadLanguageParam("original"), {
      filenameSuffix: "",
    });
    assert.deepEqual(buildPlaybackDownloadLanguageParam("nl"), {
      languageCode: "nl",
      filenameSuffix: "-nl",
    });
  });

  it("original playback URL is never replaced by export URL in state", () => {
    const state = resolveActivePlaybackState({
      langFromUrl: "nl",
      originalFinalUrl: originalUrl,
      languageExports: [
        {
          id: "exp-nl",
          languageCode: "nl",
          languageLabel: "NL",
          status: "completed",
          outputVideoUrl: nlUrl,
          errorMessage: null,
          createdAt: "",
          completedAt: null,
          version: 1,
          isDefault: true,
        },
      ],
    });
    assert.equal(state.originalPlaybackUrl, originalUrl);
    assert.equal(state.activePlaybackUrl, nlUrl);
    assert.notEqual(state.originalPlaybackUrl, state.activePlaybackUrl);
  });
});
