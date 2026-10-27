import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { openLegacyRecordInStudio } from "@/server/studio/studio-v24-history";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown } | null;
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!kind || !id) {
    return NextResponse.json({ error: "kind and id are required.", code: "validation" }, { status: 400 });
  }
  const opened = await openLegacyRecordInStudio(user.id, kind, id);
  if (!opened) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json(opened);
}
