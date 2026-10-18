import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { voiceCatalogInputFromSearchParams } from "@/lib/studio-voice-catalog-search";
import {
  listStudioVoiceFavorites,
  setStudioVoiceFavorite,
  studioVoiceFavoriteIds,
} from "@/server/studio/studio-voice-favorites";

function pageInput(url: URL) {
  return voiceCatalogInputFromSearchParams(url);
}

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const url = new URL(request.url);
  const voiceIds = url.searchParams.get("voiceIds");
  if (voiceIds != null) {
    const favoriteIds = await studioVoiceFavoriteIds(user.id, voiceIds.split(","));
    return NextResponse.json({ favoriteIds });
  }
  const page = await listStudioVoiceFavorites(user.id, pageInput(url));
  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  let body: { providerVoiceId?: unknown; favorite?: unknown };
  try {
    body = (await request.json()) as { providerVoiceId?: unknown; favorite?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const result = await setStudioVoiceFavorite({
    userId: user.id,
    providerVoiceId: typeof body.providerVoiceId === "string" ? body.providerVoiceId : "",
    favorite: body.favorite === true,
  });
  if (result === "invalid") {
    return NextResponse.json({ error: "Invalid voice." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, favorite: result === "added" });
}
