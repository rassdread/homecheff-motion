import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanFinalBlobPathname } from "@/lib/final-video-storage";
import {
  prepareStorySceneTexts,
  projectUsesStoryOverlay,
  sceneTextsSummary,
  storySourceLanguageCode,
} from "@/lib/story-language-export";
import { resolveProjectVideoDownload } from "@/server/animation-projects/resolve-video-download";

describe("story language export helpers", () => {
  it("projectUsesStoryOverlay is true for story mode with scene copy", () => {
    assert.equal(
      projectUsesStoryOverlay({
        instantMode: "story",
        instantSceneTexts: [{ template: "hero", heroText: "HELLO" }],
      }),
      true
    );
  });

  it("projectUsesStoryOverlay is false for transition mode", () => {
    assert.equal(
      projectUsesStoryOverlay({
        instantMode: "transition",
        instantSceneTexts: [{ template: "hero", heroText: "HELLO" }],
      }),
      false
    );
  });

  it("storySourceLanguageCode is original (canonical project storyboard)", () => {
    assert.equal(storySourceLanguageCode(), "original");
  });

  it("prepareStorySceneTexts returns original copy without translation", async () => {
    const prepared = await prepareStorySceneTexts({
      project: {
        instantSceneTexts: [{ template: "hero", heroText: "HELLO" }],
      },
      languageCode: "original",
    });
    assert.equal(prepared.translationProvider, "none");
    assert.equal(prepared.sceneTexts[0]?.heroText, "HELLO");
  });

  it("sceneTextsSummary joins hero and lines", () => {
    const summary = sceneTextsSummary([
      { template: "hero", heroText: "ONE" },
      { template: "sequence", lines: ["Two", "Three"] },
    ]);
    assert.match(summary, /ONE/);
    assert.match(summary, /Two/);
  });
});

describe("clean video download", () => {
  it("resolveProjectVideoDownload returns clean variant URL", () => {
    const resolved = resolveProjectVideoDownload(
      {
        id: "proj1",
        instantCleanFinalVideoUrl: "https://example.com/clean.mp4",
        exports: [{ outputVideoUrl: "https://example.com/final.mp4", status: "completed" }],
        transitions: [],
        languageExports: [],
      } as never,
      undefined,
      undefined,
      "clean"
    );
    assert.equal(resolved?.sourceUrl, "https://example.com/clean.mp4");
    assert.match(resolved?.filename ?? "", /clean/);
  });

  it("final export URL is separate from clean URL", () => {
    const resolved = resolveProjectVideoDownload(
      {
        id: "proj1",
        instantCleanFinalVideoUrl: "https://example.com/clean.mp4",
        exports: [{ outputVideoUrl: "https://example.com/final.mp4", status: "completed" }],
        transitions: [],
        languageExports: [],
      } as never
    );
    assert.match(resolved?.sourceUrl ?? "", /https:\/\/example\.com\/final\.mp4/);
  });

  it("cleanFinalBlobPathname uses dedicated path", () => {
    assert.equal(cleanFinalBlobPathname("abc"), "motion/final/abc/clean.mp4");
  });
});
