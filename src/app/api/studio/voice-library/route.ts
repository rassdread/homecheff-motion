import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import {
  buildVoiceAccentCoverageReport,
  buildVoiceLibraryStats,
} from "@/lib/studio-voice-accent-coverage";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";

  try {
    const catalog = await buildVoiceLibraryCatalog();
    const filterOptions = buildVoiceLibraryFilterOptions(catalog);
    const personaPresets = buildVoicePersonaPresets(catalog);
    const stats = buildVoiceLibraryStats({ catalog, filterOptions, personaPresets });
    const accentCoverage = buildVoiceAccentCoverageReport({ catalog, personaPresets });
    return NextResponse.json({
      catalog: summaryOnly ? { ...catalog, voices: [] } : catalog,
      filterOptions,
      personaPresets,
      stats,
      accentCoverage,
      ...(summaryOnly ? { voicesDeferred: true as const } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice library unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
