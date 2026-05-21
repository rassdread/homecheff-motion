import { NextResponse } from "next/server";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { getProjectPlaybackDebug } from "@/server/instant-premium/playback-debug";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const debug = await getProjectPlaybackDebug(id);
  if (!debug) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(debug, { status: 200 });
}
