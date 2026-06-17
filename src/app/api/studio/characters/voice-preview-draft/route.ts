import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateCharacterVoicePreviewDraft } from "@/server/studio/generate-character-voice-preview";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    characterName?: string;
    voiceProfile?: string;
    voiceLanguage?: string;
    sampleLine?: string;
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
    execute: () =>
      generateCharacterVoicePreviewDraft({
        ownerId: user.id,
        characterName: typeof body.characterName === "string" ? body.characterName : "",
        voiceProfile: typeof body.voiceProfile === "string" ? body.voiceProfile : "warm_narrator",
        voiceLanguage: typeof body.voiceLanguage === "string" ? body.voiceLanguage : "en",
        sampleLine: typeof body.sampleLine === "string" ? body.sampleLine : undefined,
        previewType: typeof body.previewType === "string" ? body.previewType : undefined,
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
            metadata: result.metadata,
            cacheHit: result.cacheHit,
          },
          estimatedCredits
        )
      );
    },
  });
}
