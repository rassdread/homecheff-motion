import { spawn } from "node:child_process";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { probeMarketplaceFile, processMarketplaceVideoFile } from "../src/server/marketplace-video/marketplace-video-job";

const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${code}`))));
  });
}

async function makeVideo(file: string, args: string[]): Promise<void> {
  await run(ffmpeg, ["-y", ...args, file]);
}

async function volume(file: string): Promise<string | null> {
  const result = await new Promise<{ stderr: string }>((resolve, reject) => {
    const child = spawn(ffmpeg, ["-i", file, "-af", "volumedetect", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    const err: Buffer[] = [];
    child.stderr.on("data", (chunk) => err.push(chunk as Buffer));
    child.on("error", reject);
    child.on("close", () => resolve({ stderr: Buffer.concat(err).toString("utf8") }));
  });
  return result.stderr.match(/mean_volume:\s+(-?\d+(?:\.\d+)?) dB/)?.[1] ?? null;
}

async function main(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "hc-marketplace-cert-"));
  const rows: Array<Record<string, string | number | boolean | null>> = [];

  async function certify(name: string, source: string, maxDurationSeconds: number): Promise<void> {
    console.error(`certify ${name}`);
    const started = Date.now();
    let before: { size: number };
    try {
      before = await stat(source);
    } catch {
      rows.push({ name, ok: false, code: "SOURCE_MISSING", seconds: Number(((Date.now() - started) / 1000).toFixed(1)) });
      return;
    }
    const workDir = path.join(dir, name);
    const result = await processMarketplaceVideoFile({
      sourcePath: source,
      workDir,
      maxDurationSeconds,
      sourceBytes: before.size,
      ffmpegPath: ffmpeg,
      ffprobePath: ffprobe,
    });
    if (!result.ok) {
      rows.push({ name, ok: false, code: result.code, seconds: Number(((Date.now() - started) / 1000).toFixed(1)) });
      return;
    }
    const after = await stat(result.outputPath);
    const poster = await stat(result.posterPath);
    const mean = result.outputAudioCodec ? await volume(result.outputPath) : null;
    rows.push({
      name,
      ok: true,
      decision: result.decision,
      sourceBytes: before.size,
      canonicalBytes: after.size,
      posterBytes: poster.size,
      width: result.outputWidth,
      height: result.outputHeight,
      video: result.outputVideoCodec,
      audio: result.outputAudioCodec,
      duration: Number(result.outputDurationSeconds.toFixed(2)),
      meanVolumeDb: mean,
      seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    });
  }

  const portrait = path.join(dir, "portrait.mp4");
  await makeVideo(portrait, [
    "-f", "lavfi", "-i", "testsrc=size=608x1080:rate=30:duration=4",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
  ]);
  await certify("compatible-608x1080", portrait, 30);

  const hevc = path.join(dir, "iphone.mov");
  await makeVideo(hevc, [
    "-f", "lavfi", "-i", "testsrc=size=720x1280:rate=30:duration=3",
    "-f", "lavfi", "-i", "sine=frequency=523:sample_rate=48000:duration=3",
    "-c:v", "libx265", "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
  ]);
  await certify("hevc-mov", hevc, 30);

  const android = path.join(dir, "android.mp4");
  await makeVideo(android, [
    "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=4",
    "-f", "lavfi", "-i", "sine=frequency=330:sample_rate=48000:duration=4",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
  ]);
  await certify("android-h264", android, 30);

  const rotated = path.join(dir, "rotated.mp4");
  await makeVideo(rotated, [
    "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=2",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-metadata:s:v:0", "rotate=90", "-an",
  ]);
  await certify("rotated", rotated, 30);

  const silent = path.join(dir, "silent.mp4");
  await makeVideo(silent, ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an"]);
  await certify("no-audio", silent, 30);

  const fourK = path.join(dir, "fourk.mp4");
  await makeVideo(fourK, ["-f", "lavfi", "-i", "testsrc=size=3840x2160:rate=30:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast", "-an"]);
  await certify("fourk", fourK, 30);

  const hdr = path.join(dir, "hdr.mp4");
  await makeVideo(hdr, [
    "-f", "lavfi", "-i", "testsrc=size=320x240:rate=30:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-color_primaries", "bt2020", "-color_trc", "smpte2084", "-colorspace", "bt2020nc", "-an",
  ]);
  const hdrProbe = await probeMarketplaceFile(hdr, ffprobe);
  rows.push({ name: "hdr-probe", ok: Boolean(hdrProbe?.hdr), transfer: hdrProbe?.colorTransfer ?? null });
  await certify("hdr", hdr, 30);

  await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", path.join(dir, "audio-only.m4a")]).catch(() => undefined);
  await certify("malformed", path.join(dir, "missing.bin"), 30);

  for (const seconds of [29, 30, 31, 60, 89, 90, 91]) {
    const file = path.join(dir, `d${seconds}.mp4`);
    await makeVideo(file, [
      "-f", "lavfi", "-i", `color=c=red:size=320x240:rate=30:duration=${seconds}`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast", "-an",
    ]);
    await certify(`duration-${seconds}-max30`, file, 30);
    await certify(`duration-${seconds}-max90`, file, 90);
  }

  for (const [label, size] of [["720p", "1280x720"], ["1080p", "1920x1080"]] as const) {
    for (const seconds of [90, 120]) {
      const file = path.join(dir, `${label}-${seconds}.mp4`);
      const started = Date.now();
      await makeVideo(file, [
        "-f", "lavfi", "-i", `testsrc=size=${size}:rate=30:duration=${seconds}`,
        "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${seconds}`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast", "-c:a", "aac", "-shortest",
      ]);
      const source = await stat(file);
      rows.push({
        name: `source-${label}-${seconds}`,
        ok: true,
        sourceBytes: source.size,
        makeSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
      });
      await certify(`${label}-${seconds}`, file, seconds === 120 ? 120 : 90);
    }
  }

  console.log(JSON.stringify({ dir, rows }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "cert failed");
  process.exit(1);
});
