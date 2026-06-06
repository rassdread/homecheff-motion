import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { uploadStoryboardExternalAudio } from "@/server/studio/upload-storyboard-external-audio";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data.", code: "INVALID_FORM" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) {
    return NextResponse.json(
      { error: "Upload an audio file.", code: "AUDIO_REQUIRED" },
      { status: 400 }
    );
  }

  const displayNameEntry = form.get("displayName");
  const displayName = typeof displayNameEntry === "string" ? displayNameEntry : undefined;
  const languageEntry = form.get("language");
  const language = typeof languageEntry === "string" ? languageEntry : undefined;

  const buffer = Buffer.from(await audio.arrayBuffer());
  const result = await uploadStoryboardExternalAudio({
    storyboardId,
    viewer: user,
    audioBuffer: buffer,
    fileName: audio.name,
    mimeType: audio.type,
    displayName,
    language,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
