import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import {
  buildVoiceAccentCoverageReport,
  buildVoiceLibraryStats,
} from "@/lib/studio-voice-accent-coverage";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import { pageVoiceLibrary } from "@/lib/studio-voice-library-page";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const summaryOnly = url.searchParams.get("summary") === "1";
  const pageParam = url.searchParams.get("page");

  try {
    const catalog = await buildVoiceLibraryCatalog();
    if (pageParam != null) {
      const page = pageVoiceLibrary(catalog, {
        query: url.searchParams.get("q") ?? "",
        language: url.searchParams.get("language") ?? "",
        accent: url.searchParams.get("accent") ?? "",
        page: Number(pageParam) || 0,
        pageSize: Number(url.searchParams.get("pageSize")) || 24,
      });
      return NextResponse.json(page);
    }
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
