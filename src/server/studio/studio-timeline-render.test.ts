import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, copyFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";
import { extractLastFrame, renderTimelineFilm } from "@/server/studio/studio-timeline-render";
import { buildSrt, buildVtt } from "@/lib/studio-timeline";

const execFileAsync = promisify(execFile);

describe("local timeline film", () => {
  it("renders two pictures, speech, music, an effect, and a burned subtitle", { timeout: 180_000 }, async () => {
    const ffmpeg = await resolveFfmpegForTextOverlay();
    const root = path.join(tmpdir(), `studio-v16-${Date.now()}`);
    const evidence = path.join(process.cwd(), "docs/studio-v16/evidence");
    await mkdir(root, { recursive: true });
    await mkdir(evidence, { recursive: true });

    await run(ffmpeg, [
      "-y", "-f", "lavfi", "-i", "color=c=0x8B1E3F:s=640x360:r=25:d=2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(root, "red.mp4"),
    ]);
    await run(ffmpeg, [
      "-y", "-f", "lavfi", "-i", "color=c=0x1D4E89:s=640x360:r=25:d=2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(root, "blue.mp4"),
    ]);
    await run(ffmpeg, [
      "-y", "-f", "lavfi", "-i", "sine=frequency=196:sample_rate=44100:duration=5",
      "-ac", "2", path.join(root, "music.wav"),
    ]);
    await run(ffmpeg, [
      "-y", "-f", "lavfi", "-i", "sine=frequency=988:sample_rate=44100:duration=0.35",
      "-ac", "2", path.join(root, "sfx.wav"),
    ]);
    const speechAiff = path.join(root, "speech.aiff");
    try {
      await run("say", ["-o", speechAiff, "The garden is ready."]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`BLOCKING: spoken audio could not be created locally. ${message}`);
    }
    await run(ffmpeg, ["-y", "-i", speechAiff, "-ar", "44100", "-ac", "2", path.join(root, "speech.wav")]);
    const speechSeconds = await probeDuration(ffmpeg, path.join(root, "speech.wav"));
    const speechMs = Math.min(1800, Math.max(400, Math.round(speechSeconds * 1000)));

    const outputPath = path.join(root, "film.mp4");
    const rendered = await renderTimelineFilm({
      workDir: path.join(root, "work"),
      outputPath,
      width: 720,
      height: 1280,
      visuals: [
        { path: path.join(root, "red.mp4"), kind: "video", startMs: 0, durationMs: 2000, inMs: 0 },
        { path: path.join(root, "blue.mp4"), kind: "video", startMs: 2500, durationMs: 2000, inMs: 0 },
      ],
      audio: [
        { track: "DIALOGUE", path: path.join(root, "speech.wav"), startMs: 200, durationMs: speechMs, inMs: 0, volume: 100 },
        { track: "MUSIC", path: path.join(root, "music.wav"), startMs: 0, durationMs: 4500, inMs: 0, volume: 35 },
        { track: "SFX", path: path.join(root, "sfx.wav"), startMs: 3100, durationMs: 350, inMs: 0, volume: 80 },
      ],
      cues: [{ text: "De tuin is klaar", startMs: 400, endMs: 1600, sceneId: "fixture" }],
      burnSubtitles: true,
    });
    assert.equal(rendered.ok, true, rendered.ok ? "" : rendered.message);
    if (!rendered.ok) return;
    assert.equal(rendered.durationMs, 4500);

    const info = await execFileAsync(ffmpeg.replace(/ffmpeg$/, "ffprobe"), [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
      "-of", "json",
      outputPath,
    ]).catch(async () => execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
      "-of", "json",
      outputPath,
    ]));
    const probe = JSON.parse(info.stdout) as {
      streams: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
      format?: { duration?: string };
    };
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    assert.equal(video?.codec_name, "h264");
    assert.equal(video?.width, 720);
    assert.equal(video?.height, 1280);
    assert.equal(audio?.codec_name, "aac");
    const duration = Number(probe.format?.duration);
    assert.ok(duration > 4.2 && duration < 4.9, `duration ${duration}`);

    const beforeCue = path.join(evidence, "frame-before-subtitle.png");
    const duringCue = path.join(evidence, "frame-subtitle.png");
    const secondShot = path.join(evidence, "frame-second-shot.png");
    await grab(ffmpeg, outputPath, "0.15", beforeCue);
    await grab(ffmpeg, outputPath, "1.00", duringCue);
    await grab(ffmpeg, outputPath, "3.20", secondShot);
    const quiet = await bandVariance(ffmpeg, beforeCue);
    const titled = await bandVariance(ffmpeg, duringCue);
    assert.ok(titled > quiet + 8, `subtitle contrast ${titled} vs ${quiet}`);

    const lastFrame = path.join(evidence, "last-frame-of-first-shot.png");
    const extracted = await extractLastFrame(path.join(root, "red.mp4"), lastFrame);
    assert.equal(extracted.ok, true);
    const frameStat = await stat(lastFrame);
    assert.ok(frameStat.size > 500);

    const filmCopy = path.join(evidence, "v16-local-film.mp4");
    await copyFile(outputPath, filmCopy);
    await copyFile(path.join(root, "work/story-overlay.ass"), path.join(evidence, "story-overlay.ass")).catch(() => undefined);
    const filmStat = await stat(filmCopy);
    assert.ok(filmStat.size > 10_000);
  });

  it("renders a 24 second film with a still, delayed music, and two subtitle languages", { timeout: 180_000 }, async () => {
    const ffmpeg = await resolveFfmpegForTextOverlay();
    const root = path.join(tmpdir(), `studio-v17-${Date.now()}`);
    const evidence = path.join(process.cwd(), "docs/studio-v17/evidence");
    await mkdir(root, { recursive: true });
    await mkdir(evidence, { recursive: true });
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x8B1E3F:s=640x360:r=25:d=8", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(root, "uploaded.mp4")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0xF4C430:s=640x360", "-frames:v", "1", path.join(root, "still.png")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x1D4E89:s=640x360:r=25:d=8", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(root, "third.mp4")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=196:sample_rate=44100:duration=24", "-ac", "2", path.join(root, "music.wav")]);
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=44100:duration=0.4", "-ac", "2", path.join(root, "sfx.wav")]);
    const speechAiff = path.join(root, "speech.aiff");
    try {
      await run("say", ["-o", speechAiff, "The garden stays ready for the whole scene."]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`BLOCKING: spoken audio could not be created locally. ${message}`);
    }
    await run(ffmpeg, ["-y", "-i", speechAiff, "-ar", "44100", "-ac", "2", path.join(root, "speech.wav")]);
    const speechMs = Math.min(4000, Math.max(800, Math.round((await probeDuration(ffmpeg, path.join(root, "speech.wav"))) * 1000)));
    const nl = [{ text: "De tuin blijft klaar", startMs: 6400, endMs: 9000, sceneId: "fixture" }];
    const es = [{ text: "El jardín sigue listo", startMs: 6400, endMs: 9800, sceneId: "fixture" }];
    await writeFile(path.join(evidence, "v17-nl.srt"), buildSrt(nl), "utf8");
    await writeFile(path.join(evidence, "v17-es.vtt"), buildVtt(es, "es-MX"), "utf8");

    const outputPath = path.join(root, "film.mp4");
    const rendered = await renderTimelineFilm({
      workDir: path.join(root, "work"),
      outputPath,
      width: 720,
      height: 1280,
      visuals: [
        { path: path.join(root, "uploaded.mp4"), kind: "video", startMs: 0, durationMs: 8000, inMs: 0 },
        { path: path.join(root, "still.png"), kind: "still", startMs: 8000, durationMs: 8000, inMs: 0 },
        { path: path.join(root, "third.mp4"), kind: "video", startMs: 16000, durationMs: 8000, inMs: 0 },
      ],
      audio: [
        { track: "MUSIC", path: path.join(root, "music.wav"), startMs: 2000, durationMs: 20000, inMs: 0, volume: 40 },
        { track: "DIALOGUE", path: path.join(root, "speech.wav"), startMs: 6000, durationMs: speechMs, inMs: 0, volume: 100 },
        { track: "SFX", path: path.join(root, "sfx.wav"), startMs: 18000, durationMs: 400, inMs: 0, volume: 80 },
      ],
      cues: nl,
      burnSubtitles: true,
    });
    assert.equal(rendered.ok, true, rendered.ok ? "" : rendered.message);
    if (!rendered.ok) return;
    assert.equal(rendered.durationMs, 24000);
    const filmCopy = path.join(evidence, "v17-local-film.mp4");
    await copyFile(outputPath, filmCopy);
    const info = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
      "-of", "json",
      filmCopy,
    ]);
    const probe = JSON.parse(info.stdout) as {
      streams: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
      format?: { duration?: string };
    };
    assert.equal(probe.streams.find((stream) => stream.codec_type === "video")?.codec_name, "h264");
    assert.equal(probe.streams.find((stream) => stream.codec_type === "video")?.width, 720);
    assert.equal(probe.streams.find((stream) => stream.codec_type === "video")?.height, 1280);
    assert.equal(probe.streams.find((stream) => stream.codec_type === "audio")?.codec_name, "aac");
    const duration = Number(probe.format?.duration);
    assert.ok(duration > 23.5 && duration < 24.8, `duration ${duration}`);
    const leadIn = await meanVolume(ffmpeg, filmCopy, 0.3, 1);
    const musicBed = await meanVolume(ffmpeg, filmCopy, 3, 1.5);
    const speech = await meanVolume(ffmpeg, filmCopy, 6.4, 1.2);
    assert.ok(leadIn < musicBed - 8, `lead-in ${leadIn} should be quieter than music ${musicBed}`);
    assert.ok(speech > musicBed - 3, `speech ${speech} should be present over music ${musicBed}`);
    await grab(ffmpeg, filmCopy, "7.2", path.join(evidence, "v17-frame-subtitle.png"));
    await grab(ffmpeg, filmCopy, "12", path.join(evidence, "v17-frame-still.png"));
    await grab(ffmpeg, filmCopy, "20", path.join(evidence, "v17-frame-third.png"));
    await writeFile(path.join(evidence, "v17-audio-levels.json"), JSON.stringify({ leadIn, musicBed, speech, duration, speechMs }, null, 2), "utf8");
    const subtitle = await bandVariance(ffmpeg, path.join(evidence, "v17-frame-subtitle.png"));
    const still = await bandVariance(ffmpeg, path.join(evidence, "v17-frame-still.png"));
    assert.ok(subtitle > still + 8, `burned subtitle contrast ${subtitle} vs still ${still}`);
  });
});

async function meanVolume(ffmpeg: string, file: string, start: number, duration: number): Promise<number> {
  const result = await execFileAsync(
    ffmpeg,
    ["-ss", start.toFixed(3), "-t", duration.toFixed(3), "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const match = `${result.stderr}\n${result.stdout}`.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  assert.ok(match, `${result.stderr}`.slice(-400));
  return Number(match[1]);
}

async function run(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args, { maxBuffer: 8 * 1024 * 1024 });
}

async function probeDuration(ffmpeg: string, file: string): Promise<number> {
  const probe = ffmpeg.replace(/ffmpeg$/, "ffprobe");
  const command = probe === ffmpeg ? "ffprobe" : probe;
  const result = await execFileAsync(command, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(result.stdout.trim());
}

async function grab(ffmpeg: string, video: string, at: string, dest: string): Promise<void> {
  await run(ffmpeg, ["-y", "-ss", at, "-i", video, "-frames:v", "1", dest]);
}

async function bandVariance(ffmpeg: string, png: string): Promise<number> {
  const result = await execFileAsync(
    ffmpeg,
    ["-i", png, "-vf", "crop=iw:ih*0.16:0:ih*0.76,format=gray,scale=48:16", "-f", "rawvideo", "-"],
    { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 },
  );
  const bytes = result.stdout as Buffer;
  let sum = 0;
  for (const value of bytes) sum += value;
  const mean = sum / bytes.length;
  let square = 0;
  for (const value of bytes) square += (value - mean) ** 2;
  return Math.sqrt(square / bytes.length);
}
