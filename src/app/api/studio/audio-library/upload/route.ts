import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { uploadOwnerAudioLibraryAsset } from "@/server/studio/studio-user-audio-library-service";
import type { UserAudioLibraryAssetKind } from "@/types/studio-user-audio-library";

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

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) {
    return NextResponse.json(
      { error: "Upload an audio file.", code: "AUDIO_REQUIRED" },
      { status: 400 }
    );
  }

  const kindRaw = form.get("kind");
  const kind: UserAudioLibraryAssetKind =
    kindRaw === "sfx" ? "sfx" : "music";
  const name = typeof form.get("name") === "string" ? form.get("name") as string : "";
  const category = typeof form.get("category") === "string" ? form.get("category") as string : "";
  const mood = typeof form.get("mood") === "string" ? form.get("mood") as string : "";
  const energy = typeof form.get("energy") === "string" ? form.get("energy") as string : "";

  const buffer = Buffer.from(await audio.arrayBuffer());
  const result = await uploadOwnerAudioLibraryAsset({
    viewer: user,
    ownerId: user.id,
    kind,
    name,
    category,
    mood,
    energy,
    audioBuffer: buffer,
    fileName: audio.name,
    mimeType: audio.type,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, asset: result.asset });
}
