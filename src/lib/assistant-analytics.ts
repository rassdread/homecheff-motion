export type AssistantAnalyticsEventType =
  | "prompt"
  | "recommendation_accepted"
  | "flow_abandoned"
  | "wizard_opened"
  | "asset_generated"
  | "conversion";

export type AssistantAnalyticsEvent = {
  at: string;
  type: AssistantAnalyticsEventType;
  prompt?: string;
  recommendationId?: string;
  intent?: string;
  route?: string;
  status?: string;
};

export type AssistantAnalyticsSummary = {
  totalPrompts: number;
  acceptedRecommendations: number;
  abandonedFlows: number;
  wizardOpenings: number;
  conversions: number;
  topPrompts: Array<{ prompt: string; count: number }>;
  topRecommendations: Array<{ id: string; count: number }>;
};

const STORAGE_KEY = "hc-assistant-analytics-v1";
const MAX_EVENTS = 500;

function readEvents(): AssistantAnalyticsEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as AssistantAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AssistantAnalyticsEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function trackAssistantAnalyticsEvent(
  type: AssistantAnalyticsEventType,
  payload: Omit<AssistantAnalyticsEvent, "at" | "type"> = {}
): void {
  const events = readEvents();
  events.unshift({
    at: new Date().toISOString(),
    type,
    ...payload,
  });
  writeEvents(events);
}

function countBy<T extends string>(values: T[]): Array<{ key: T; count: number }> {
  const map = new Map<T, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAssistantAnalyticsSummary(): AssistantAnalyticsSummary {
  const events = readEvents();
  const prompts = events.filter((row) => row.type === "prompt" && row.prompt).map((row) => row.prompt!);
  const recs = events
    .filter((row) => row.type === "recommendation_accepted" && row.recommendationId)
    .map((row) => row.recommendationId!);

  return {
    totalPrompts: events.filter((row) => row.type === "prompt").length,
    acceptedRecommendations: events.filter((row) => row.type === "recommendation_accepted").length,
    abandonedFlows: events.filter((row) => row.type === "flow_abandoned").length,
    wizardOpenings: events.filter((row) => row.type === "wizard_opened").length,
    conversions: events.filter((row) => row.type === "conversion").length,
    topPrompts: countBy(prompts).slice(0, 8).map((row) => ({ prompt: row.key, count: row.count })),
    topRecommendations: countBy(recs).slice(0, 8).map((row) => ({ id: row.key, count: row.count })),
  };
}

export function clearAssistantAnalyticsForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
