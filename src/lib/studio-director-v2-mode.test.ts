import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readStudioDirectorV2Mode,
  writeStudioDirectorV2Mode,
} from "@/lib/studio-director-v2-mode";

describe("studio-director-v2-mode", () => {
  it("persists beginner/expert in localStorage", () => {
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
      assert.equal(readStudioDirectorV2Mode(), "beginner");
      writeStudioDirectorV2Mode("expert");
      assert.equal(readStudioDirectorV2Mode(), "expert");
      writeStudioDirectorV2Mode("beginner");
      assert.equal(readStudioDirectorV2Mode(), "beginner");
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: prevWindow,
      });
    }
  });
});
