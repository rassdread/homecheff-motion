import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireActiveUser } from "@/server/auth/permissions";
import { getBlobReadWriteToken } from "@/lib/vercel-blob-config";
import { writeCertifiedLocalFile } from "@/lib/studio-local-media";
import { buildPersistedAsset } from "@/lib/studio-orchestrator-asset-persist";
import { disposableLocalDatabaseReason } from "@/server/auth/disposable-local-auth";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";
import type { HcPersistedProductionAssetKind } from "@/types/studio-video-production";

const VALID_KINDS = new Set<HcPersistedProductionAssetKind>([
  "photo",
  "photos",
  "music",
  "voice",
  "video",
  "logo",
  "product_image",
]);

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const token = getBlobReadWriteToken();
  const localStore = !token && disposableLocalDatabaseReason() === null;
  if (!token && !localStore) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kindRaw = form.get("kind")?.toString() ?? "photo";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kindRaw as HcPersistedProductionAssetKind)) {
    return NextResponse.json({ error: "Invalid asset kind" }, { status: 400 });
  }
  const kind = kindRaw as HcPersistedProductionAssetKind;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `production/${user.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  let url = "";
  let storageKey = path;
  if (localStore) {
    const stored = await writeCertifiedLocalFile({
      ownerId: user.id,
      body: buffer,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
    });
    if (!stored) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }
    url = stored.browserPath;
    storageKey = stored.browserPath;
  } else {
    if (!token) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }
    const blob = await put(path, buffer, {
      access: "public",
      token,
      contentType: file.type || undefined,
    });
    url = blob.url;
    storageKey = path;
  }

  const asset = buildPersistedAsset({
    kind,
    url,
    storageKey,
    fileName: file.name,
    mimeType: file.type,
    durationSeconds: kind === "music" ? undefined : undefined,
  });

  let libraryAssetId = "";
  if (kind === "voice") {
    const row = await upsertLibraryAsset({
      ownerId: user.id,
      family: "voice",
      title: file.name || "Voice",
      downloadUrl: url,
      previewUrl: url,
      storageKey,
      mimeType: file.type || "audio/wav",
      sourceKind: "uploaded_voice",
      sourceId: storageKey,
    });
    libraryAssetId = row.id;
  }

  return NextResponse.json({ ok: true, asset, libraryAssetId });
}
