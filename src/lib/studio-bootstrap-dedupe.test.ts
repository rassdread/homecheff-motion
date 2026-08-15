import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";
import {
  fetchStudioAccountJson,
  invalidateStudioAccountCache,
} from "@/lib/studio-account-client";
import {
  invalidateLibraryConsistencyQueryCache,
  queryLibraryConsistency,
} from "@/lib/library-consistency-client";

describe("SP.2D-C1 studio-account client single-flight", () => {
  beforeEach(() => {
    invalidateStudioAccountCache();
    mock.restoreAll();
  });

  it("dedupes concurrent summary fetches to one HTTP call", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /\/api\/me\/studio-account\?view=summary/);
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(
        JSON.stringify({
          ok: true,
          account: { studioPlan: "free", billingStatus: "none" },
          wallet: { availableBalance: 12, balance: 12 },
          recentLedger: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const [a, b, c, d] = await Promise.all([
      fetchStudioAccountJson({ view: "summary" }),
      fetchStudioAccountJson({ view: "summary" }),
      fetchStudioAccountJson({ view: "summary" }),
      fetchStudioAccountJson({ view: "summary" }),
    ]);

    assert.equal(calls, 1);
    assert.equal(a?.wallet.availableBalance, 12);
    assert.equal(b?.wallet.availableBalance, 12);
    assert.equal(c?.account.studioPlan, "free");
    assert.equal(d?.ok, true);
  });

  it("reuses cache within TTL without a second network call", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ok: true,
          account: { studioPlan: "pro", billingStatus: "active" },
          wallet: { availableBalance: 99, balance: 99 },
          recentLedger: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    await fetchStudioAccountJson({ view: "summary" });
    await fetchStudioAccountJson({ view: "summary" });
    assert.equal(calls, 1);
  });
});

describe("SP.2D-C1 library-consistency bootstrap coalescing", () => {
  beforeEach(() => {
    invalidateLibraryConsistencyQueryCache();
    mock.restoreAll();
  });

  it("coalesces home limit=8 and assistant limit=500 into one POST", async () => {
    let calls = 0;
    const bodies: unknown[] = [];
    mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      bodies.push(JSON.parse(String(init?.body ?? "{}")));
      await new Promise((r) => setTimeout(r, 20));
      return new Response(
        JSON.stringify({
          ok: true,
          results: Array.from({ length: 20 }, (_, i) => ({
            id: `r${i}`,
            updatedAt: new Date().toISOString(),
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const [home, assistant] = await Promise.all([
      queryLibraryConsistency({ limit: 8 }),
      queryLibraryConsistency({ limit: 500 }),
    ]);

    assert.equal(calls, 1);
    assert.deepEqual(bodies[0], { limit: 500 });
    assert.equal(home.ok, true);
    assert.equal(home.results?.length, 8);
    assert.equal(assistant.ok, true);
    assert.equal(assistant.results?.length, 20);
  });
});
