import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { repairMissingLibraryAsset } from "@/server/studio/library-consistency-service";
import type { LibraryConsistencyMissingAsset } from "@/types/library-consistency";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }

  let body: {
    ownerId?: string;
    item?: LibraryConsistencyMissingAsset;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const ownerId = body.ownerId?.trim() || admin.id;
  const item = body.item;

  if (!item?.storageKey || !item.assetUrl) {
    return NextResponse.json({ ok: false, error: "item with storageKey and assetUrl required." }, { status: 400 });
  }

  const record = await repairMissingLibraryAsset(ownerId, admin.id, item);
  return NextResponse.json({ ok: true, record });
}
