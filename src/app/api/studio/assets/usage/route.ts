import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getRegistryAssetUsage } from "@/server/studio/studio-asset-registry-usage-service";
import type { StudioAssetKind } from "@/types/studio-asset-lifecycle";

const ASSET_KINDS: StudioAssetKind[] = [
  "upload",
  "generated_reference",
  "character",
  "prop",
  "location",
  "world",
  "audio",
  "voice",
  "video",
];

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId")?.trim() ?? "";
  const assetKind = url.searchParams.get("assetKind")?.trim() as StudioAssetKind;
  const storageKey = url.searchParams.get("storageKey");
  const generationId = url.searchParams.get("generationId");

  if (!assetId || !ASSET_KINDS.includes(assetKind)) {
    return NextResponse.json(
      { error: "assetId and valid assetKind are required.", code: "INVALID_QUERY" },
      { status: 400 }
    );
  }

  const usage = await getRegistryAssetUsage({
    userId: user.id,
    assetKind,
    assetId,
    storageKey,
    generationId,
  });

  return NextResponse.json({ ok: true, usage });
}
