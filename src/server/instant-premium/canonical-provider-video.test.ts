import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertUniqueCanonicalProviderSources,
  buildCanonicalProviderVideoPath,
  DuplicateProviderVideoSourceError,
  isVercelBlobStorageUrl,
  resolveCanonicalOutputVideoUrl,
} from "@/server/instant-premium/canonical-provider-video";
import { ProviderVideoPipelineError } from "@/server/instant-premium/canonical-provider-video";

describe("resolveCanonicalOutputVideoUrl", () => {
  it("requires completed status and outputVideoUrl", () => {
    assert.throws(
      () =>
        resolveCanonicalOutputVideoUrl({
          status: "rendering",
          outputVideoUrl: "https://x/a.mp4",
        }),
      (err: unknown) => err instanceof ProviderVideoPipelineError
    );
  });

  it("returns trimmed outputVideoUrl for completed transitions", () => {
    const url = resolveCanonicalOutputVideoUrl({
      status: "completed",
      outputVideoUrl: "  https://blob.example/seg.mp4  ",
    });
    assert.equal(url, "https://blob.example/seg.mp4");
  });
});

describe("assertUniqueCanonicalProviderSources", () => {
  it("throws DUPLICATE_PROVIDER_VIDEO_SOURCE when URLs match", () => {
    const segments = [
      {
        transitionId: "t0",
        segmentIndex: 0,
        transitionOrder: 0,
        canonicalOutputVideoUrl: "https://x/same.mp4",
        canonicalProviderVideoPath: "/tmp/a.mp4",
        downloadedHash: "hash-a",
        provider: "vidu",
        providerJobId: "j0",
      },
      {
        transitionId: "t1",
        segmentIndex: 1,
        transitionOrder: 1,
        canonicalOutputVideoUrl: "https://x/same.mp4",
        canonicalProviderVideoPath: "/tmp/b.mp4",
        downloadedHash: "hash-b",
        provider: "vidu",
        providerJobId: "j1",
      },
    ];
    assert.throws(
      () =>
        assertUniqueCanonicalProviderSources({
          projectId: "p1",
          segments,
        }),
      (err: unknown) => err instanceof DuplicateProviderVideoSourceError
    );
  });

  it("throws when download hashes match", () => {
    assert.throws(() =>
      assertUniqueCanonicalProviderSources({
        projectId: "p1",
        segments: [
          {
            transitionId: "t0",
            segmentIndex: 0,
            transitionOrder: 0,
            canonicalOutputVideoUrl: "https://x/0.mp4",
            canonicalProviderVideoPath: "/tmp/0.mp4",
            downloadedHash: "same-hash",
            provider: null,
            providerJobId: null,
          },
          {
            transitionId: "t1",
            segmentIndex: 1,
            transitionOrder: 1,
            canonicalOutputVideoUrl: "https://x/1.mp4",
            canonicalProviderVideoPath: "/tmp/1.mp4",
            downloadedHash: "same-hash",
            provider: null,
            providerJobId: null,
          },
        ],
      })
    );
  });
});

describe("buildCanonicalProviderVideoPath", () => {
  it("includes transition id in filename for isolation", () => {
    const p = buildCanonicalProviderVideoPath("/work", "tr_abc123", 2);
    assert.match(p, /canonical-2-tr_abc123\.mp4$/);
  });
});

describe("isVercelBlobStorageUrl", () => {
  it("detects vercel blob host", () => {
    assert.equal(
      isVercelBlobStorageUrl("https://abc.public.blob.vercel-storage.com/motion/x.mp4"),
      true
    );
    assert.equal(isVercelBlobStorageUrl("https://vidu.example/out.mp4"), false);
  });
});
