import type {
  CharacterClusterAnalyticsEvent,
  CharacterClusterFlowId,
} from "@/types/character-cluster";

const ANALYTICS_KEY = "hc.characterCluster.analytics";
const DEPRECATED_KEY = "hc.characterCluster.deprecated";

export type CharacterClusterAnalyticsRecord = {
  flowId: CharacterClusterFlowId;
  event: CharacterClusterAnalyticsEvent;
  at: string;
};

export type DeprecatedFlowRecord = {
  path: string;
  at: string;
  count: number;
};

function readAnalytics(): CharacterClusterAnalyticsRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(ANALYTICS_KEY);
    return raw ? (JSON.parse(raw) as CharacterClusterAnalyticsRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAnalytics(records: CharacterClusterAnalyticsRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(ANALYTICS_KEY, JSON.stringify(records.slice(-100)));
  } catch {
    // ignore quota errors
  }
}

export function trackCharacterClusterEvent(
  flowId: CharacterClusterFlowId,
  event: CharacterClusterAnalyticsEvent
): void {
  const record: CharacterClusterAnalyticsRecord = {
    flowId,
    event,
    at: new Date().toISOString(),
  };
  writeAnalytics([...readAnalytics(), record]);
  if (process.env.NODE_ENV !== "production") {
    console.info("[character-cluster]", flowId, event);
  }
}

export function logDeprecatedCharacterFlow(path: string): void {
  if (typeof window === "undefined") {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[character-cluster:deprecated]", path);
    }
    return;
  }
  try {
    const raw = sessionStorage.getItem(DEPRECATED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, DeprecatedFlowRecord>) : {};
    const existing = map[path];
    map[path] = {
      path,
      at: new Date().toISOString(),
      count: (existing?.count ?? 0) + 1,
    };
    sessionStorage.setItem(DEPRECATED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[character-cluster:deprecated]", path);
  }
}

export function readCharacterClusterAnalytics(): CharacterClusterAnalyticsRecord[] {
  return readAnalytics();
}

export function readDeprecatedCharacterFlows(): DeprecatedFlowRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(DEPRECATED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, DeprecatedFlowRecord>) : {};
    return Object.values(map);
  } catch {
    return [];
  }
}

export function dataFlowIdForCluster(flowId: CharacterClusterFlowId): string {
  return flowId;
}
