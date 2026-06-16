import { safeSetLocalStorage } from "@/lib/editor-local-storage";
import type { AssistantHistoryItem, AssistantHistoryStatus, AssistantHistoryStore } from "@/types/assistant-history";

const STORAGE_KEY = "hc-assistant-history-v1";
const MAX_ITEMS = 40;

function emptyStore(): AssistantHistoryStore {
  return { version: 1, items: [] };
}

function readStore(): AssistantHistoryStore {
  if (typeof window === "undefined") {
    return emptyStore();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as AssistantHistoryStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AssistantHistoryStore): void {
  if (typeof window === "undefined") {
    return;
  }
  safeSetLocalStorage(STORAGE_KEY, JSON.stringify(store));
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("hc-assistant-history-updated"));
  }
}

export function listAssistantHistory(projectId?: string | null): AssistantHistoryItem[] {
  const items = readStore().items.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
  if (!projectId) {
    return items;
  }
  return items.filter((row) => row.projectId === projectId);
}

export function recordAssistantHistoryItem(
  partial: Omit<AssistantHistoryItem, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): AssistantHistoryItem {
  const now = new Date().toISOString();
  const store = readStore();
  const existing = partial.id ? store.items.find((row) => row.id === partial.id) : null;
  const item: AssistantHistoryItem = {
    id: partial.id ?? existing?.id ?? `ah_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: existing?.createdAt ?? partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    projectId: partial.projectId ?? existing?.projectId ?? null,
    projectTitle: partial.projectTitle ?? existing?.projectTitle ?? null,
    userMessage: partial.userMessage ?? existing?.userMessage ?? "",
    assistantSummary: partial.assistantSummary ?? existing?.assistantSummary ?? "",
    intent: partial.intent ?? existing?.intent ?? "unknown",
    presetId: partial.presetId ?? existing?.presetId,
    actionId: partial.actionId ?? existing?.actionId,
    status: partial.status ?? existing?.status ?? "planned",
    route: partial.route ?? existing?.route,
    relatedAssetIds: partial.relatedAssetIds ?? existing?.relatedAssetIds ?? [],
    relatedLibraryRecordIds:
      partial.relatedLibraryRecordIds ?? existing?.relatedLibraryRecordIds ?? [],
    executionPlanId: partial.executionPlanId ?? existing?.executionPlanId,
  };

  const nextItems = [item, ...store.items.filter((row) => row.id !== item.id)].slice(0, MAX_ITEMS);
  writeStore({ version: 1, items: nextItems });
  return item;
}

export function updateAssistantHistoryStatus(
  id: string,
  status: AssistantHistoryStatus,
  patch: Partial<AssistantHistoryItem> = {}
): AssistantHistoryItem | null {
  const store = readStore();
  const existing = store.items.find((row) => row.id === id);
  if (!existing) {
    return null;
  }
  return recordAssistantHistoryItem({ ...existing, ...patch, id, status });
}

export function buildAssistantReusePrompt(item: AssistantHistoryItem): string {
  if (item.presetId === "goal_celebration") {
    return "Maak opnieuw een doelpuntvideo met dezelfde assets";
  }
  if (item.intent === "outfit_from_reference") {
    return "Zet opnieuw een outfit uit een foto op mij, gezicht hetzelfde houden";
  }
  if (item.userMessage.trim()) {
    return item.userMessage.trim();
  }
  return item.assistantSummary;
}

export function clearAssistantHistoryForTests(): void {
  writeStore(emptyStore());
}
