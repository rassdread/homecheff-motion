import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listOwnedProjectMedia } from "@/server/studio/studio-owned-project-media";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const media = await listOwnedProjectMedia(user.id);
  return NextResponse.json({ ok: true, ...media });
}
