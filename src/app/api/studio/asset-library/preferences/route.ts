import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  preferencesToResponse,
  readAssetLibraryPreferencesManifest,
  recordAssetLibraryRecent,
  recordVoiceLibraryRecent,
  setVoiceFavorite,
  toggleAssetFavorite,
} from "@/server/studio/studio-asset-library-preferences-blob";

export async function GET() {
  const viewer = await requireActiveUser();
  if (viewer instanceof NextResponse) {
    return viewer;
  }
  const manifest = await readAssetLibraryPreferencesManifest(viewer.id);
  return NextResponse.json({ ok: true, data: preferencesToResponse(manifest) });
}

export async function PATCH(req: Request) {
  const viewer = await requireActiveUser();
  if (viewer instanceof NextResponse) {
    return viewer;
  }
  const body = (await req.json()) as {
    action?: string;
    assetId?: string;
    voiceRef?: string;
    favorite?: boolean;
    note?: string;
  };

  if (body.action === "toggle_favorite" && body.assetId) {
    const favorites = await toggleAssetFavorite({
      ownerId: viewer.id,
      assetId: body.assetId,
      favorite: body.favorite !== false,
    });
    return NextResponse.json({ ok: true, data: { favorites } });
  }

  if (body.action === "toggle_voice_favorite" && body.voiceRef) {
    const voiceFavorites = await setVoiceFavorite({
      ownerId: viewer.id,
      voiceRef: body.voiceRef,
      favorite: body.favorite !== false,
      note: body.note,
    });
    return NextResponse.json({ ok: true, data: { voiceFavorites } });
  }

  if (body.action === "record_recent" && body.assetId) {
    await recordAssetLibraryRecent({ ownerId: viewer.id, assetId: body.assetId });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "record_voice_recent" && body.voiceRef) {
    await recordVoiceLibraryRecent({ ownerId: viewer.id, voiceRef: body.voiceRef });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}
