/**
 * Puts a finished MP4 in the existing library.
 * Does not reserve credits, does not overwrite a blob that is already stored,
 * and does not create a second row for the same source.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/prisma";
import { localMediaDir, safeLocalFileName } from "@/lib/studio-local-media";
import { uploadPublicBlob, resolvePublicBlobUrlByPathname } from "@/lib/vercel-blob-config";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";

const COLLECTION_NAME = "Studio Development Tests";

export async function publishLibraryVideo(input: {
  ownerId: string;
  sourceKind: "development_test_film" | "timeline_export";
  sourceId: string;
  title: string;
  description: string;
  bytes?: Buffer;
  projectId?: string | null;
  durationSeconds: number;
  width: number;
  height: number;
  language?: string;
  metadata: Record<string, unknown>;
}): Promise<{ assetId: string; url: string; created: boolean }> {
  const existing = await prisma.studioLibraryAsset.findUnique({
    where: {
      ownerId_sourceKind_sourceId: {
        ownerId: input.ownerId,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
      },
    },
  });
  if (existing && existing.deletedAt == null && (existing.downloadUrl.startsWith("https://") || existing.downloadUrl.startsWith("file:"))) {
    if (input.sourceKind === "development_test_film") {
      await ensureDevelopmentCollection(input.ownerId, existing.id);
    }
    return { assetId: existing.id, url: existing.downloadUrl, created: false };
  }
  if (!input.bytes || input.bytes.length === 0) {
    throw new Error("The film file is missing, so nothing was stored.");
  }
  const pathname = `production/${input.ownerId}/${input.sourceKind}/${input.sourceId}.mp4`;
  const localDir = localMediaDir();
  let url = "";
  if (localDir) {
    await mkdir(localDir, { recursive: true });
    const filePath = path.join(localDir, `${input.sourceKind}-${safeLocalFileName(input.sourceId)}.mp4`);
    await writeFile(filePath, input.bytes);
    url = pathToFileURL(filePath).href;
  } else {
  url = (await resolvePublicBlobUrlByPathname(pathname)) ?? "";
  if (!url) {
    const uploaded = await uploadPublicBlob({
      pathname,
      body: input.bytes,
      contentType: "video/mp4",
      addRandomSuffix: false,
      allowOverwrite: false,
      context: {
        projectId: input.projectId ?? undefined,
        requestId: input.sourceId,
        uploadTarget: input.sourceKind,
        provider: "ffmpeg",
      },
    });
    url = uploaded.url;
  }
  }
  const row = await upsertLibraryAsset({
    ownerId: input.ownerId,
    projectId: input.projectId ?? null,
    family: "video",
    category: input.sourceKind === "development_test_film" ? "development-test" : "timeline-export",
    title: input.title,
    description: input.description,
    tags: ["studio-development", input.sourceKind],
    origin: "uploaded",
    previewUrl: url,
    downloadUrl: url,
    storageKey: pathname,
    mimeType: "video/mp4",
    backingStore: "blob_manifest",
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    creditsSpent: 0,
    width: input.width,
    height: input.height,
    durationSeconds: input.durationSeconds,
    language: input.language ?? "",
    aspectRatio: input.width > input.height ? "16:9" : "9:16",
    metadata: input.metadata,
  });
  if (input.sourceKind === "development_test_film") {
    await ensureDevelopmentCollection(input.ownerId, row.id);
  }
  return { assetId: row.id, url, created: existing == null };
}

async function ensureDevelopmentCollection(ownerId: string, assetId: string): Promise<void> {
  let collection = await prisma.studioAssetCollection.findFirst({
    where: { ownerId, name: COLLECTION_NAME },
    select: { id: true },
  });
  if (!collection) {
    collection = await prisma.studioAssetCollection.create({
      data: {
        ownerId,
        name: COLLECTION_NAME,
        description: "Completed HomeCheff Studio development renders.",
        labelKey: "studio-development-tests",
      },
      select: { id: true },
    });
  }
  await prisma.studioAssetCollectionMember.upsert({
    where: { collectionId_assetId: { collectionId: collection.id, assetId } },
    create: { collectionId: collection.id, assetId },
    update: {},
  });
}
