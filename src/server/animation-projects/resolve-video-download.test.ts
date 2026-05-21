import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProjectVideoDownload } from "@/server/animation-projects/resolve-video-download";

describe("resolveProjectVideoDownload", () => {
  const baseProject = {
    id: "p1",
    transitions: [{ order: 0, outputVideoUrl: "/seg0.mp4" }],
    exports: [{ outputVideoUrl: "/final.mp4" }],
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

  it("returns default export when no language is set", () => {
    const resolved = resolveProjectVideoDownload(baseProject);
    assert.equal(resolved?.sourceUrl, "/final.mp4");
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
