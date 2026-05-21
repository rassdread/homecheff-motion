import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isVercelServerless,
  shouldRunFfmpegLocally,
} from "@/lib/video-ffmpeg-runtime";

describe("video-ffmpeg-runtime", () => {
  it("treats VERCEL as serverless without local ffmpeg", () => {
    const prevVercel = process.env.VERCEL;
    const prevMode = process.env.VIDEO_RENDER_MODE;
    process.env.VERCEL = "1";
    delete process.env.VIDEO_RENDER_MODE;
    try {
      assert.equal(isVercelServerless(), true);
      assert.equal(shouldRunFfmpegLocally(), false);
    } finally {
      if (prevVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = prevVercel;
      }
      if (prevMode === undefined) {
        delete process.env.VIDEO_RENDER_MODE;
      } else {
        process.env.VIDEO_RENDER_MODE = prevMode;
      }
    }
  });
});
