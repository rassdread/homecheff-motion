import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listLibraryConsistencyRecords } from "@/server/studio/library-consistency-manifest-blob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const limit = Math.min(40, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));

  const records = await listLibraryConsistencyRecords(user.id, limit);
  return NextResponse.json({ ok: true, records });
}
