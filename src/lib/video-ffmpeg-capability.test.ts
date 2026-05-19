import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ffmpegFiltersOutputIncludesDrawtext,
  payloadRequiresLockedTextOverlay,
  resolveFfmpegCandidatePaths,
  sanitizeOverlayError,
} from "@/lib/video-ffmpeg-capability";
import { validateLockedTextLayerMetadata } from "@/lib/locked-text-layer";
import {
  isInstantPremiumExportCompleted,
  isOverlayFailureStatus,
} from "@/lib/instant-premium-export-status";

describe("video-ffmpeg-capability", () => {
  it("detects drawtext from ffmpeg -filters stdout", () => {
    const sample = `Filters:\n T. drawtext          V->V       Draw text on top of video frames\n T. scale             V->V       Scale the input video\n`;
    assert.equal(ffmpegFiltersOutputIncludesDrawtext(sample), true);
    assert.equal(ffmpegFiltersOutputIncludesDrawtext("no text filters here"), false);
  });

  it("orders ffmpeg candidates with env path first", () => {
    const prev = process.env.FFMPEG_PATH;
    process.env.FFMPEG_PATH = "/custom/ffmpeg";
    try {
      const paths = resolveFfmpegCandidatePaths();
      assert.equal(paths[0], "/custom/ffmpeg");
      assert.ok(paths.includes("ffmpeg"));
    } finally {
      if (prev === undefined) {
        delete process.env.FFMPEG_PATH;
      } else {
        process.env.FFMPEG_PATH = prev;
      }
    }
  });

  it("sanitizes overlay errors for UI storage", () => {
    const raw =
      "Locked text overlay failed at /Users/secret/project/file.mp4 Bearer sk_live_abc123";
    const safe = sanitizeOverlayError(raw);
    assert.ok(!safe.includes("/Users/secret"));
    assert.ok(!safe.includes("sk_live_abc123"));
    assert.ok(safe.includes("[path]"));
  });

  it("requires overlay when locked text mode has layers", () => {
    assert.equal(
      payloadRequiresLockedTextOverlay({
        lockedTextMode: true,
        lockedTextLayers: [{ id: "a", text: "Hi", locked: true } as never],
      }),
      true
    );
    assert.equal(
      payloadRequiresLockedTextOverlay({ lockedTextMode: false, lockedTextLayers: [{} as never] }),
      false
    );
    assert.equal(payloadRequiresLockedTextOverlay({ lockedTextMode: true }), false);
  });
});

describe("locked text metadata", () => {
  it("preserves exact locked text in expectedTextLayers records", () => {
    const text = "Bestel nu — 20% korting";
    const result = validateLockedTextLayerMetadata([
      {
        id: "cta-1",
        text,
        x: 0.5,
        y: 0.86,
        animation: "typewriter",
        startMs: 0,
        durationMs: 2000,
        locked: true,
      },
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.records[0]?.expectedText, text);
    assert.equal(result.records[0]?.renderedText, text);
    assert.equal(result.records[0]?.match, true);
  });
});

describe("worker render mode guard", () => {
  it("requires worker config when VIDEO_RENDER_MODE=worker", async () => {
    const prevMode = process.env.VIDEO_RENDER_MODE;
    const prevUrl = process.env.VIDEO_WORKER_BASE_URL;
    const prevSecret = process.env.VIDEO_WORKER_SECRET;
    process.env.VIDEO_RENDER_MODE = "worker";
    delete process.env.VIDEO_WORKER_BASE_URL;
    delete process.env.VIDEO_WORKER_SECRET;
    try {
      const { assertVideoRenderingReadyForLockedText } = await import(
        "@/lib/video-ffmpeg-capability"
      );
      const result = await assertVideoRenderingReadyForLockedText();
      assert.equal(result.ok, false);
    } finally {
      if (prevMode === undefined) delete process.env.VIDEO_RENDER_MODE;
      else process.env.VIDEO_RENDER_MODE = prevMode;
      if (prevUrl === undefined) delete process.env.VIDEO_WORKER_BASE_URL;
      else process.env.VIDEO_WORKER_BASE_URL = prevUrl;
      if (prevSecret === undefined) delete process.env.VIDEO_WORKER_SECRET;
      else process.env.VIDEO_WORKER_SECRET = prevSecret;
    }
  });
});

describe("instant premium export status", () => {
  it("overlay failure does not count as completed", () => {
    assert.equal(isOverlayFailureStatus("failed_overlay", "failed_overlay"), true);
    assert.equal(isInstantPremiumExportCompleted("failed_overlay", "failed_overlay"), false);
    assert.equal(isInstantPremiumExportCompleted("completed", "completed"), true);
  });
});
