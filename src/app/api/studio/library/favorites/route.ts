import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  listFavoritesForOwner,
  setFavorite,
} from "@/server/studio-library/library-favorites-service";
import {
  STUDIO_FAVORITE_TARGET_KINDS,
  type StudioFavoriteTargetKind,
} from "@/lib/studio-library-types";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const rows = await listFavoritesForOwner(user.id);
  return NextResponse.json({
    favorites: rows.map((f) => ({
      id: f.id,
      targetKind: f.targetKind,
      targetId: f.targetId,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const targetKind = typeof body.targetKind === "string" ? body.targetKind : "";
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const favorite = body.favorite !== false;
  if (!(STUDIO_FAVORITE_TARGET_KINDS as readonly string[]).includes(targetKind) || !targetId) {
    return NextResponse.json({ error: "Invalid favorite target.", code: "validation" }, { status: 400 });
  }

  const result = await setFavorite({
    ownerId: user.id,
    targetKind: targetKind as StudioFavoriteTargetKind,
    targetId,
    favorite,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid target.", code: "validation" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, favorite });
}
