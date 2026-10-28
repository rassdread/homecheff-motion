/**
 * Serves a file written by the disposable local media store.
 * Production leaves this empty because the store is off.
 */

import { NextResponse } from "next/server";
import { PLAYBACK_MEDIA_CACHE, rangedMediaResponse, readCertifiedLocalBytes } from "@/lib/studio-local-media";
import { requireActiveUser } from "@/server/auth/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { id } = await context.params;
  const found = await readCertifiedLocalBytes(id, user.id);
  if (!found) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  return rangedMediaResponse(
    found.bytes,
    request.headers.get("range"),
    found.record.mimeType || "application/octet-stream",
    PLAYBACK_MEDIA_CACHE,
  );
}
