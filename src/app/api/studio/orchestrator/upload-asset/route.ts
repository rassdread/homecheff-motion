import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireActiveUser } from "@/server/auth/permissions";
import { getBlobReadWriteToken } from "@/lib/vercel-blob-config";
import { buildPersistedAsset } from "@/lib/studio-orchestrator-asset-persist";
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
  if (!token) {
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
  const blob = await put(path, buffer, {
    access: "public",
    token,
    contentType: file.type || undefined,
  });

  const asset = buildPersistedAsset({
    kind,
    url: blob.url,
    storageKey: path,
    fileName: file.name,
    mimeType: file.type,
    durationSeconds: kind === "music" ? undefined : undefined,
  });

  return NextResponse.json({ ok: true, asset });
}
