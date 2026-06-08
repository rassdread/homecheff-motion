import { NextResponse } from "next/server";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { buildVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { canonicalAccentForVoice } from "@/lib/studio-voice-accent-model";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const catalog = await buildVoiceLibraryCatalog({ forceRefresh: true });
    const top100 = catalog.voices.slice(0, 100).map((voice) => ({
      name: voice.name,
      voiceId: voice.id,
      accent: voice.accent,
      language: voice.language,
      gender: voice.gender,
      age: voice.age,
      category: voice.category,
      description: voice.description,
      canonicalAccentId: canonicalAccentForVoice(voice)?.id ?? null,
    }));

    return NextResponse.json({
      source: catalog.source,
      fetchedAt: catalog.fetchedAt,
      totalVoices: catalog.voices.length,
      top100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice library audit unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
