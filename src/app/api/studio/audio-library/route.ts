import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getOwnerAudioLibrary } from "@/server/studio/studio-user-audio-library-service";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const assets = await getOwnerAudioLibrary(user.id);
  return NextResponse.json({ assets });
}
