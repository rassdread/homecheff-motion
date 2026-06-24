import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { applyLockedTextOverlay } from "@/server/instant-premium/locked-text-overlay";
import { publishProjectToLockedLayers } from "@/lib/publish-export";
import { isPhotoStoryProject, isSlideshowProject } from "@/lib/publish-photo-story";
import { isPublishAiEverythingProject } from "@/lib/publish-ai-everything";
import { isAudioWithImageProject, isVoiceMessageProject } from "@/lib/publish-audio-workflows";
import { renderPublishStoryBaseVideo } from "@/server/publish/publish-story-render";
import { applyPublishAudioMux, publishProjectNeedsAudioMux } from "@/server/publish/publish-audio-export-mux";
import type { PublishProject } from "@/types/publish-overlay";

export type PublishExportResult = {
  ok: true;
  outputPath: string;
  outputUrl?: string;
  layerCount: number;
  renderMode: "story_ffmpeg" | "video_overlay" | "story_stub";
};

function isStoryRenderWorkflow(project: PublishProject): boolean {
  const renderMode = project.metadata?.renderMode as string | undefined;
  return (
    isPhotoStoryProject(project) ||
    isSlideshowProject(project) ||
    isPublishAiEverythingProject(project) ||
    isVoiceMessageProject(project) ||
    isAudioWithImageProject(project) ||
    renderMode === "ken_burns" ||
    renderMode === "slideshow" ||
    renderMode === "voice_message"
  );
}

export async function exportPublishProjectVideo(
  project: PublishProject
): Promise<PublishExportResult | { ok: false; error: string }> {
  const tmpDir = path.join(os.tmpdir(), "hc-publish-export", project.id);
  await mkdir(tmpDir, { recursive: true });
  const outputPath = path.join(tmpDir, `${project.id}-final.mp4`);
  const layers = publishProjectToLockedLayers(project);

  if (isStoryRenderWorkflow(project)) {
    try {
      const basePath = path.join(tmpDir, `${project.id}-base.mp4`);
      await renderPublishStoryBaseVideo(project, tmpDir, basePath);

      if (layers.length === 0) {
        return {
          ok: true,
          outputPath: basePath,
          layerCount: 0,
          renderMode: "story_ffmpeg",
        };
      }

      try {
        await applyLockedTextOverlay({
          inputVideoPath: basePath,
          outputVideoPath: outputPath,
          layers,
          aspectRatio: "9:16",
          viduResolution: "720p",
          totalDurationMs: Math.round(project.durationSeconds * 1000),
        });
        return { ok: true, outputPath, layerCount: layers.length, renderMode: "story_ffmpeg" };
      } catch {
        return { ok: true, outputPath: basePath, layerCount: 0, renderMode: "story_ffmpeg" };
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Story render failed — ffmpeg unavailable on this host",
      };
    }
  }

  if (layers.length === 0 && !project.videoUrl) {
    return { ok: false, error: "No overlays to export" };
  }

  if (!project.videoUrl) {
    return { ok: false, error: "Video export requires a source video" };
  }

  const inputPath = path.join(tmpDir, `${project.id}-input.mp4`);
  const { writeFile } = await import("node:fs/promises");
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

  let finalPath = outputPath;
  if (publishProjectNeedsAudioMux(project)) {
    const audioMux = await applyPublishAudioMux({
      project,
      videoPath: outputPath,
      tmpDir,
    });
    if (!audioMux.ok) {
      return { ok: false, error: `Audio export failed: ${audioMux.error}` };
    }
    finalPath = audioMux.outputPath;
  }

  return { ok: true, outputPath: finalPath, layerCount: layers.length, renderMode: "video_overlay" };
}
