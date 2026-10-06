import assert from "node:assert/strict";
import test from "node:test";
import {
  decideMarketplaceVideo,
  isAllowedCallbackUrl,
  isHdrMetadata,
  marketplaceJobAdmission,
  parseMarketplaceJobRequest,
  targetDimensions,
  workerMaxDurationCap,
  type MarketplaceProbe,
} from "./marketplace-video-job";

function probe(overrides: Partial<MarketplaceProbe> = {}): MarketplaceProbe {
  return {
    durationSeconds: 12,
    container: "mov,mp4,m4a,3gp,3g2,mj2",
    videoCodec: "h264",
    audioCodec: "aac",
    width: 608,
    height: 1080,
    displayWidth: 608,
    displayHeight: 1080,
    frameRate: 30,
    rotationDegrees: 0,
    colorTransfer: null,
    colorPrimaries: null,
    colorSpace: null,
    pixelFormat: "yuv420p",
    hasAudio: true,
    hdr: false,
    ...overrides,
  };
}

test("608x1080 H.264 stays at its own size", () => {
  const size = targetDimensions(608, 1080);
  assert.equal(size.scaled, false);
  assert.deepEqual({ width: size.width, height: size.height }, { width: 608, height: 1080 });
  const decision = decideMarketplaceVideo({
    probe: probe(),
    sourceBytes: 4_000_000,
    maxDurationSeconds: 30,
  });
  assert.equal(decision.decision, "passthrough");
});

test("4K portrait is downscaled and never upscaled", () => {
  const large = targetDimensions(2160, 3840);
  assert.equal(large.scaled, true);
  assert.ok(large.width <= 720);
  assert.ok(large.height <= 1280);
  const small = targetDimensions(320, 480);
  assert.equal(small.scaled, false);
  assert.equal(small.width, 320);
});

test("duration policy is the caller maximum", () => {
  const over = decideMarketplaceVideo({
    probe: probe({ durationSeconds: 31 }),
    sourceBytes: 1_000_000,
    maxDurationSeconds: 30,
  });
  assert.equal(over.code, "DURATION");
  const allowed = decideMarketplaceVideo({
    probe: probe({ durationSeconds: 90 }),
    sourceBytes: 8_000_000,
    maxDurationSeconds: 90,
  });
  assert.notEqual(allowed.code, "DURATION");
  const rejected = decideMarketplaceVideo({
    probe: probe({ durationSeconds: 91 }),
    sourceBytes: 8_000_000,
    maxDurationSeconds: 90,
  });
  assert.equal(rejected.code, "DURATION");
});

test("HEVC, HDR, and incompatible audio are not published unchanged", () => {
  assert.equal(
    decideMarketplaceVideo({
      probe: probe({ videoCodec: "hevc" }),
      sourceBytes: 2_000_000,
      maxDurationSeconds: 30,
    }).decision,
    "transcode",
  );
  assert.equal(isHdrMetadata({ colorTransfer: "smpte2084", colorPrimaries: "bt2020" }), true);
  assert.equal(
    decideMarketplaceVideo({
      probe: probe({ hdr: true, colorTransfer: "smpte2084", colorPrimaries: "bt2020" }),
      sourceBytes: 2_000_000,
      maxDurationSeconds: 30,
    }).code,
    "HDR_UNSUPPORTED",
  );
  assert.equal(
    decideMarketplaceVideo({
      probe: probe({ audioCodec: "opus" }),
      sourceBytes: 2_000_000,
      maxDurationSeconds: 30,
    }).decision,
    "transcode",
  );
});

test("studio and marketplace share one heavy slot", () => {
  assert.equal(marketplaceJobAdmission({ studioActive: 0, marketplaceActive: 0 }), "ok");
  assert.equal(marketplaceJobAdmission({ studioActive: 1, marketplaceActive: 0 }), "busy");
  assert.equal(marketplaceJobAdmission({ studioActive: 0, marketplaceActive: 1 }), "busy");
});

test("the worker does not trust a browser duration above the cap", () => {
  const previous = process.env.MARKETPLACE_VIDEO_ALLOW_HEADROOM;
  delete process.env.MARKETPLACE_VIDEO_ALLOW_HEADROOM;
  assert.equal(workerMaxDurationCap(), 90);
  const raised = parseMarketplaceJobRequest({
    sourceUrl: "https://example.public.blob.vercel-storage.com/marketplace-video-sources/a.mp4",
    maxDurationSeconds: 120,
    profile: "marketplace-h264-v1",
  });
  assert.equal(raised.ok, false);
  const foreign = parseMarketplaceJobRequest({
    sourceUrl: "https://evil.example/video.mp4",
    maxDurationSeconds: 30,
  });
  assert.equal(foreign.ok, false);
  assert.equal(isAllowedCallbackUrl("https://homecheff.eu/api/media/marketplace-video/callback"), true);
  assert.equal(isAllowedCallbackUrl("https://evil.example/hook"), false);
  if (previous === undefined) delete process.env.MARKETPLACE_VIDEO_ALLOW_HEADROOM;
  else process.env.MARKETPLACE_VIDEO_ALLOW_HEADROOM = previous;
});
