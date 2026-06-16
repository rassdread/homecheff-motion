import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  EMPTY_RECENT_PROJECTS,
  __resetRecentProjectsSnapshotCacheForTests,
  getRecentProjectsClientSnapshot,
  getRecentProjectsServerSnapshot,
} from "@/lib/universe-home-sections-snapshot";

describe("universe home sections snapshot", () => {
  beforeEach(() => {
    __resetRecentProjectsSnapshotCacheForTests();
  });

  afterEach(() => {
    __resetRecentProjectsSnapshotCacheForTests();
  });

  it("returns the same server snapshot reference on every call", () => {
    const first = getRecentProjectsServerSnapshot();
    const second = getRecentProjectsServerSnapshot();
    assert.strictEqual(first, second);
    assert.strictEqual(first, EMPTY_RECENT_PROJECTS);
    assert.equal(first.length, 0);
  });

  it("does not allocate a new empty array inline for server snapshot", () => {
    assert.strictEqual(getRecentProjectsServerSnapshot(), EMPTY_RECENT_PROJECTS);
    assert.notStrictEqual(getRecentProjectsServerSnapshot(), []);
  });

  it("UniverseHomeSections uses stable snapshot helpers", () => {
    const source = readFileSync("src/components/suite/universe/universe-home-sections.tsx", "utf8");
    assert.match(source, /getRecentProjectsServerSnapshot/);
    assert.match(source, /getRecentProjectsClientSnapshot/);
    assert.match(source, /subscribeRecentProjects/);
    assert.doesNotMatch(source, /\(\) => \[\]/);
  });

  it("client snapshot reuses cached reference when data unchanged", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

    const first = getRecentProjectsClientSnapshot();
    const second = getRecentProjectsClientSnapshot();
    assert.strictEqual(first, second);
    assert.equal(first.length, 0);
  });
});
