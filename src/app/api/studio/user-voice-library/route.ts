import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildUserVoiceLibrary } from "@/lib/studio-user-voice-library";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const library = await buildUserVoiceLibrary(user.id);
  return NextResponse.json({ library });
}
