import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { linkCharacterVoiceReference } from "@/server/studio/link-character-voice-reference";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: characterId } = await context.params;

  let body: { audioUrl?: string; language?: string; label?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await linkCharacterVoiceReference({
    characterId,
    viewer: user,
    audioUrl: body.audioUrl ?? "",
    language: body.language,
    label: body.label,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
