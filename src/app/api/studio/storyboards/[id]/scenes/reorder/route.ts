import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { reorderStudioScenes } from "@/server/studio/studio-storyboard-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  let sceneIds: string[];
  try {
    const body = (await request.json()) as { sceneIds?: string[] };
    sceneIds = Array.isArray(body.sceneIds) ? body.sceneIds : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await reorderStudioScenes(storyboardId, user, sceneIds);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
