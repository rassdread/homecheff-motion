import { Buffer } from "node:buffer";
import sharp from "sharp";
import { resolvePrintSettings, printDimensionsPixels } from "@/lib/editor-print-export";
import { resolveProductionOutputSpec } from "@/lib/production-output-profiles";
import { isBlobTokenConfigured, uploadPublicBlob } from "@/lib/vercel-blob-config";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorRenderedFile = {
  format: string;
  mimeType: string;
  url: string;
  storageKey: string;
  width: number;
  height: number;
  bytes: number;
};

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadRendered(
  sessionId: string,
  label: string,
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<EditorRenderedFile> {
  if (!isBlobTokenConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
  const uploaded = await uploadPublicBlob({
    pathname: `editor/exports/${sessionId}/${label}.${extension}`,
    body: buffer,
    contentType,
    addRandomSuffix: true,
    context: {
      uploadTarget: `editor/exports/${sessionId}/${label}.${extension}`,
      provider: "editor-export",
    },
  });
  const meta = await sharp(buffer).metadata();
  return {
    format: extension,
    mimeType: contentType,
    url: uploaded.url,
    storageKey: uploaded.pathname,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: buffer.byteLength,
  };
}

export async function renderEditorProductionFiles(
  document: EditorCanvasDocument,
  formats: Array<"png" | "jpg" | "webp"> = ["png", "jpg", "webp"]
): Promise<EditorRenderedFile[]> {
  const spec = resolveProductionOutputSpec("web_ready");
  const width = document.exportSettings?.production?.width ?? spec.recommendedWidth;
  const height = document.exportSettings?.production?.height ?? spec.recommendedHeight;
  const source = await fetchImageBuffer(document.backgroundUrl);
  const files: EditorRenderedFile[] = [];

  for (const format of formats) {
    let pipeline = sharp(source).resize(width, height, { fit: "inside", withoutEnlargement: false });
    if (format === "jpg") {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else if (format === "webp") {
      pipeline = pipeline.webp({ quality: 90 });
    } else {
      pipeline = pipeline.png();
    }
    const buffer = await pipeline.toBuffer();
    files.push(
      await uploadRendered(
        document.sessionId,
        `production_${format}`,
        buffer,
        format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png",
        format
      )
    );
  }
  return files;
}

export async function renderEditorPrintPng(document: EditorCanvasDocument): Promise<EditorRenderedFile> {
  const settings = resolvePrintSettings(document);
  const dims = printDimensionsPixels(settings);
  const source = await fetchImageBuffer(document.backgroundUrl);
  const buffer = await sharp(source)
    .resize(dims.width, dims.height, { fit: "cover" })
    .png()
    .toBuffer();
  return uploadRendered(document.sessionId, "print", buffer, "image/png", "png");
}

export async function renderEditorGif(document: EditorCanvasDocument): Promise<EditorRenderedFile> {
  const width = document.quickMotionConfig?.width ?? 512;
  const height = document.quickMotionConfig?.height ?? 512;
  const source = await fetchImageBuffer(document.backgroundUrl);
  const frame = await sharp(source).resize(width, height, { fit: "inside" }).png().toBuffer();
  const gifBuffer = await sharp(frame, { animated: false }).gif().toBuffer();
  return uploadRendered(document.sessionId, "quick_motion", gifBuffer, "image/gif", "gif");
}

export async function renderMotionReadyManifest(document: EditorCanvasDocument): Promise<{
  manifestUrl: string;
  files: EditorRenderedFile[];
  cutoutUrls: string[];
}> {
  const cutoutUrls = (document.cutoutAssets ?? []).map((c) => c.cutoutUrl).filter(Boolean);
  const manifest = {
    sessionId: document.sessionId,
    backgroundUrl: document.backgroundUrl,
    cutouts: document.cutoutAssets ?? [],
    importedLayers: document.importedLayers ?? [],
    handoff: document.studioMotionHandoff,
    createdAt: new Date().toISOString(),
  };
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const manifestFile = await uploadRendered(
    document.sessionId,
    "motion_manifest",
    manifestBuffer,
    "application/json",
    "json"
  );
  const files: EditorRenderedFile[] = [manifestFile];
  if (document.backgroundUrl) {
    try {
      const preview = await renderEditorProductionFiles(document, ["png"]);
      files.push(...preview);
    } catch {
      /* preview optional */
    }
  }
  return { manifestUrl: manifestFile.url, files, cutoutUrls };
}
