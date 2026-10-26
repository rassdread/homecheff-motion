import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { quoteFilmSceneDialogue, startFilmSceneDialogue } from "@/server/studio/studio-film-live-generation";
import { generateSceneDialogueAudio } from "@/server/studio/studio-scene-dialogue-audio";

type Ctx = { params: Promise<{ projectId: string; sceneId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, sceneId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    forceProvider?: string;
    voiceProfile?: string;
    characterId?: string;
    clientRequestId?: string;
    confirmed?: boolean;
    attachToTimeline?: boolean;
    replaceExisting?: boolean;
  } | null;
  if (body?.action === "quote" || body?.action === "start") {
    const viewer = { id: user.id, email: user.email, role: user.role };
    const result =
      body.action === "quote"
        ? await quoteFilmSceneDialogue({
            user: viewer,
            projectId,
            sceneId,
            characterId: body.characterId,
            voiceProfile: body.voiceProfile,
          })
        : await startFilmSceneDialogue({
            user: viewer,
            projectId,
            sceneId,
            characterId: body.characterId,
            voiceProfile: body.voiceProfile,
            clientRequestId: typeof body.clientRequestId === "string" ? body.clientRequestId : "",
            confirmed: body.confirmed === true,
            attachToTimeline: body.attachToTimeline === true,
            replaceExisting: body.replaceExisting === true,
          });
    if ("error" in result) {
      return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
    }
    return NextResponse.json(result);
  }
  if (body?.forceProvider !== "mock") {
    return NextResponse.json(
      {
        error: "Live voice generation stays on the existing ElevenLabs service and wallet gate. It was not called.",
        code: "paid_provider_disabled",
      },
      { status: 409 },
    );
  }
  const result = await generateSceneDialogueAudio({
    ownerId: user.id,
    projectId,
    sceneId,
    forceProvider: "mock",
    voiceProfile: typeof body.voiceProfile === "string" ? body.voiceProfile : undefined,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
