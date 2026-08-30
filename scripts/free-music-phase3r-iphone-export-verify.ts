#!/usr/bin/env npx tsx
/**
 * Wait for AirDropped/copied iPhone Free Music export and update PHYSICAL-IPHONE-CERT.json.
 *
 * Place file at:
 *   docs/audits/studio-free-music/phase-3r/iphone-exports/iphone-free-music-export.mp4
 * or ~/Downloads/iphone-free-music-export.mp4
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "docs/audits/studio-free-music/phase-3r");
const DEST = join(OUT, "iphone-exports/iphone-free-music-export.mp4");
const ALT = join(process.env.HOME ?? "", "Downloads/iphone-free-music-export.mp4");
const CERT = join(OUT, "PHYSICAL-IPHONE-CERT.json");

function ffprobe(path: string) {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name", "-of", "json", path],
    { encoding: "utf8" }
  );
  const j = JSON.parse(raw) as { format?: { duration?: string }; streams?: { codec_type?: string; codec_name?: string }[] };
  const streams = j.streams ?? [];
  const audio = streams.find((s) => s.codec_type === "audio");
  return {
    duration: Number(j.format?.duration ?? 0),
    hasVideo: streams.some((s) => s.codec_type === "video"),
    hasAudio: Boolean(audio),
    audioCodec: audio?.codec_name,
  };
}

function audioRmsAt(path: string, startSec: number, durSec: number): number {
  const py = `
import subprocess, struct, math, sys, tempfile, os
src, start, dur = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
raw = tempfile.NamedTemporaryFile(suffix='.f32le', delete=False).name
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(dur),'-i',src,'-ac','1','-ar','16000','-f','f32le',raw], check=True)
with open(raw,'rb') as f: data = f.read()
os.unlink(raw)
n = len(data)//4
print(0.0 if n==0 else math.sqrt(sum(s*s for s in struct.unpack('<'+'f'*n, data[:n*4]))/n))
`;
  return Number(execFileSync("python3", ["-c", py, path, String(startSec), String(durSec)], { encoding: "utf8" }).trim());
}

async function main() {
  mkdirSync(join(OUT, "iphone-exports"), { recursive: true });
  const deadline = Date.now() + 15 * 60_000;
  console.log(`Waiting for export at:\n  ${DEST}\n  or ${ALT}\n`);
  while (Date.now() < deadline) {
    if (existsSync(ALT) && !existsSync(DEST) && readFileSync(ALT).length > 10_000) {
      copyFileSync(ALT, DEST);
    }
    if (existsSync(DEST) && readFileSync(DEST).length > 10_000) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!existsSync(DEST) || readFileSync(DEST).length <= 10_000) {
    console.error("NO_EXPORT");
    process.exit(2);
  }
  const bytes = readFileSync(DEST).length;
  const probe = ffprobe(DEST);
  const rms = probe.hasAudio ? audioRmsAt(DEST, 0.5, Math.min(3, Math.max(0.5, probe.duration - 0.5))) : 0;
  const ok = probe.hasVideo && probe.hasAudio && rms > 0.001;
  console.log(JSON.stringify({ bytes, probe, rms, ok }, null, 2));

  if (existsSync(CERT)) {
    const report = JSON.parse(readFileSync(CERT, "utf8")) as Record<string, unknown>;
    const verdicts = (report.verdicts as Record<string, string>) ?? {};
    verdicts.FREE_LOCAL_IPHONE = ok ? "CERTIFIED" : "FAIL";
    verdicts.IPHONE_FINAL_VIDEO_AUDIO = ok ? "CERTIFIED" : probe.hasAudio ? "PARTIAL" : "FAIL";
    report.verdicts = verdicts;
    report.exports = { path: DEST, bytes, probe, rms, verifiedAt: new Date().toISOString() };
    report.PHYSICAL_IPHONE_FREE_MUSIC = ok ? "CERTIFIED" : "FAIL";
    writeFileSync(CERT, JSON.stringify(report, null, 2));
  }
  process.exit(ok ? 0 : 1);
}

void main();
