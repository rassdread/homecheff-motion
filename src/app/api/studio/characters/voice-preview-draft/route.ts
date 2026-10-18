import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { normalizeElevenLabsSpeechSpeed } from "@/lib/elevenlabs-speech-speed";
import { generateCharacterVoicePreviewDraft } from "@/server/studio/generate-character-voice-preview";
import { voicePreviewChargeResponse } from "@/server/studio/voice-preview-charge-gate";

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
    speechSpeed?: number | string;
    confirmCharge?: boolean;
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const draftInput = {
    ownerId: user.id,
    characterName: typeof body.characterName === "string" ? body.characterName : "",
    voiceProfile: typeof body.voiceProfile === "string" ? body.voiceProfile : "warm_narrator",
    voiceLanguage: typeof body.voiceLanguage === "string" ? body.voiceLanguage : "en",
    sampleLine: typeof body.sampleLine === "string" ? body.sampleLine : undefined,
    previewType: typeof body.previewType === "string" ? body.previewType : undefined,
    speechSpeed:
      body.speechSpeed == null ? undefined : normalizeElevenLabsSpeechSpeed(body.speechSpeed),
  };
  const peeked = await generateCharacterVoicePreviewDraft({ ...draftInput, cacheOnly: true });
  if ("error" in peeked) {
    return NextResponse.json(
      { error: peeked.error.message, code: peeked.error.code },
      { status: peeked.error.httpStatus }
    );
  }
  if (peeked.cacheHit) {
    return NextResponse.json({
      ok: true,
      audioUrl: peeked.audioUrl,
      durationSeconds: peeked.durationSeconds,
      provider: peeked.provider,
      cacheHit: true,
      cached: true,
      free: true,
      credits: 0,
    });
  }
  const confirmation = await voicePreviewChargeResponse({
    userId: user.id,
    confirmCharge: body.confirmCharge === true,
    cacheHit: false,
  });
  if (confirmation) return confirmation;

  return runBilledProviderRoute({
    user,
    actionType: "voice_generation",
    confirmed: true,
    execute: () => generateCharacterVoicePreviewDraft(draftInput),
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
