import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readPendingSegmentRetryOrder } from "@/server/instant-premium/retry-segment";

describe("retry-segment audit", () => {
  it("reads pending segment retry order from audit json", () => {
    assert.equal(
      readPendingSegmentRetryOrder({
        pendingSegmentRetry: { order: 2, startedAt: "2026-01-01T00:00:00.000Z" },
      }),
      2
    );
  });

  it("returns null when no pending retry", () => {
    assert.equal(readPendingSegmentRetryOrder(null), null);
    assert.equal(readPendingSegmentRetryOrder({}), null);
  });
});
