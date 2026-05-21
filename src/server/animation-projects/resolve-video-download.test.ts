import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProjectVideoDownload } from "@/server/animation-projects/resolve-video-download";

describe("resolveProjectVideoDownload", () => {
  const baseProject = {
    id: "p1",
    status: "completed",
    instantFinalRebuildCount: 1,
    instantFinalRebuiltAt: new Date("2026-05-01T12:00:00.000Z"),
    instantFinalRebuildStatus: null,
    instantPreviousFinalVideoUrl: null,
    transitions: [{ order: 0, outputVideoUrl: "/seg0.mp4" }],
    exports: [{ outputVideoUrl: "https://cdn.example/final.mp4", status: "completed" }],
    languageExports: [
      {
        languageCode: "nl",
        status: "completed",
        version: 1,
        outputVideoUrl: "/nl-final.mp4",
      },
      {
        languageCode: "en",
        status: "needs_refresh",
        version: 1,
        outputVideoUrl: "/en-stale.mp4",
      },
    ],
  } as Parameters<typeof resolveProjectVideoDownload>[0];

  it("returns cache-busted default export when no language is set", () => {
    const resolved = resolveProjectVideoDownload(baseProject);
    assert.ok(resolved?.sourceUrl.includes("https://cdn.example/final.mp4"));
    assert.ok(resolved?.sourceUrl.includes("v=1"));
  });

  it("returns latest completed language export", () => {
    const resolved = resolveProjectVideoDownload(baseProject, undefined, "nl");
    assert.equal(resolved?.sourceUrl, "/nl-final.mp4");
    assert.match(resolved?.filename ?? "", /-nl\.mp4$/);
  });

  it("ignores non-completed language exports", () => {
    const resolved = resolveProjectVideoDownload(baseProject, undefined, "en");
    assert.equal(resolved, null);
  });
});
