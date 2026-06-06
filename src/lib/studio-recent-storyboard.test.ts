import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearRecentStoryboardId,
  readRecentStoryboardId,
  rememberRecentStoryboardId,
} from "./studio-recent-storyboard";

function withMockLocalStorage(run: () => void): void {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  const prevWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: mockLocalStorage },
  });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: prevWindow,
    });
  }
}

describe("studio-recent-storyboard", () => {
  afterEach(() => {
    withMockLocalStorage(() => {
      clearRecentStoryboardId();
    });
  });

  it("returns null when nothing stored", () => {
    withMockLocalStorage(() => {
      assert.equal(readRecentStoryboardId(), null);
    });
  });

  it("stores and reads a trimmed storyboard id", () => {
    withMockLocalStorage(() => {
      rememberRecentStoryboardId("  sb-123  ");
      assert.equal(readRecentStoryboardId(), "sb-123");
    });
  });

  it("ignores empty ids", () => {
    withMockLocalStorage(() => {
      rememberRecentStoryboardId("   ");
      assert.equal(readRecentStoryboardId(), null);
    });
  });

  it("clears stored id", () => {
    withMockLocalStorage(() => {
      rememberRecentStoryboardId("sb-456");
      clearRecentStoryboardId();
      assert.equal(readRecentStoryboardId(), null);
    });
  });
});
