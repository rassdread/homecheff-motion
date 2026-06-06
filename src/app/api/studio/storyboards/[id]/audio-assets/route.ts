import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { linkStoryboardAudioAssets } from "@/server/studio/link-storyboard-audio-assets";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: { musicAssetId?: string | null; soundAssetId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await linkStoryboardAudioAssets({
    storyboardId: id,
    viewer: user,
    musicAssetId: body.musicAssetId,
    soundAssetId: body.soundAssetId,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, links: result.links });
}
