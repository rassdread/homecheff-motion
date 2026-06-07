import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  try {
    const catalog = await buildVoiceLibraryCatalog();
    return NextResponse.json({
      catalog,
      filterOptions: buildVoiceLibraryFilterOptions(catalog),
      personaPresets: buildVoicePersonaPresets(catalog),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice library unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
