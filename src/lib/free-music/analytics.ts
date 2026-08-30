/**
 * Privacy-safe Free Music Phase 4 analytics (local structured events).
 * Never log project media, filenames, text overlays, tokens, or email.
 * Track ids are catalog identifiers only.
 */

export type FreeMusicAnalyticsEventType =
  | "free_music_catalog_opened"
  | "free_music_catalog_loaded"
  | "free_music_catalog_failed"
  | "free_music_preview_started"
  | "free_music_preview_failed"
  | "free_music_track_selected"
  | "free_music_track_removed"
  | "free_music_track_replaced"
  | "free_music_export_started"
  | "free_music_export_completed"
  | "free_music_export_failed"
  | "free_music_content_id_reported";

export type FreeMusicAnalyticsEvent = {
  at: string;
  type: FreeMusicAnalyticsEventType;
  trackId?: string;
  trackCount?: number;
  reason?: string;
  userAgentClass?: "iphone" | "safari" | "chromium" | "other";
};

const STORAGE_KEY = "hc-free-music-analytics-v1";
const MAX_EVENTS = 120;

function getLocalStorage(): Storage | null {
  try {
    const store = (globalThis as { localStorage?: Storage }).localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

export function classifyUserAgent(ua: string): FreeMusicAnalyticsEvent["userAgentClass"] {
  const s = ua.toLowerCase();
  if (s.includes("iphone") || s.includes("ipod")) return "iphone";
  if (s.includes("safari") && !s.includes("chrome") && !s.includes("chromium") && !s.includes("android")) {
    return "safari";
  }
  if (s.includes("chrome") || s.includes("chromium") || s.includes("edg/")) return "chromium";
  return "other";
}

function readEvents(): FreeMusicAnalyticsEvent[] {
  const store = getLocalStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FreeMusicAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: FreeMusicAnalyticsEvent[]): void {
  const store = getLocalStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

export function trackFreeMusicEvent(
  type: FreeMusicAnalyticsEventType,
  detail?: Omit<FreeMusicAnalyticsEvent, "at" | "type">
): void {
  const ua =
    typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent
      : "";
  const next: FreeMusicAnalyticsEvent = {
    at: new Date().toISOString(),
    type,
    userAgentClass: classifyUserAgent(ua),
    ...detail,
  };
  writeEvents([next, ...readEvents()].slice(0, MAX_EVENTS));
}

export function listFreeMusicEvents(): FreeMusicAnalyticsEvent[] {
  return readEvents();
}

export function summarizeFreeMusicEvents(events: FreeMusicAnalyticsEvent[] = readEvents()) {
  const count = (type: FreeMusicAnalyticsEventType) => events.filter((e) => e.type === type).length;
  const selections = events.filter((e) => e.type === "free_music_track_selected" && e.trackId);
  const byTrack = new Map<string, number>();
  for (const e of selections) {
    const id = e.trackId!;
    byTrack.set(id, (byTrack.get(id) ?? 0) + 1);
  }
  const topSelected = [...byTrack.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([trackId, n]) => ({ trackId, n }));
  const previewStarted = count("free_music_preview_started");
  const previewFailed = count("free_music_preview_failed");
  const exportStarted = count("free_music_export_started");
  const exportFailed = count("free_music_export_failed");
  const exportCompleted = count("free_music_export_completed");
  return {
    catalogOpened: count("free_music_catalog_opened"),
    catalogLoaded: count("free_music_catalog_loaded"),
    catalogFailed: count("free_music_catalog_failed"),
    previewStarted,
    previewFailed,
    previewFailureRate: previewStarted + previewFailed > 0 ? previewFailed / (previewStarted + previewFailed) : null,
    trackSelected: count("free_music_track_selected"),
    trackRemoved: count("free_music_track_removed"),
    trackReplaced: count("free_music_track_replaced"),
    exportStarted,
    exportCompleted,
    exportFailed,
    exportFailureRate: exportStarted > 0 ? exportFailed / exportStarted : null,
    contentIdReported: count("free_music_content_id_reported"),
    topSelected,
    totalEvents: events.length,
  };
}
