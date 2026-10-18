import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateCharacterVoicePreview } from "@/server/studio/generate-character-voice-preview";
import { voicePreviewChargeResponse } from "@/server/studio/voice-preview-charge-gate";
import { normalizeElevenLabsSpeechSpeed } from "@/lib/elevenlabs-speech-speed";

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
    speechSpeed?: number | string;
    confirmCharge?: boolean;
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const speechSpeed =
    body.speechSpeed == null ? undefined : normalizeElevenLabsSpeechSpeed(body.speechSpeed);
  const previewInput = {
    characterId: id,
    ownerId: user.id,
    language: body.language,
    sampleLine: body.sampleLine,
    voiceProfile: body.voiceProfile,
    characterName: body.characterName,
    previewType: body.previewType,
    speechSpeed,
  };
  const peeked = await generateCharacterVoicePreview({ ...previewInput, cacheOnly: true });
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
    relatedJobId: id,
    execute: () => generateCharacterVoicePreview(previewInput),
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
