import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
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
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const result = await generateCharacterVoicePreviewDraft({
    ownerId: user.id,
    characterName: typeof body.characterName === "string" ? body.characterName : "",
    voiceProfile: typeof body.voiceProfile === "string" ? body.voiceProfile : "warm_narrator",
    voiceLanguage: typeof body.voiceLanguage === "string" ? body.voiceLanguage : "en",
    sampleLine: typeof body.sampleLine === "string" ? body.sampleLine : undefined,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({
    ok: true,
    audioUrl: result.audioUrl,
    durationSeconds: result.durationSeconds,
    provider: result.provider,
    metadata: result.metadata,
  });
}
