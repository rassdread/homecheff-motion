import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectStuckRender,
  isCancellableProjectStatus,
  isCancellableTransitionStatus,
  STUCK_RENDER_TIMEOUT_MS,
} from "@/lib/render-activity-status";
import {
  computeCreditsUsedFromBalances,
  summarizeCancelCredits,
  CANCEL_COST_PENDING_REASON,
} from "@/lib/render-cancel-credits";

describe("render-activity-status", () => {
  it("marks active render statuses as cancellable", () => {
    assert.equal(isCancellableProjectStatus("generating"), true);
    assert.equal(isCancellableProjectStatus("rendering"), true);
    assert.equal(isCancellableProjectStatus("queued"), true);
    assert.equal(isCancellableProjectStatus("completed"), false);
    assert.equal(isCancellableProjectStatus("cancelled"), false);
  });

  it("marks transition generating as cancellable", () => {
    assert.equal(isCancellableTransitionStatus("generating"), true);
    assert.equal(isCancellableTransitionStatus("completed"), false);
  });

  it("detects stuck queued render after 10 minutes", () => {
    const now = Date.now();
    const result = detectStuckRender({
      status: "queued",
      activityStartedAtMs: now - STUCK_RENDER_TIMEOUT_MS.queued - 1,
      lastProgressAtMs: null,
      nowMs: now,
    });
    assert.equal(result.stuck, true);
    assert.equal(result.status, "queued");
  });

  it("detects stuck generating render after 30 minutes", () => {
    const now = Date.now();
    const result = detectStuckRender({
      status: "generating",
      activityStartedAtMs: now - STUCK_RENDER_TIMEOUT_MS.generating - 5_000,
      lastProgressAtMs: now - STUCK_RENDER_TIMEOUT_MS.generating - 5_000,
      nowMs: now,
    });
    assert.equal(result.stuck, true);
  });

  it("does not flag fresh generating render as stuck", () => {
    const now = Date.now();
    const result = detectStuckRender({
      status: "generating",
      activityStartedAtMs: now - 60_000,
      lastProgressAtMs: now - 30_000,
      nowMs: now,
    });
    assert.equal(result.stuck, false);
  });
});

describe("render-cancel-credits", () => {
  it("computes credits used from balance delta", () => {
    assert.equal(computeCreditsUsedFromBalances(100, 92), 8);
    assert.equal(computeCreditsUsedFromBalances(100, 105), 0);
    assert.equal(computeCreditsUsedFromBalances(null, 92), null);
  });

  it("summarizes zero credits when no events", () => {
    const summary = summarizeCancelCredits([]);
    assert.equal(summary.costStatus, "none");
    assert.equal(summary.creditsUsed, 0);
  });

  it("summarizes known credits after cancel", () => {
    const summary = summarizeCancelCredits([
      {
        id: "a",
        providerJobId: "job-1",
        balanceBefore: 100,
        balanceAfter: 95,
        unitsUsed: 5,
        status: "cancelled",
        isEstimated: false,
        estimateReason: null,
      },
    ]);
    assert.equal(summary.costStatus, "known");
    assert.equal(summary.creditsUsed, 5);
    assert.equal(summary.totalCostUsd, 0.025);
  });

  it("falls back to pending_cost_check when balance after missing", () => {
    const summary = summarizeCancelCredits([
      {
        id: "b",
        providerJobId: "job-2",
        balanceBefore: 50,
        balanceAfter: null,
        unitsUsed: null,
        status: "pending_cost_check",
        isEstimated: true,
        estimateReason: CANCEL_COST_PENDING_REASON,
      },
    ]);
    assert.equal(summary.costStatus, "pending_cost_check");
    assert.equal(summary.isEstimated, true);
  });
});

describe("project-render-actions module", () => {
  it("exports cancelProjectRender", async () => {
    const mod = await import("@/server/animation-projects/project-render-actions");
    assert.equal(typeof mod.cancelProjectRender, "function");
    assert.equal(typeof mod.retryProjectRender, "function");
    assert.equal(typeof mod.repairProjectStatus, "function");
    assert.equal(typeof mod.refreshProjectProviderStatus, "function");
  });
});

describe("render activity API routes", () => {
  it("defines cancel route module", async () => {
    const mod = await import("@/app/api/animations/projects/[id]/cancel/route");
    assert.equal(typeof mod.POST, "function");
  });
});
