/**
 * Privacy-safe photo-video funnel events (local only).
 * Never log text, filenames, media, tokens, or email.
 */

export type PhotoVideoFunnelEventType =
  | "photo_video_opened"
  | "photo_video_first_photo_added"
  | "photo_video_preview_started"
  | "photo_video_text_added"
  | "photo_video_music_added"
  | "photo_video_save_clicked"
  | "photo_video_auth_gate_shown"
  | "photo_video_signup_started"
  | "photo_video_auth_completed"
  | "photo_video_draft_restored"
  | "photo_video_saved"
  | "photo_video_item_opened"
  | "photo_video_item_returned";

export type PhotoVideoFunnelEvent = {
  at: string;
  type: PhotoVideoFunnelEventType;
};

const STORAGE_KEY = "hc-px4a-funnel-analytics-v1";
const MAX_EVENTS = 60;

function getLocalStorage(): Storage | null {
  try {
    const store = (globalThis as { localStorage?: Storage }).localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

function readEvents(): PhotoVideoFunnelEvent[] {
  const store = getLocalStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PhotoVideoFunnelEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: PhotoVideoFunnelEvent[]): void {
  const store = getLocalStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

export function trackPhotoVideoFunnelEvent(type: PhotoVideoFunnelEventType): void {
  const next: PhotoVideoFunnelEvent = { at: new Date().toISOString(), type };
  writeEvents([next, ...readEvents()].slice(0, MAX_EVENTS));
}

export function listPhotoVideoFunnelEvents(): PhotoVideoFunnelEvent[] {
  return readEvents();
}
