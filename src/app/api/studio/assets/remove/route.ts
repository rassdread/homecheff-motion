import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { applyAssetRemove } from "@/server/studio/studio-asset-lifecycle-service";
import type { AssetRemoveMode, AssetRemoveRequest, StudioAssetKind } from "@/types/studio-asset-lifecycle";

const REMOVE_MODES: AssetRemoveMode[] = ["hide", "archive", "delete"];
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

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: Partial<AssetRemoveRequest>;
  try {
    body = (await request.json()) as Partial<AssetRemoveRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const assetId = body.assetId?.trim() ?? "";
  const assetKind = body.assetKind;
  const removeMode = body.removeMode;

  if (!assetId || !assetKind || !removeMode) {
    return NextResponse.json(
      { error: "assetId, assetKind, and removeMode are required.", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  if (!ASSET_KINDS.includes(assetKind) || !REMOVE_MODES.includes(removeMode)) {
    return NextResponse.json({ error: "Invalid assetKind or removeMode.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await applyAssetRemove(user.id, {
    assetId,
    assetKind,
    storageKey: body.storageKey,
    removeMode,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.eligibility === "system_protected" ? 403 : 409,
    });
  }

  return NextResponse.json(result);
}
