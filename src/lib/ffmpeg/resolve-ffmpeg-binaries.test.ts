import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFfmpegCandidatePaths,
  buildFfprobeCandidatePaths,
  FFMPEG_BINARY_MISSING,
  FFPROBE_BINARY_MISSING,
  isSpawnEnoent,
  mapSpawnError,
  sanitizeSpawnErrorMessage,
  VideoToolsMissingError,
} from "@/lib/ffmpeg/resolve-ffmpeg-binaries";

describe("resolve-ffmpeg-binaries", () => {
  it("orders ffmpeg candidates with env before system and PATH fallback", () => {
    const prev = process.env.FFMPEG_PATH;
    process.env.FFMPEG_PATH = "/custom/ffmpeg";
    try {
      const paths = buildFfmpegCandidatePaths();
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

  it("orders ffprobe candidates with env first", () => {
    const prev = process.env.FFPROBE_PATH;
    process.env.FFPROBE_PATH = "/custom/ffprobe";
    try {
      const paths = buildFfprobeCandidatePaths();
      assert.equal(paths[0], "/custom/ffprobe");
      assert.ok(paths.includes("ffprobe"));
    } finally {
      if (prev === undefined) {
        delete process.env.FFPROBE_PATH;
      } else {
        process.env.FFPROBE_PATH = prev;
      }
    }
  });

  it("detects ENOENT spawn errors", () => {
    assert.equal(isSpawnEnoent("spawn ffprobe ENOENT"), true);
    assert.equal(isSpawnEnoent("ok"), false);
  });

  it("sanitizes ENOENT to user-facing message without leaking raw spawn", () => {
    const msg = sanitizeSpawnErrorMessage("spawn ffprobe ENOENT");
    assert.ok(!msg.includes("ENOENT"));
    assert.ok(msg.includes("ontbreken"));
  });

  it("maps spawn ENOENT to FFPROBE_BINARY_MISSING", () => {
    assert.throws(
      () => mapSpawnError(new Error("spawn ffprobe ENOENT"), "ffprobe"),
      (err: unknown) => {
        assert.ok(err instanceof VideoToolsMissingError);
        assert.equal(err.code, FFPROBE_BINARY_MISSING);
        return true;
      }
    );
  });

  it("maps ffmpeg ENOENT to FFMPEG_BINARY_MISSING", () => {
    assert.throws(
      () => mapSpawnError(Object.assign(new Error("spawn ffmpeg ENOENT"), { code: "ENOENT" }), "ffmpeg"),
      (err: unknown) => {
        assert.ok(err instanceof VideoToolsMissingError);
        assert.equal(err.code, FFMPEG_BINARY_MISSING);
        return true;
      }
    );
  });
});
