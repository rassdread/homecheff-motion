/**
 * Serves a file written by the disposable local media store.
 * Production leaves this empty because the store is off.
 */

import { NextResponse } from "next/server";
import { readCertifiedLocalBytes } from "@/lib/studio-local-media";
import { requireActiveUser } from "@/server/auth/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { id } = await context.params;
  const found = await readCertifiedLocalBytes(id, user.id);
  if (!found) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  return new NextResponse(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.record.mimeType || "application/octet-stream",
      "Content-Length": String(found.bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
