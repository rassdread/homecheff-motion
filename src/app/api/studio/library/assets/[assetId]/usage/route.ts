import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { recordLibraryAssetUsage } from "@/server/studio-library/library-asset-service";

type Ctx = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const entityType = typeof body.entityType === "string" ? body.entityType : "";
  const entityId = typeof body.entityId === "string" ? body.entityId : "";
  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required.", code: "validation" },
      { status: 400 }
    );
  }

  const ok = await recordLibraryAssetUsage({
    assetId,
    ownerId: user.id,
    entityType,
    entityId,
    entityName: typeof body.entityName === "string" ? body.entityName : "",
    context:
      body.context && typeof body.context === "object" && !Array.isArray(body.context)
        ? (body.context as Record<string, unknown>)
        : undefined,
  });
  if (!ok) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
