import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getHomeCheffProjectRecord, validateServerAssetAccess } from "@/server/projects/homecheff-project-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const { id } = await context.params;
  const assetId = new URL(request.url).searchParams.get("assetId") ?? "";

  const record = await getHomeCheffProjectRecord(user.id, id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (assetId) {
    const allowed = await validateServerAssetAccess(id, assetId);
    return NextResponse.json({ ok: allowed, assetId, projectId: id });
  }

  return NextResponse.json({
    ok: true,
    projectId: id,
    assetCount: record.assetRefs.length,
    currentService: record.currentService,
  });
}
