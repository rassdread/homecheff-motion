import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  assetUsageKindFromParam,
  getAssetStoryUsage,
} from "@/server/studio/studio-asset-story-usage";
import type { AssetUsageKind } from "@/types/studio-asset-usage";

async function resolveAssetName(
  kind: "character" | "prop" | "location" | "world",
  id: string,
  userId: string
): Promise<string | null> {
  if (kind === "character") {
    const row = await prisma.studioCharacter.findFirst({
      where: { id, ownerId: userId },
      select: { name: true },
    });
    return row?.name ?? null;
  }
  if (kind === "prop") {
    const row = await prisma.studioProp.findFirst({
      where: { id, ownerId: userId },
      select: { name: true },
    });
    return row?.name ?? null;
  }
  if (kind === "location") {
    const row = await prisma.studioLocation.findFirst({
      where: { id, ownerId: userId },
      select: { name: true },
    });
    return row?.name ?? null;
  }
  const row = await prisma.studioWorldProfile.findFirst({
    where: { id, ownerId: userId },
    select: { name: true },
  });
  return row?.name ?? null;
}

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";

  if (!assetUsageKindFromParam(kind) || !id) {
    return NextResponse.json(
      { error: "kind and id are required.", code: "INVALID_QUERY" },
      { status: 400 }
    );
  }

  const name = await resolveAssetName(kind, id, user.id);
  if (!name) {
    return NextResponse.json({ error: "Asset not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const usage = await getAssetStoryUsage(kind, id, name);
  return NextResponse.json({ ok: true, usage });
}
