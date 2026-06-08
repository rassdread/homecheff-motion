import { NextResponse } from "next/server";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { buildVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { canonicalAccentForVoice } from "@/lib/studio-voice-accent-model";
import { buildVoiceMetadataRepairReport } from "@/lib/studio-voice-metadata-repair";

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
    const ingestion = catalog.ingestion;

    let accountVoices = 0;
    let sharedVoices = 0;
    for (const voice of catalog.voices) {
      const source = voice.labels.catalog_source?.trim().toLowerCase();
      if (source === "account") {
        accountVoices += 1;
      } else if (source === "shared") {
        sharedVoices += 1;
      }
    }

    const top100 = catalog.voices.slice(0, 100).map((voice) => ({
      name: voice.name,
      voiceId: voice.id,
      accent: voice.accent,
      language: voice.language,
      gender: voice.gender,
      age: voice.age,
      category: voice.category,
      description: voice.description,
      catalogSource: voice.labels.catalog_source ?? null,
      canonicalAccentId: canonicalAccentForVoice(voice)?.id ?? null,
    }));

    const repairReport = buildVoiceMetadataRepairReport(catalog);

    return NextResponse.json({
      source: catalog.source,
      fetchedAt: catalog.fetchedAt,
      totalVoices: catalog.voices.length,
      accountVoices,
      sharedVoices,
      dedupeCount: ingestion?.dedupeCount ?? 0,
      totalFetched: ingestion?.totalFetched ?? catalog.voices.length,
      accountFetched: ingestion?.accountFetched ?? accountVoices,
      sharedFetched: ingestion?.sharedFetched ?? sharedVoices,
      paginationLimited: ingestion?.paginationLimited ?? false,
      sharedVoicesLimit: ingestion?.sharedVoicesLimit ?? null,
      ingestionSources: ingestion?.sources ?? [catalog.source],
      metadataRepair: repairReport,
      top100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice library audit unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
