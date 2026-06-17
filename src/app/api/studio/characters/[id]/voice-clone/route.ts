import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { cloneCharacterVoice } from "@/server/studio/clone-character-voice";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: characterId } = await context.params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data.", code: "INVALID_FORM" }, { status: 400 });
  }

  const sample = form.get("sample");
  if (!(sample instanceof File) || sample.size <= 0) {
    return NextResponse.json(
      { error: "Upload a voice sample file.", code: "SAMPLE_REQUIRED" },
      { status: 400 }
    );
  }

  const consentRaw = form.get("consentConfirmed");
  const consentConfirmed =
    consentRaw === "true" || consentRaw === "1" || consentRaw === "on";
  const voiceNameEntry = form.get("voiceName");
  const voiceName = typeof voiceNameEntry === "string" ? voiceNameEntry : "";
  const voiceLockRaw = form.get("voiceLock");
  const voiceLock = voiceLockRaw === "true" || voiceLockRaw === "1";
  const languageEntry = form.get("language");
  const language = typeof languageEntry === "string" ? languageEntry : undefined;
  const forceMock = process.env.NODE_ENV === "test" || form.get("mock") === "true";

  const buffer = Buffer.from(await sample.arrayBuffer());

  return runBilledProviderRoute({
    user,
    actionType: "voice_clone",
    relatedJobId: characterId,
    execute: () =>
      cloneCharacterVoice({
        characterId,
        viewer: user,
        sampleBuffer: buffer,
        fileName: sample.name,
        mimeType: sample.type,
        voiceName,
        consentConfirmed,
        voiceLock: voiceLockRaw != null ? voiceLock : undefined,
        language: language ?? undefined,
        forceProvider: forceMock ? "mock" : undefined,
      }),
    isFailure: (result) => "error" in result,
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      return NextResponse.json(withEstimatedCredits({ ok: true, ...result.data }, estimatedCredits));
    },
  });
}
