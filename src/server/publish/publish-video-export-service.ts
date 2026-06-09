import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { applyLockedTextOverlay } from "@/server/instant-premium/locked-text-overlay";
import { publishProjectToLockedLayers } from "@/lib/publish-export";
import type { PublishProject } from "@/types/publish-overlay";

export type PublishExportResult = {
  ok: true;
  outputPath: string;
  outputUrl?: string;
  layerCount: number;
};

export async function exportPublishProjectVideo(project: PublishProject): Promise<PublishExportResult | { ok: false; error: string }> {
  const layers = publishProjectToLockedLayers(project);
  if (layers.length === 0) {
    return { ok: false, error: "No overlays to export" };
  }

  const tmpDir = path.join(os.tmpdir(), "hc-publish-export");
  await mkdir(tmpDir, { recursive: true });
  const inputPath = path.join(tmpDir, `${project.id}-input.mp4`);
  const outputPath = path.join(tmpDir, `${project.id}-final.mp4`);

  const videoRes = await fetch(project.videoUrl);
  if (!videoRes.ok) {
    return { ok: false, error: "Could not fetch source video" };
  }
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  await writeFile(inputPath, buffer);

  try {
    await applyLockedTextOverlay({
      inputVideoPath: inputPath,
      outputVideoPath: outputPath,
      layers,
      aspectRatio: "9:16",
      viduResolution: "720p",
      totalDurationMs: Math.round(project.durationSeconds * 1000),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Export failed — ffmpeg overlay unavailable",
    };
  }

  return { ok: true, outputPath, layerCount: layers.length };
}
