import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getHomeCheffProjectRecord } from "@/server/projects/homecheff-project-service";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const { id } = await context.params;
  const record = await getHomeCheffProjectRecord(user.id, id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = record.manifestJson as HomeCheffProjectPackage;
  return NextResponse.json({ ok: true, project });
}
