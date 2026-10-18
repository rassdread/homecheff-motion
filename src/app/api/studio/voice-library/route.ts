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
import { loadStudioVoiceCatalogSummary, searchStudioVoiceCatalog } from "@/server/studio/studio-voice-catalog-db";

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
          const page = await searchStudioVoiceCatalog({
            query: url.searchParams.get("q") ?? "",
            language: url.searchParams.get("language") ?? "",
            accent: url.searchParams.get("accent") ?? "",
            gender: url.searchParams.get("gender") ?? "",
            age: url.searchParams.get("age") ?? "",
            category: url.searchParams.get("category") ?? "",
            sample:
              url.searchParams.get("sample") === "yes" ? "yes"
              : url.searchParams.get("sample") === "no" ? "no"
              : "",
            page: Number(pageParam) || 0,
            pageSize: Number(url.searchParams.get("pageSize")) || 24,
          });
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
      const page = pageVoiceLibrary(catalog, {
        query: url.searchParams.get("q") ?? "",
        language: url.searchParams.get("language") ?? "",
        accent: url.searchParams.get("accent") ?? "",
        gender: url.searchParams.get("gender") ?? "",
        age: url.searchParams.get("age") ?? "",
        category: url.searchParams.get("category") ?? "",
        sample:
          url.searchParams.get("sample") === "yes" ? "yes"
          : url.searchParams.get("sample") === "no" ? "no"
          : "",
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
