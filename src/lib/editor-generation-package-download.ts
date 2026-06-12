import { triggerBrowserDownload } from "@/lib/editor-export-download";
import { buildStoreZip } from "@/lib/store-zip";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

export type EditorDownloadFormat = "png" | "jpg";

function extensionFromUrl(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() ?? "png";
}

function filenameStem(workflow: string, label: string): string {
  const safe = label.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "result";
  const wf = workflow.replace(/[^a-z0-9-_]+/gi, "-") || "editor";
  return `${wf}-${safe}`;
}

export async function fetchUrlAsBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch asset: ${url}`);
  }
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function downloadGenerationImage(
  url: string,
  options: { workflow?: string; label?: string; format?: EditorDownloadFormat } = {}
): Promise<void> {
  const ext = options.format ?? extensionFromUrl(url);
  const filename = `${filenameStem(options.workflow ?? "editor", options.label ?? "image")}.${ext}`;
  triggerBrowserDownload(url, filename);
}

export async function downloadGenerationVideo(
  url: string,
  options: { workflow?: string; label?: string } = {}
): Promise<void> {
  const ext = extensionFromUrl(url) === "webm" ? "webm" : "mp4";
  const filename = `${filenameStem(options.workflow ?? "editor", options.label ?? "animation")}.${ext}`;
  triggerBrowserDownload(url, filename);
}

export function buildGenerationPackageMetadataJson(pkg: EditorGenerationPackage): Uint8Array {
  const payload = {
    version: 1,
    id: pkg.id,
    editorSessionId: pkg.editorSessionId,
    workflow: pkg.workflow,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    motionDurationSec: pkg.motionDurationSec,
    transformationSessionId: pkg.transformationSessionId,
    orderedFrameUrls: pkg.orderedFrameUrls,
    sourceReferences: pkg.sourceReferences,
    metadataSnapshot: pkg.metadataSnapshot,
    assets: {
      generatedImages: pkg.generatedImages,
      sequenceFrames: pkg.sequenceFrames,
      thumbnails: pkg.thumbnails,
      motionOutputs: pkg.motionOutputs,
      exportOutputs: pkg.exportOutputs,
    },
  };
  return new TextEncoder().encode(JSON.stringify(payload, null, 2));
}

export async function buildGenerationPackageZip(pkg: EditorGenerationPackage): Promise<Blob> {
  const entries: Array<{ path: string; data: Uint8Array }> = [
    { path: "metadata/metadata.json", data: buildGenerationPackageMetadataJson(pkg) },
  ];

  let imageIndex = 0;
  for (const asset of pkg.generatedImages) {
    imageIndex += 1;
    const ext = extensionFromUrl(asset.url);
    entries.push({
      path: `images/image-${imageIndex}.${ext}`,
      data: await fetchUrlAsBytes(asset.url),
    });
  }

  for (const frame of pkg.sequenceFrames) {
    const idx = (frame.stepIndex ?? 0) + 1;
    const ext = extensionFromUrl(frame.url);
    entries.push({
      path: `sequence/step-${String(idx).padStart(2, "0")}.${ext}`,
      data: await fetchUrlAsBytes(frame.url),
    });
  }

  for (const [i, video] of pkg.motionOutputs.entries()) {
    const ext = extensionFromUrl(video.url);
    entries.push({
      path: `video/motion-${i + 1}.${ext}`,
      data: await fetchUrlAsBytes(video.url),
    });
  }

  const zipBytes = buildStoreZip(entries);
  return new Blob([Uint8Array.from(zipBytes)], { type: "application/zip" });
}

export async function downloadGenerationPackageZip(pkg: EditorGenerationPackage): Promise<void> {
  const blob = await buildGenerationPackageZip(pkg);
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, `${filenameStem(pkg.workflow, "GenerationPackage")}.zip`);
  URL.revokeObjectURL(url);
}

export async function downloadSequenceFramesZip(pkg: EditorGenerationPackage): Promise<void> {
  const frames = pkg.sequenceFrames.length ? pkg.sequenceFrames : pkg.generatedImages;
  if (!frames.length) {
    throw new Error("No sequence frames to download");
  }
  const entries = await Promise.all(
    frames.map(async (frame, index) => {
      const idx = (frame.stepIndex ?? index) + 1;
      const ext = extensionFromUrl(frame.url);
      return {
        path: `sequence/step-${String(idx).padStart(2, "0")}.${ext}`,
        data: await fetchUrlAsBytes(frame.url),
      };
    })
  );
  entries.push({ path: "metadata/metadata.json", data: buildGenerationPackageMetadataJson(pkg) });
  const zipBytes = buildStoreZip(entries);
  const blob = new Blob([Uint8Array.from(zipBytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, `${filenameStem(pkg.workflow, "sequence-frames")}.zip`);
  URL.revokeObjectURL(url);
}

export function primaryResultUrlFromPackage(pkg: EditorGenerationPackage): string | undefined {
  return (
    pkg.motionOutputs[0]?.url ??
    pkg.sequenceFrames.at(-1)?.url ??
    pkg.generatedImages[0]?.url ??
    pkg.thumbnails[0]?.url
  );
}
