import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildAssistantReusePrompt,
  clearAssistantHistoryForTests,
  listAssistantHistory,
  recordAssistantHistoryItem,
  updateAssistantHistoryStatus,
} from "@/lib/assistant-history";

type MemoryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function installMemoryLocalStorage(): MemoryStorage {
  const map = new Map<string, string>();
  const storage: MemoryStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return storage;
}

describe("assistant history", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearAssistantHistoryForTests();
  });

  afterEach(() => {
    clearAssistantHistoryForTests();
  });

  it("creates history item after assistant prompt", () => {
    recordAssistantHistoryItem({
      userMessage: "Maak een doelpuntvideo",
      assistantSummary: "Doelpunt vieren",
      intent: "create_motion_video",
      presetId: "goal_celebration",
      status: "planned",
    });
    const items = listAssistantHistory();
    assert.equal(items.length, 1);
    assert.equal(items[0]?.userMessage, "Maak een doelpuntvideo");
    assert.equal(items[0]?.status, "planned");
  });

  it("links projectId and filters project-scoped history", () => {
    recordAssistantHistoryItem({
      userMessage: "Outfit uit foto",
      assistantSummary: "Outfit uit referentie",
      intent: "outfit_from_reference",
      projectId: "proj_abc",
      status: "opened",
    });
    recordAssistantHistoryItem({
      userMessage: "Promotievideo",
      assistantSummary: "Studio story",
      intent: "studio_story",
      projectId: "proj_other",
      status: "planned",
    });
    assert.equal(listAssistantHistory("proj_abc").length, 1);
    assert.equal(listAssistantHistory().length, 2);
  });

  it("updates status when execution progresses", () => {
    const item = recordAssistantHistoryItem({
      id: "pkg_123",
      userMessage: "Doelpunt",
      assistantSummary: "Doelpunt vieren",
      intent: "create_motion_video",
      status: "planned",
    });
    const updated = updateAssistantHistoryStatus(item.id, "prepared");
    assert.ok(updated);
    assert.equal(updated?.status, "prepared");
    assert.equal(listAssistantHistory()[0]?.status, "prepared");
  });

  it("reuses previous preset context in prompt", () => {
    const item = recordAssistantHistoryItem({
      userMessage: "Maak een doelpunt",
      assistantSummary: "Doelpunt vieren",
      intent: "create_motion_video",
      presetId: "goal_celebration",
      status: "prepared",
    });
    assert.match(buildAssistantReusePrompt(item), /doelpuntvideo/i);
  });

  it("merges updates by stable id", () => {
    recordAssistantHistoryItem({
      id: "same_id",
      userMessage: "Eerste",
      assistantSummary: "Samenvatting",
      intent: "create_motion_video",
      status: "planned",
    });
    recordAssistantHistoryItem({
      id: "same_id",
      status: "opened",
      route: "/animate/instant",
    });
    const items = listAssistantHistory();
    assert.equal(items.length, 1);
    assert.equal(items[0]?.status, "opened");
    assert.equal(items[0]?.route, "/animate/instant");
  });
});
