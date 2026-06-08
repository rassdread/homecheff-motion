import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProfitabilityFromEvents,
  classifyCostToBreakdown,
  computeProfitMetrics,
  resolveBillingFeatureKey,
  resolveProfitabilityFeatureKey,
  type BillingEventInput,
  type CostEventInput,
} from "@/server/admin/studio-profitability";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";

function costEvent(partial: Partial<CostEventInput> & Pick<CostEventInput, "actionType">): CostEventInput {
  return {
    id: partial.id ?? "c1",
    createdAt: partial.createdAt ?? new Date("2026-06-01T12:00:00Z"),
    userId: partial.userId ?? "user-1",
    projectId: partial.projectId ?? "proj-1",
    provider: partial.provider ?? "openai",
    actionType: partial.actionType,
    internalCostUsd: partial.internalCostUsd ?? 0.5,
    totalCostUsd: partial.totalCostUsd ?? null,
    metadataJson: partial.metadataJson ?? null,
  };
}

function billingEvent(partial: Partial<BillingEventInput>): BillingEventInput {
  return {
    id: partial.id ?? "b1",
    createdAt: partial.createdAt ?? new Date("2026-06-01T12:00:00Z"),
    userId: partial.userId ?? "user-1",
    projectId: partial.projectId ?? "proj-1",
    actionType: partial.actionType ?? "vidu_render",
    renderType: partial.renderType ?? "transition_mode",
    netPriceEur: partial.netPriceEur ?? 4.99,
    grossPriceEur: partial.grossPriceEur ?? 4.99,
  };
}

describe("studio-profitability", () => {
  it("classifies OpenAI scene image cost", () => {
    const b = classifyCostToBreakdown({
      provider: "openai",
      actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
      internalCostUsd: 0.04,
      totalCostUsd: null,
    });
    assert.equal(b.openaiUsd, 0.04);
    assert.equal(b.totalUsd, 0.04);
  });

  it("resolves feature keys from metadata", () => {
    assert.equal(
      resolveProfitabilityFeatureKey(
        costEvent({
          actionType: COST_ACTION.ELEVENLABS_TTS,
          metadataJson: { feature: "voice_preview_draft" },
        })
      ),
      "voice_preview"
    );
    assert.equal(
      resolveProfitabilityFeatureKey(
        costEvent({
          actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
          metadataJson: { feature: "asset_reference_generate" },
        })
      ),
      "asset_reference"
    );
  });

  it("maps billing events to motion render revenue", () => {
    assert.equal(
      resolveBillingFeatureKey({ actionType: "vidu_render", renderType: "story_mode" }),
      "motion_render"
    );
    assert.equal(
      resolveBillingFeatureKey({ actionType: "text_rerender", renderType: "text_rerender" }),
      "text_rerender"
    );
  });

  it("computes project profit with full COGS", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({ actionType: COST_ACTION.OPENAI_SCENE_IMAGE, internalCostUsd: 0.42 }),
        costEvent({ actionType: COST_ACTION.ELEVENLABS_TTS, internalCostUsd: 0.18, metadataJson: { feature: "voice_preview_draft" } }),
        costEvent({ actionType: COST_ACTION.VIDU_RENDER, internalCostUsd: 1.21, provider: "vidu" }),
        costEvent({ actionType: COST_ACTION.STORAGE_UPLOAD, internalCostUsd: 0.03, provider: "vercel_blob" }),
      ],
      billingEvents: [billingEvent({ netPriceEur: 4.99 })],
      projectTitles: new Map([["proj-1", "Demo"]]),
      userEmails: new Map([["user-1", "chef@example.com"]]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const project = report.projectProfitability[0];
    assert.equal(project.revenueEur, 4.99);
    assert.equal(project.costs.openaiUsd, 0.42);
    assert.equal(project.costs.elevenlabsUsd, 0.18);
    assert.equal(project.costs.viduUsd, 1.21);
    assert.equal(project.costs.storageUsd, 0.03);
    assert.ok(project.profitEur > 2);
    assert.ok(project.marginPercent > 50);
  });

  it("detects negative margin projects", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({ actionType: COST_ACTION.VIDU_RENDER, internalCostUsd: 5, projectId: "loss-proj" }),
      ],
      billingEvents: [billingEvent({ netPriceEur: 1.99, projectId: "loss-proj" })],
      projectTitles: new Map(),
      userEmails: new Map([["user-1", "loss@example.com"]]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const loss = report.topLossProjects[0];
    assert.ok(loss);
    assert.ok(loss.profitEur < 0);
    assert.ok(report.negativeMarginAlerts.some((a) => a.kind === "project"));
  });

  it("aggregates provider breakdown for periods", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({
          actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
          internalCostUsd: 1,
          createdAt: new Date("2026-06-05T12:00:00Z"),
        }),
        costEvent({
          actionType: COST_ACTION.VIDU_RENDER,
          internalCostUsd: 2,
          provider: "vidu",
          createdAt: new Date("2026-05-01T12:00:00Z"),
        }),
      ],
      billingEvents: [],
      projectTitles: new Map(),
      userEmails: new Map(),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const openai = report.providerBreakdown.find((p) => p.provider === "openaiUsd");
    const vidu = report.providerBreakdown.find((p) => p.provider === "viduUsd");
    assert.ok(openai);
    assert.ok(vidu);
    assert.equal(openai!.last7DaysUsd, 1);
    assert.equal(vidu!.last30DaysUsd, 0);
  });

  it("simulates subscription plans from 30d user COGS", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({ userId: "cheap", internalCostUsd: 0.5, actionType: COST_ACTION.OPENAI_SCENE_IMAGE }),
        costEvent({ userId: "expensive", internalCostUsd: 30, actionType: COST_ACTION.VIDU_RENDER, provider: "vidu" }),
      ],
      billingEvents: [],
      projectTitles: new Map(),
      userEmails: new Map([
        ["cheap", "cheap@x.com"],
        ["expensive", "exp@x.com"],
      ]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const creator = report.subscriptionSimulation.find((s) => s.planId === "creator");
    assert.ok(creator);
    assert.equal(creator!.totalUsers, 2);
    assert.equal(creator!.profitableUserCount + creator!.lossMakingUserCount, 2);
  });

  it("computes unit economics per action", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({ actionType: COST_ACTION.OPENAI_SCENE_IMAGE, internalCostUsd: 0.08 }),
        costEvent({ actionType: COST_ACTION.OPENAI_SCENE_IMAGE, internalCostUsd: 0.12 }),
      ],
      billingEvents: [],
      projectTitles: new Map(),
      userEmails: new Map(),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const scene = report.unitEconomics.byAction.find((a) => a.actionKey === "scene_image");
    assert.ok(scene);
    assert.equal(scene!.totalCalls, 2);
    assert.equal(scene!.avgCostUsd, 0.1);
  });

  it("computes profit metrics", () => {
    const m = computeProfitMetrics(4.99, 1.84);
    assert.ok(m.profitEur > 0);
    assert.ok(m.marginPercent > 0);
  });

  it("aggregates revenue by billing feature", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [],
      billingEvents: [
        billingEvent({ netPriceEur: 4.99, actionType: "vidu_render", renderType: "story_mode" }),
        billingEvent({ id: "b2", netPriceEur: 0.99, actionType: "language_export", renderType: "language_export" }),
        billingEvent({ id: "b3", netPriceEur: 0.49, actionType: "text_rerender", renderType: "text_rerender" }),
      ],
      projectTitles: new Map(),
      userEmails: new Map([["user-1", "chef@example.com"]]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const motion = report.featureProfitability.find((f) => f.featureKey === "motion_render");
    const lang = report.featureProfitability.find((f) => f.featureKey === "language_export");
    const text = report.featureProfitability.find((f) => f.featureKey === "text_rerender");
    assert.equal(motion?.revenueEur, 4.99);
    assert.equal(lang?.revenueEur, 0.99);
    assert.equal(text?.revenueEur, 0.49);
    assert.equal(report.executiveSummary.allTime.revenueEur, 6.47);
  });

  it("tracks user profitability by period", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({
          userId: "user-1",
          internalCostUsd: 1,
          createdAt: new Date("2026-06-05T12:00:00Z"),
        }),
        costEvent({
          userId: "user-1",
          internalCostUsd: 5,
          createdAt: new Date("2026-04-15T12:00:00Z"),
        }),
      ],
      billingEvents: [
        billingEvent({
          userId: "user-1",
          netPriceEur: 4.99,
          createdAt: new Date("2026-06-05T12:00:00Z"),
        }),
      ],
      projectTitles: new Map(),
      userEmails: new Map([["user-1", "chef@example.com"]]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const user = report.userProfitability[0];
    assert.equal(user.last30Days.revenueEur, 4.99);
    assert.equal(user.last30Days.costUsd, 1);
    assert.equal(user.last90Days.costUsd, 6);
    assert.equal(user.revenueEur, 4.99);
  });

  it("aggregates dashboard top lists", () => {
    const report = buildProfitabilityFromEvents({
      costEvents: [
        costEvent({ actionType: COST_ACTION.OPENAI_SCENE_IMAGE, internalCostUsd: 2 }),
        costEvent({ actionType: COST_ACTION.VIDU_RENDER, internalCostUsd: 10, provider: "vidu" }),
      ],
      billingEvents: [billingEvent({ netPriceEur: 4.99 })],
      projectTitles: new Map([["proj-1", "Demo"]]),
      userEmails: new Map([["user-1", "chef@example.com"]]),
      now: new Date("2026-06-06T12:00:00Z"),
    });

    assert.ok(report.topProfitableFeatures.length > 0);
    assert.ok(report.topLossFeatures.length > 0);
    assert.ok(report.topCostUsers.length > 0);
    assert.equal(report.providerBreakdown.length, 5);
  });
});
