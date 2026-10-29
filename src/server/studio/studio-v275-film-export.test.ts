import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";
import { resolveFilmExportRuntime } from "@/server/studio/film-export-runtime";
import { renderTimelineFilm } from "@/server/studio/studio-timeline-render";

const execFileAsync = promisify(execFile);

describe("film export runtime", () => {
  it("keeps local certification on direct FFmpeg and sends worker mode to the existing worker", () => {
    assert.equal(resolveFilmExportRuntime({} as NodeJS.ProcessEnv), "local_ffmpeg");
    assert.equal(
      resolveFilmExportRuntime({ VERCEL: "1" } as NodeJS.ProcessEnv),
      "local_ffmpeg",
    );
    assert.equal(
      resolveFilmExportRuntime({ VIDEO_RENDER_MODE: "worker" } as NodeJS.ProcessEnv),
      "external_worker",
    );
    assert.equal(
      resolveFilmExportRuntime({ VERCEL: "1", VIDEO_RENDER_MODE: "local" } as NodeJS.ProcessEnv),
      "local_ffmpeg",
    );
  });

  it("declares the long-render duration and does not bill the export", async () => {
    const route = await readFile(
      new URL("../../app/api/studio/projects/[projectId]/timeline/render/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /export const maxDuration = 300/);
    assert.match(route, /resolveFilmExportRuntime\(\) === "external_worker"/);
    assert.match(route, /acceptWorkerFilmTimelineRender/);
    assert.match(route, /status: 202/);
    assert.doesNotMatch(route, /billProviderAction|requireStudioCredits/);
    assert.doesNotMatch(route, /timeout\(180_000\)/);
    const workerCheck = route.indexOf('if (resolveFilmExportRuntime() === "external_worker")');
    const encode = route.indexOf("const rendered = await executeOwnedFilmExport");
    assert.ok(workerCheck > 0 && encode > workerCheck);
  });
});

describe("bounded synthetic film exports", () => {
  it("exports a still, a three-scene mix, and rejects a missing picture", { timeout: 180_000 }, async () => {
    const ffmpeg = await resolveFfmpegForTextOverlay();
    const ffprobe = ffmpeg.includes("ffmpeg") ? ffmpeg.replace(/ffmpeg$/, "ffprobe") : "ffprobe";
    const root = path.join(tmpdir(), `studio-v275-export-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x224466:s=320x180:r=25:d=1", "-frames:v", "1", path.join(root, "still.png")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x663322:s=320x180:r=25:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(root, "clip.mp4")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=44100:duration=4", "-ac", "2", path.join(root, "voice.wav")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=110:sample_rate=44100:duration=4", "-ac", "2", path.join(root, "music.wav")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=44100:duration=0.3", "-ac", "2", path.join(root, "sfx.wav")]);

    const single = path.join(root, "single.mp4");
    const singleResult = await renderTimelineFilm({
      workDir: path.join(root, "single-work"),
      outputPath: single,
      width: 720,
      height: 1280,
      visuals: [{ path: path.join(root, "still.png"), kind: "still", startMs: 0, durationMs: 1000, inMs: 0 }],
      audio: [{ track: "DIALOGUE", path: path.join(root, "voice.wav"), startMs: 0, durationMs: 1000, inMs: 0, volume: 80 }],
      cues: [],
      burnSubtitles: false,
    });
    assert.equal(singleResult.ok, true, singleResult.ok ? "" : singleResult.message);
    const singleInfo = await probe(ffprobe, single);
    assert.equal(singleInfo.video, "h264");
    assert.equal(singleInfo.audio, "aac");
    assert.equal(singleInfo.width, 720);
    assert.equal(singleInfo.height, 1280);
    assert.ok(singleInfo.duration > 0.8 && singleInfo.duration < 1.4);
    assert.ok((await stat(single)).size > 1000);

    const mixed = path.join(root, "mixed.mp4");
    const mixedResult = await renderTimelineFilm({
      workDir: path.join(root, "mixed-work"),
      outputPath: mixed,
      width: 720,
      height: 1280,
      visuals: [
        { path: path.join(root, "still.png"), kind: "still", startMs: 0, durationMs: 1000, inMs: 0 },
        { path: path.join(root, "clip.mp4"), kind: "video", startMs: 1000, durationMs: 1000, inMs: 0 },
        { path: path.join(root, "still.png"), kind: "still", startMs: 2000, durationMs: 1000, inMs: 0 },
      ],
      audio: [
        { track: "DIALOGUE", path: path.join(root, "voice.wav"), startMs: 0, durationMs: 2000, inMs: 0, volume: 80 },
        { track: "MUSIC", path: path.join(root, "music.wav"), startMs: 0, durationMs: 3000, inMs: 0, volume: 30 },
        { track: "SFX", path: path.join(root, "sfx.wav"), startMs: 2200, durationMs: 300, inMs: 0, volume: 70 },
      ],
      cues: [],
      burnSubtitles: false,
    });
    assert.equal(mixedResult.ok, true, mixedResult.ok ? "" : mixedResult.message);
    if (!mixedResult.ok) return;
    assert.equal(mixedResult.durationMs, 3000);
    const mixedInfo = await probe(ffprobe, mixed);
    assert.equal(mixedInfo.video, "h264");
    assert.equal(mixedInfo.audio, "aac");
    assert.equal(mixedInfo.width, 720);
    assert.equal(mixedInfo.height, 1280);
    assert.ok(mixedInfo.duration > 2.7 && mixedInfo.duration < 3.4);

    const broken = await renderTimelineFilm({
      workDir: path.join(root, "broken-work"),
      outputPath: path.join(root, "broken.mp4"),
      width: 720,
      height: 1280,
      visuals: [{ path: path.join(root, "missing.png"), kind: "still", startMs: 0, durationMs: 1000, inMs: 0 }],
      audio: [],
      cues: [],
      burnSubtitles: false,
    });
    assert.equal(broken.ok, false);
    if (!broken.ok) assert.equal(broken.code, "ffmpeg");
    await assert.rejects(stat(path.join(root, "broken.mp4")));
  });
});

async function run(binary: string, args: string[]) {
  await execFileAsync(binary, args, { timeout: 30_000 });
}

async function probe(ffprobe: string, file: string) {
  const { stdout } = await execFileAsync(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height",
    "-of", "json",
    file,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
  return {
    video: video?.codec_name ?? "",
    audio: audio?.codec_name ?? "",
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration: Number(parsed.format?.duration ?? 0),
  };
}
