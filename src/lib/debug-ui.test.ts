import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPublicDebugUiEnabled,
  shouldShowLanguageExportAdminDebug,
} from "@/lib/debug-ui";

describe("debug-ui", () => {
  it("shows admin debug only when flag or admin expanded", () => {
    const prev = process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI;
    delete process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI;
    try {
      assert.equal(shouldShowLanguageExportAdminDebug(true, true), true);
      assert.equal(shouldShowLanguageExportAdminDebug(true, false), false);
      assert.equal(shouldShowLanguageExportAdminDebug(false, true), false);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI = prev;
      }
    }
  });

  it("enables public debug UI when env is true", () => {
    const prev = process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI;
    process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI = "true";
    try {
      assert.equal(isPublicDebugUiEnabled(), true);
      assert.equal(shouldShowLanguageExportAdminDebug(false, false), true);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI = prev;
      }
    }
  });
});
