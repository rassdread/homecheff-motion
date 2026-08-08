import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { linkLibraryAssets } from "@/server/studio-library/library-asset-service";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const fromAssetId = typeof body.fromAssetId === "string" ? body.fromAssetId : "";
  const toAssetId = typeof body.toAssetId === "string" ? body.toAssetId : "";
  const relationType = typeof body.relationType === "string" ? body.relationType : "";
  if (!fromAssetId || !toAssetId || !relationType) {
    return NextResponse.json(
      { error: "fromAssetId, toAssetId, relationType required.", code: "validation" },
      { status: 400 }
    );
  }

  const ok = await linkLibraryAssets({
    ownerId: user.id,
    fromAssetId,
    toAssetId,
    relationType,
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  });
  if (!ok) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
