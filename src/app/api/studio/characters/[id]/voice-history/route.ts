import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getStudioCharacterByIdForViewer } from "@/server/studio/studio-character-service";
import { listCharacterVoiceHistory } from "@/server/studio/studio-character-voice-history";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const character = await getStudioCharacterByIdForViewer(id, user);
  if (!character) {
    return NextResponse.json({ error: "Character not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const entries = await listCharacterVoiceHistory(id);
  return NextResponse.json({ entries }, { status: 200 });
}
