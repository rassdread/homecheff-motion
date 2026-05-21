import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPlaybackUrlFreshAfterRebuild,
  buildPlaybackCacheKey,
  pickPlaybackUrl,
  STALE_PLAYBACK_URL,
  urlsReferToSameAsset,
} from "@/lib/playback-url-resolution";

describe("pickPlaybackUrl", () => {
  it("prefers detail export when snapshot matches previous final", () => {
    const previous = "https://cdn.example/old.mp4";
    const snapshot = "https://cdn.example/old.mp4?v=1&t=100";
    const detail = "https://cdn.example/new.mp4?v=2&t=200";
    const picked = pickPlaybackUrl({
      detailExportUrl: detail,
      statusSnapshotUrl: snapshot,
      previousFinalVideoUrl: previous,
    });
    assert.equal(picked.url, detail);
    assert.equal(picked.source, "detail_export");
  });

  it("prefers higher cache-bust version on detail", () => {
    const picked = pickPlaybackUrl({
      detailExportUrl: "https://cdn.example/a.mp4?v=3&t=1",
      statusSnapshotUrl: "https://cdn.example/a.mp4?v=1&t=9",
    });
    assert.equal(picked.source, "detail_export");
  });
});

describe("buildPlaybackCacheKey", () => {
  it("encodes v and t query params", () => {
    assert.equal(buildPlaybackCacheKey("https://x.test/v.mp4?v=4&t=99"), "v4-t99");
  });
});

describe("assertPlaybackUrlFreshAfterRebuild", () => {
  it("flags same blob as previous after rebuild", () => {
    const url = "https://cdn.example/same.mp4";
    const result = assertPlaybackUrlFreshAfterRebuild({
      projectId: "p1",
      newRawUrl: url,
      previousRawUrl: url,
      rebuildCount: 2,
      exportId: "e1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, STALE_PLAYBACK_URL);
    }
  });

  it("passes when new url differs from previous", () => {
    const result = assertPlaybackUrlFreshAfterRebuild({
      projectId: "p1",
      newRawUrl: "https://cdn.example/new.mp4",
      previousRawUrl: "https://cdn.example/old.mp4",
      rebuildCount: 1,
      exportId: "e1",
    });
    assert.equal(result.ok, true);
  });
});

describe("urlsReferToSameAsset", () => {
  it("ignores cache bust params", () => {
    assert.equal(
      urlsReferToSameAsset(
        "https://cdn.example/a.mp4?v=2&t=1",
        "https://cdn.example/a.mp4?v=0&t=0"
      ),
      true
    );
  });
});
