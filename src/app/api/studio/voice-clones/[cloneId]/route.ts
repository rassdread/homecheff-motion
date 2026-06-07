import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { renameUserVoiceClone } from "@/lib/studio-user-voice-library";

type RouteContext = { params: Promise<{ cloneId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { cloneId } = await context.params;
  let body: { name?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required.", code: "NAME_REQUIRED" }, { status: 400 });
  }

  const updated = await renameUserVoiceClone({
    ownerId: user.id,
    cloneId,
    name,
  });

  if (!updated) {
    return NextResponse.json({ error: "Clone not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, voice: updated });
}
