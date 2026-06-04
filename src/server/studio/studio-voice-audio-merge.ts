/**
 * Studio V33 — merge per-speaker TTS buffers into one narration track.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

export async function concatVoiceSegmentBuffers(
  buffers: Buffer[],
  contentType: string
): Promise<{ audioBuffer: Buffer; durationSeconds: number }> {
  if (buffers.length === 0) {
    throw new Error("No voice segments to merge.");
  }
  if (buffers.length === 1) {
    return { audioBuffer: buffers[0]!, durationSeconds: estimateDurationFromBuffer(buffers[0]!) };
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-voice-merge-"));
  try {
    const listPath = path.join(workDir, "concat.txt");
    const paths: string[] = [];
    for (let i = 0; i < buffers.length; i++) {
      const ext = contentType.includes("wav") ? "wav" : "mp3";
      const partPath = path.join(workDir, `part-${i}.${ext}`);
      await fs.writeFile(partPath, buffers[i]!);
      paths.push(partPath);
    }
    await fs.writeFile(
      listPath,
      paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n"
    );
    const outPath = path.join(workDir, "merged.mp3");
    const ffmpeg = await resolveFfmpegForTextOverlay();
    const result = await runFfmpegCapture(
      ffmpeg,
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outPath,
      ],
      { timeoutMs: 120_000 }
    );
    if (result.code !== 0) {
      throw new Error(result.output?.slice(-400) ?? "Voice segment concat failed.");
    }
    const merged = await fs.readFile(outPath);
    return {
      audioBuffer: merged,
      durationSeconds: estimateDurationFromBuffer(merged),
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function estimateDurationFromBuffer(buffer: Buffer): number {
  if (buffer.length < 44) {
    return 1;
  }
  const sampleRate = buffer.readUInt32LE(24);
  const byteRate = buffer.readUInt32LE(28);
  if (byteRate > 0) {
    const dataSize = buffer.readUInt32LE(40);
    return Math.max(1, dataSize / byteRate);
  }
  if (sampleRate > 0) {
    return Math.max(1, (buffer.length - 44) / sampleRate);
  }
  return Math.max(1, buffer.length / 16000);
}
