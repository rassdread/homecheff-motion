/**
 * Streams a library file that certification stored on the local disk.
 * HTTPS blob URLs redirect. Production does not read local paths.
 */

import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { localPathIfAllowed, PLAYBACK_MEDIA_CACHE, rangedMediaResponse } from "@/lib/studio-local-media";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";

type Ctx = { params: Promise<{ projectId: string; assetId: string }> };

export async function GET(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, assetId } = await context.params;
  const asset = await prisma.studioLibraryAsset.findFirst({
    where: { id: assetId, projectId, ownerId: user.id, deletedAt: null },
    select: { downloadUrl: true, mimeType: true },
  });
  if (!asset) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  if (asset.downloadUrl.startsWith("https://")) {
    return NextResponse.redirect(asset.downloadUrl);
  }
  const local = localPathIfAllowed(asset.downloadUrl);
  if (!local) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  const bytes = await readFile(local);
  const type = asset.mimeType || (local.endsWith(".wav") ? "audio/wav" : "video/mp4");
  return rangedMediaResponse(bytes, request.headers.get("range"), type, PLAYBACK_MEDIA_CACHE);
}
