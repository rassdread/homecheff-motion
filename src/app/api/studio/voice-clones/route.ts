import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createUserVoiceClone } from "@/server/studio/create-user-voice-clone";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

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
  const languageEntry = form.get("language");
  const language = typeof languageEntry === "string" ? languageEntry : undefined;
  const linkCharacterIdEntry = form.get("linkCharacterId");
  const linkCharacterId =
    typeof linkCharacterIdEntry === "string" ? linkCharacterIdEntry.trim() : undefined;
  const voiceLockRaw = form.get("voiceLock");
  const voiceLock = voiceLockRaw === "true" || voiceLockRaw === "1";
  const forceMock = process.env.NODE_ENV === "test" || form.get("mock") === "true";

  const buffer = Buffer.from(await sample.arrayBuffer());
  const result = await createUserVoiceClone({
    viewer: user,
    sampleBuffer: buffer,
    fileName: sample.name,
    mimeType: sample.type,
    voiceName,
    consentConfirmed,
    language,
    linkCharacterId: linkCharacterId || undefined,
    voiceLock: voiceLockRaw != null ? voiceLock : undefined,
    forceProvider: forceMock ? "mock" : undefined,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
