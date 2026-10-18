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
import { isStudioVoiceCatalogDbEnabled } from "@/lib/studio-voice-catalog-search";
import { loadStudioVoiceCatalogSummary, recommendStudioVoices, searchStudioVoiceCatalog } from "@/server/studio/studio-voice-catalog-db";
import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import type { VoiceLibraryPageResult } from "@/lib/studio-voice-library-page";

function voicePageInput(url: URL) {
  return {
    query: url.searchParams.get("q") ?? "",
    language: url.searchParams.get("language") ?? "",
    accent: url.searchParams.get("accent") ?? "",
    gender: url.searchParams.get("gender") ?? "",
    age: url.searchParams.get("age") ?? "",
    category: url.searchParams.get("category") ?? "",
    locale: url.searchParams.get("locale") ?? "",
    sample:
      url.searchParams.get("sample") === "yes" ? "yes" as const
      : url.searchParams.get("sample") === "no" ? "no" as const
      : "" as const,
    page: Number(url.searchParams.get("page")) || 0,
    pageSize: Number(url.searchParams.get("pageSize")) || 24,
  };
}

function recommendFromCatalog(catalog: VoiceLibraryCatalog, input: ReturnType<typeof voicePageInput>): VoiceLibraryPageResult {
  const strict = pageVoiceLibrary(catalog, { language: input.language, gender: input.gender, page: 0, pageSize: 8 });
  if (strict.total > 0) return { ...strict, relaxed: false };
  if (input.gender.trim()) {
    const byLanguage = pageVoiceLibrary(catalog, { language: input.language, page: 0, pageSize: 8 });
    if (byLanguage.total > 0) return { ...byLanguage, relaxed: true };
  }
  if (input.language.trim()) {
    return { ...pageVoiceLibrary(catalog, { page: 0, pageSize: 8 }), relaxed: true };
  }
  return { ...strict, relaxed: true };
}

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const summaryOnly = url.searchParams.get("summary") === "1";
  const pageParam = url.searchParams.get("page");

  try {
    if (isStudioVoiceCatalogDbEnabled()) {
      try {
        if (pageParam != null) {
          const input = voicePageInput(url);
          const page = url.searchParams.get("recommend") === "1"
            ? await recommendStudioVoices(input)
            : await searchStudioVoiceCatalog(input);
          return NextResponse.json(page);
        }
        const summary = await loadStudioVoiceCatalogSummary();
        return NextResponse.json({
          catalog: {
            version: 1 as const,
            source: "elevenlabs" as const,
            fetchedAt: new Date().toISOString(),
            voices: [],
          },
          filterOptions: summary.filterOptions,
          personaPresets: [],
          stats: {
            catalogSource: "elevenlabs" as const,
            totalVoices: summary.totalVoices,
            accentCount: summary.filterOptions.accents.length,
            languageCount: summary.filterOptions.languages.length,
            personaCount: 0,
            personaAvailableCount: 0,
          },
          accentCoverage: [],
          voicesDeferred: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Voice catalog is not ready.";
        return NextResponse.json({ error: message }, { status: 503 });
      }
    }
    const catalog = await buildVoiceLibraryCatalog();
    if (pageParam != null) {
      const input = voicePageInput(url);
      const page = url.searchParams.get("recommend") === "1"
        ? recommendFromCatalog(catalog, input)
        : pageVoiceLibrary(catalog, input);
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
