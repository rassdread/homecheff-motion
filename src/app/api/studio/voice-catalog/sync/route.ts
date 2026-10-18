import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { iterateElevenLabsSharedVoicePages } from "@/lib/studio-voice-shared-catalog";
import { fetchElevenLabsAccountVoices } from "@/lib/studio-voice-library-catalog";
import { runStudioVoiceCatalogSync } from "@/server/studio/studio-voice-catalog-sync";
import { studioVoiceCatalogSyncClient } from "@/server/studio/studio-voice-catalog-db";

export const dynamic = "force-dynamic";

/** Admin-only. There is no public scheduler in this app. Default interval is daily. */
export async function POST() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }
  const hours = Number(process.env.STUDIO_VOICE_CATALOG_SYNC_HOURS ?? "24");
  const intervalHours = Number.isFinite(hours) && hours > 0 ? hours : 24;
  const result = await runStudioVoiceCatalogSync({
    apiKey: process.env.ELEVENLABS_API_KEY?.trim() ?? "",
    db: studioVoiceCatalogSyncClient(),
    intervalMs: intervalHours * 60 * 60 * 1000,
    loadAccount: (apiKey) =>
      fetchElevenLabsAccountVoices(apiKey, (input, init) => {
        const nextInit = { ...(init ?? {}) };
        delete nextInit.next;
        return fetch(input, { ...nextInit, cache: "no-store" });
      }),
    async *loadSharedPages(apiKey) {
      yield* iterateElevenLabsSharedVoicePages(apiKey, { cache: "no-store" });
    },
  });
  if (result.status === "blocked") {
    return NextResponse.json({ ...result, syncHours: Number.isFinite(hours) ? hours : 24 }, { status: 503 });
  }
  if (result.status === "already_running") {
    return NextResponse.json(result, { status: 409 });
  }
  if (result.status === "failed") {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json({ ...result, syncHours: Number.isFinite(hours) ? hours : 24 });
}
