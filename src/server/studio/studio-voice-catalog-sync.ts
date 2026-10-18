/**
 * Controlled ElevenLabs catalog sync.
 * Upserts one page at a time. A partial failure does not delete unseen voices.
 * User voice-picker requests must not call this.
 */

import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";
import {
  voiceCatalogDraftFromLibraryEntry,
  type VoiceCatalogDraft,
} from "@/lib/studio-voice-catalog-policy";

const RUNNING_LOCK_MS = 2 * 60 * 60 * 1000;

export type VoiceCatalogSyncStatus =
  | "completed"
  | "failed"
  | "already_running"
  | "blocked"
  | "skipped";

export type VoiceCatalogSyncResult = {
  status: VoiceCatalogSyncStatus;
  pagesFetched: number;
  upserted: number;
  providerRequests: number;
  error: string;
};

type SyncRun = {
  id: string;
  status: string;
  startedAt: Date;
};

export type VoiceCatalogSyncClient = {
  findRunning(since: Date): Promise<SyncRun | null>;
  findLastCompleted(): Promise<{ finishedAt: Date } | null>;
  startRun(now: Date): Promise<SyncRun>;
  finishRun(id: string, patch: {
    status: "completed" | "failed";
    finishedAt: Date;
    pagesFetched: number;
    upserted: number;
    providerRequests: number;
    error: string;
    cursor: string;
  }): Promise<void>;
  upsert(draft: VoiceCatalogDraft, now: Date): Promise<void>;
};

export async function runStudioVoiceCatalogSync(deps: {
  apiKey: string;
  db: VoiceCatalogSyncClient;
  now?: Date;
  force?: boolean;
  intervalMs?: number;
  loadAccount: (apiKey: string) => Promise<VoiceLibraryEntry[]>;
  loadSharedPages: (apiKey: string) => AsyncGenerator<VoiceLibraryEntry[]>;
}): Promise<VoiceCatalogSyncResult> {
  if (!deps.apiKey.trim()) {
    return {
      status: "blocked",
      pagesFetched: 0,
      upserted: 0,
      providerRequests: 0,
      error: "ELEVENLABS_API_KEY is not configured.",
    };
  }
  const now = deps.now ?? new Date();
  const intervalMs = deps.intervalMs ?? 24 * 60 * 60 * 1000;
  if (!deps.force) {
    const last = await deps.db.findLastCompleted();
    if (last && now.getTime() - last.finishedAt.getTime() < intervalMs) {
      return {
        status: "skipped",
        pagesFetched: 0,
        upserted: 0,
        providerRequests: 0,
        error: "",
      };
    }
  }
  const running = await deps.db.findRunning(new Date(now.getTime() - RUNNING_LOCK_MS));
  if (running) {
    return {
      status: "already_running",
      pagesFetched: 0,
      upserted: 0,
      providerRequests: 0,
      error: "",
    };
  }
  const run = await deps.db.startRun(now);
  let pagesFetched = 0;
  let upserted = 0;
  let providerRequests = 0;
  let cursor = "";
  try {
    providerRequests += 1;
    const account = await deps.loadAccount(deps.apiKey);
    for (const voice of account) {
      await deps.db.upsert(voiceCatalogDraftFromLibraryEntry(voice), now);
      upserted += 1;
    }
    for await (const page of deps.loadSharedPages(deps.apiKey)) {
      providerRequests += 1;
      pagesFetched += 1;
      cursor = String(pagesFetched);
      for (const voice of page) {
        await deps.db.upsert(voiceCatalogDraftFromLibraryEntry(voice), now);
        upserted += 1;
      }
    }
    await deps.db.finishRun(run.id, {
      status: "completed",
      finishedAt: new Date(),
      pagesFetched,
      upserted,
      providerRequests,
      error: "",
      cursor,
    });
    return { status: "completed", pagesFetched, upserted, providerRequests, error: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice catalog sync failed.";
    await deps.db.finishRun(run.id, {
      status: "failed",
      finishedAt: new Date(),
      pagesFetched,
      upserted,
      providerRequests,
      error: message.slice(0, 500),
      cursor,
    });
    return {
      status: "failed",
      pagesFetched,
      upserted,
      providerRequests,
      error: message,
    };
  }
}
