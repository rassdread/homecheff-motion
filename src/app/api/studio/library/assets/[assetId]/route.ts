import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  archiveLibraryAsset,
  getLibraryAssetForOwner,
  inspectLibraryAssetDependencies,
  restoreLibraryAsset,
  setLibraryAssetFavorite,
} from "@/server/studio-library/library-asset-service";
import { serializeLibraryAsset } from "@/server/studio-library/serialize";

type Ctx = { params: Promise<{ assetId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;
  const inspected = await inspectLibraryAssetDependencies({ assetId, ownerId: user.id });
  if (!inspected) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    asset: serializeLibraryAsset(inspected.asset),
    dependencies: inspected.dependencies,
  });
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  if (body.favorite === true || body.favorite === false) {
    const row = await setLibraryAssetFavorite({
      assetId,
      ownerId: user.id,
      favorite: body.favorite,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ asset: serializeLibraryAsset(row) });
  }

  if (body.status === "archived") {
    const row = await archiveLibraryAsset(assetId, user.id);
    if (!row) {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ asset: serializeLibraryAsset(row) });
  }

  if (body.status === "active") {
    const row = await restoreLibraryAsset(assetId, user.id);
    if (!row) {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ asset: serializeLibraryAsset(row) });
  }

  const existing = await getLibraryAssetForOwner(assetId, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ asset: serializeLibraryAsset(existing) });
}
