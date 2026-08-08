/**
 * Lightweight Studio creative workflow events (S.3).
 * Local-only — no prompt/media content. Does not replace billing analytics.
 */

export type StudioCreativeEventType =
  | "PROJECT_OPENED"
  | "SCENE_CREATED"
  | "SCENE_REORDERED"
  | "TOOL_CHANGED"
  | "GENERATION_STARTED"
  | "GENERATION_SUCCESS"
  | "GENERATION_FAILED"
  | "RENDER_STARTED"
  | "RENDER_SUCCESS";

export type StudioCreativeEvent = {
  at: string;
  type: StudioCreativeEventType;
  storyboardId?: string;
  tool?: string;
  action?: string;
};

const STORAGE_KEY = "hc-studio-creative-analytics-v1";
const MAX_EVENTS = 40;

function readEvents(): StudioCreativeEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StudioCreativeEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: StudioCreativeEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    // ignore quota
  }
}

export function trackStudioCreativeEvent(
  type: StudioCreativeEventType,
  meta?: Omit<StudioCreativeEvent, "at" | "type">
): void {
  const next: StudioCreativeEvent = {
    at: new Date().toISOString(),
    type,
    ...meta,
  };
  writeEvents([next, ...readEvents()]);
}

export function listStudioCreativeEvents(): StudioCreativeEvent[] {
  return readEvents();
}
