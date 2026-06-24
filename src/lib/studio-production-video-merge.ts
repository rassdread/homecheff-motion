/**
 * FFmpeg concat merge for production batch segments.
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import {
  getResolvedFfmpegPathSync,
  mapSpawnError,
  resolveFfmpegBinaries,
} from "@/lib/ffmpeg/resolve-ffmpeg-binaries";

export async function mergeProductionVideoSegments(params: {
  segmentUrls: string[];
  outputPath: string;
  tmpDir: string;
}): Promise<{ ok: true; outputPath: string } | { ok: false; error: string }> {
  const urls = params.segmentUrls.filter((u) => u.trim());
  if (urls.length === 0) {
    return { ok: false, error: "No segments to merge" };
  }
  if (urls.length === 1) {
    return { ok: true, outputPath: urls[0]! };
  }

  await resolveFfmpegBinaries();
  await mkdir(params.tmpDir, { recursive: true });

  const localPaths: string[] = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]!;
      const localPath = path.join(params.tmpDir, `segment-${i}.mp4`);
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const res = await fetch(url);
        if (!res.ok) {
          return { ok: false, error: `Failed to fetch segment ${i + 1}` };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(localPath, buf);
      } else {
        localPaths.push(url);
        continue;
      }
      localPaths.push(localPath);
    }

    const listPath = path.join(params.tmpDir, "concat-list.txt");
    const listContent = localPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await writeFile(listPath, listContent);

    const ffmpeg = getResolvedFfmpegPathSync();
    const code = await new Promise<number>((resolve) => {
      const child = spawn(
        ffmpeg,
        ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", params.outputPath],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      child.on("error", (err) => {
        mapSpawnError(err, "ffmpeg");
        resolve(1);
      });
      child.on("close", (c) => resolve(c ?? 1));
    });

    if (code !== 0) {
      return { ok: false, error: "FFmpeg merge failed" };
    }
    return { ok: true, outputPath: params.outputPath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Merge failed",
    };
  } finally {
    await Promise.all(
      localPaths
        .filter((p) => p.includes(params.tmpDir))
        .map((p) => unlink(p).catch(() => undefined))
    );
  }
}
