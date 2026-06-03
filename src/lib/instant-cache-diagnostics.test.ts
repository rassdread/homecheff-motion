import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resetInstantCacheDiagnosticsForTests,
  warnIndexedDbCacheFailed,
  warnInvalidImageUrl,
} from "@/lib/instant-cache-diagnostics";

describe("instant cache diagnostics", () => {
  it("dedupes indexeddb warnings within a session", () => {
    resetInstantCacheDiagnosticsForTests();
    const original = console.warn;
    const calls: unknown[] = [];
    console.warn = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      warnIndexedDbCacheFailed("get", { imageId: "a" });
      warnIndexedDbCacheFailed("get", { imageId: "b" });
      assert.equal(calls.length, 1);
    } finally {
      console.warn = original;
      resetInstantCacheDiagnosticsForTests();
    }
  });

  it("dedupes invalid image url warnings by context", () => {
    resetInstantCacheDiagnosticsForTests();
    const original = console.warn;
    const calls: unknown[] = [];
    console.warn = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      warnInvalidImageUrl("sanitizePersistedRemoteUrl", { value: "/images" });
      warnInvalidImageUrl("sanitizePersistedRemoteUrl", { value: "/images/foo.jpg" });
      assert.equal(calls.length, 1);
    } finally {
      console.warn = original;
      resetInstantCacheDiagnosticsForTests();
    }
  });
});
