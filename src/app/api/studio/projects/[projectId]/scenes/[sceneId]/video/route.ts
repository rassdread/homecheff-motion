import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { handoffSceneImageToVideo } from "@/server/studio/studio-scene-video-handoff";

type Ctx = { params: Promise<{ projectId: string; sceneId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, sceneId } = await context.params;
  const body = (await request.json().catch(() => null)) as { sceneImageId?: string; forceProvider?: string } | null;
  if (body?.forceProvider && body.forceProvider !== "mock") {
    return NextResponse.json(
      {
        error: "Live image-to-video stays on the existing animation job and wallet gate. It was not called.",
        code: "paid_provider_disabled",
      },
      { status: 409 },
    );
  }
  const result = await handoffSceneImageToVideo({
    ownerId: user.id,
    projectId,
    sceneId,
    sceneImageId: typeof body?.sceneImageId === "string" ? body.sceneImageId : "",
    forceProvider: body?.forceProvider === "mock" ? "mock" : undefined,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
