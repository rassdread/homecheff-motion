import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateCharacterVoicePreview } from "@/server/studio/generate-character-voice-preview";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: {
    language?: string;
    sampleLine?: string;
    voiceProfile?: string;
    characterName?: string;
    previewType?: string;
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  return runBilledProviderRoute({
    user,
    actionType: "voice_generation",
    relatedJobId: id,
    execute: () =>
      generateCharacterVoicePreview({
        characterId: id,
        ownerId: user.id,
        language: body.language,
        sampleLine: body.sampleLine,
        voiceProfile: body.voiceProfile,
        characterName: body.characterName,
        previewType: body.previewType,
      }),
    isFailure: (result) => "error" in result,
    skipCapture: (result) => !("error" in result) && result.cacheHit === true,
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            audioUrl: result.audioUrl,
            durationSeconds: result.durationSeconds,
            provider: result.provider,
            cacheHit: result.cacheHit,
          },
          estimatedCredits
        )
      );
    },
  });
}
