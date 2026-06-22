import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  BILLING_CONVERSION_MAX_EVENTS,
  BILLING_CONVERSION_MAX_SERIALIZED_BYTES,
  clearBillingConversionAnalyticsForTests,
  isBillingConversionAnalyticsStorageDisabled,
  pruneBillingConversionEvents,
  safeWriteBillingConversionEvents,
  trackBillingConversionEvent,
} from "@/lib/billing-conversion-analytics";

const STORAGE_KEY = "hc-billing-conversion-analytics-v1";

type MockStorage = {
  data: Map<string, string>;
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItemCalls: number;
  failSetItem: boolean;
  failSetItemAlways: boolean;
};

function createMockStorage(): MockStorage {
  const data = new Map<string, string>();
  const state: MockStorage = {
    data,
    setItemCalls: 0,
    failSetItem: false,
    failSetItemAlways: false,
    setItem(key: string, value: string) {
      state.setItemCalls += 1;
      if (state.failSetItemAlways || state.failSetItem) {
        const error = new DOMException("Quota exceeded", "QuotaExceededError");
        if (state.failSetItem && !state.failSetItemAlways) {
          state.failSetItem = false;
        }
        throw error;
      }
      data.set(key, value);
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
  return state;
}

function installWindow(storage: MockStorage) {
  const prevWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
    },
  });
  return prevWindow;
}

function restoreWindow(prevWindow: typeof globalThis.window | undefined) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: prevWindow,
  });
}

function makeEvent(index: number) {
  return {
    at: new Date(2026, 0, 1, 0, 0, index).toISOString(),
    type: "pricing_view" as const,
    source: `source_${index}`,
  };
}

describe("billing conversion analytics storage safety", () => {
  afterEach(() => {
    clearBillingConversionAnalyticsForTests();
  });

  it("quota exceeded does not throw from trackBillingConversionEvent", () => {
    const storage = createMockStorage();
    storage.failSetItemAlways = true;
    const prevWindow = installWindow(storage);

    try {
      assert.doesNotThrow(() => {
        trackBillingConversionEvent("pricing_view", { source: "pricing_page" });
        trackBillingConversionEvent("conversion_surface_impression", { source: "homepage" });
      });
      assert.equal(isBillingConversionAnalyticsStorageDisabled(), true);
    } finally {
      restoreWindow(prevWindow);
    }
  });

  it("oldest events pruned to max count and size", () => {
    const events = Array.from({ length: 80 }, (_, index) => makeEvent(index));
    const pruned = pruneBillingConversionEvents(events);

    assert.equal(pruned.length, BILLING_CONVERSION_MAX_EVENTS);
    assert.equal(pruned[0]?.source, "source_0");
    assert.equal(pruned.at(-1)?.source, `source_${BILLING_CONVERSION_MAX_EVENTS - 1}`);
    assert.ok(JSON.stringify(pruned).length <= BILLING_CONVERSION_MAX_SERIALIZED_BYTES);
  });

  it("safeWriteBillingConversionEvents drops oldest and retries after quota error", () => {
    const storage = createMockStorage();
    storage.failSetItem = true;
    const prevWindow = installWindow(storage);

    try {
      const events = Array.from({ length: 20 }, (_, index) => makeEvent(index));
      const ok = safeWriteBillingConversionEvents(events);

      assert.equal(ok, true);
      assert.equal(storage.setItemCalls, 2);
      assert.equal(isBillingConversionAnalyticsStorageDisabled(), false);

      const raw = storage.getItem(STORAGE_KEY);
      assert.ok(raw);
      const parsed = JSON.parse(raw!) as Array<{ source?: string }>;
      assert.ok(parsed.length <= 20);
      assert.ok(parsed.length >= 1);
    } finally {
      restoreWindow(prevWindow);
    }
  });

  it("analytics disabled after repeated quota failure", () => {
    const storage = createMockStorage();
    storage.failSetItemAlways = true;
    const prevWindow = installWindow(storage);

    try {
      assert.equal(safeWriteBillingConversionEvents([makeEvent(1)]), false);
      assert.equal(isBillingConversionAnalyticsStorageDisabled(), true);
      assert.equal(safeWriteBillingConversionEvents([makeEvent(2)]), false);
      assert.equal(storage.setItemCalls, 2);
    } finally {
      restoreWindow(prevWindow);
    }
  });

  it("oversized payload prunes by serialized byte limit", () => {
    const huge = Array.from({ length: BILLING_CONVERSION_MAX_EVENTS }, (_, index) => ({
      at: new Date().toISOString(),
      type: "pricing_view" as const,
      source: "x".repeat(4096),
      packId: `pack_${index}`,
    }));

    const pruned = pruneBillingConversionEvents(huge);
    assert.ok(pruned.length < huge.length);
    assert.ok(JSON.stringify(pruned).length <= BILLING_CONVERSION_MAX_SERIALIZED_BYTES);
  });
});

describe("GuestConversionStrip analytics resilience", () => {
  it("GuestConversionStrip mount effect guards analytics failures", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/billing/conversion-surface.tsx"),
      "utf8"
    );
    assert.match(source, /export function GuestConversionStrip/);
    assert.match(source, /useEffect\(\(\) => \{[\s\S]*try \{[\s\S]*trackBillingConversionEvent\("conversion_surface_impression"/);
    assert.match(source, /catch \{[\s\S]*Analytics must never block guest conversion UI/);
  });

  it("simulated GuestConversionStrip impression does not throw when storage quota exceeded", () => {
    const storage = createMockStorage();
    storage.failSetItemAlways = true;
    const prevWindow = installWindow(storage);

    try {
      assert.doesNotThrow(() => {
        trackBillingConversionEvent("conversion_surface_impression", { source: "pricing_guest" });
      });
    } finally {
      restoreWindow(prevWindow);
    }
  });
});
