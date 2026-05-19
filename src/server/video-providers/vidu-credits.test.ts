import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("vidu credit parsing", () => {
  it("sums credit_remain from remaining_credits array", async () => {
    const { getViduCreditBalance } = await import("@/server/video-providers/vidu-credits");
    const sample = {
      remaining_credits: [
        { type: "metered", credit_remain: 1200, concurrency_limit: 5, current_concurrency: 0, queue_count: 0 },
        { type: "test", credit_remain: 50, concurrency_limit: 1, current_concurrency: 0, queue_count: 0 },
      ],
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } });
    process.env.VIDU_API_KEY = "test-key";
    try {
      const result = await getViduCreditBalance({ bypassCache: true });
      assert.equal(result.ok, true);
      assert.equal(result.credits, 1250);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.VIDU_API_KEY;
    }
  });
});
