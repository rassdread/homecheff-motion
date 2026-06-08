import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPriceEur } from "@/lib/format-price-eur";
import {
  filterCustomerFacingBillingEvents,
  mapCustomerBillingEventToUserRow,
  summarizeUserBillingRows,
} from "@/server/billing/customer-billing-events";
import {
  COST_ACTION,
  isCustomerFacingBillingAction,
} from "@/server/provider-cost/cost-event-types";

function billingEvent(
  overrides: Partial<{
    id: string;
    actionType: string;
    renderType: string;
    providerCostEventId: string | null;
    netPriceEur: number | null;
    metadataJson: unknown;
  }> = {}
) {
  return {
    id: overrides.id ?? "b1",
    createdAt: new Date("2026-06-01T12:00:00Z"),
    projectId: "proj-1",
    providerCostEventId: overrides.providerCostEventId ?? "cost-1",
    actionType: overrides.actionType ?? "vidu_render",
    renderType: overrides.renderType ?? "story_mode",
    status: "completed",
    netPriceEur: "netPriceEur" in overrides ? overrides.netPriceEur : 4.99,
    grossPriceEur: "netPriceEur" in overrides ? overrides.netPriceEur : 4.99,
    pricingRuleLabel: "Story mode",
    isEstimated: false,
    metadataJson: overrides.metadataJson ?? { creditsUsed: 450 },
    project: { title: "Garden Promo" },
  };
}

describe("customer-billing-events user usage", () => {
  it("excludes instrumentation-only actions from customer-facing billing", () => {
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.VIDU_RENDER), true);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.TEXT_RERENDER), true);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.OPENAI_SCENE_IMAGE), false);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.OPENAI_OCR), false);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.STORAGE_UPLOAD), false);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.INTERNAL_MERGE), false);
    assert.equal(isCustomerFacingBillingAction(COST_ACTION.ELEVENLABS_TTS), false);
  });

  it("filters instrumentation rows and dedupes by providerCostEventId", () => {
    const filtered = filterCustomerFacingBillingEvents([
      billingEvent({ id: "b1", providerCostEventId: "cost-1" }),
      billingEvent({ id: "b-dup", providerCostEventId: "cost-1" }),
      billingEvent({
        id: "b-studio",
        actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
        renderType: "transition_mode",
      }),
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.id, "b1");
  });

  it("normalizes null numeric fields for user rows", () => {
    const row = mapCustomerBillingEventToUserRow(
      billingEvent({ netPriceEur: null, metadataJson: { creditsUsed: null } })
    );
    assert.equal(row.netPriceEur, 0);
    assert.equal(row.creditsUsed, 0);
    assert.equal(row.renderType, "story_mode");
  });

  it("summarizes only customer-facing render rows", () => {
    const rows = [
      mapCustomerBillingEventToUserRow(billingEvent({ id: "b1" })),
      mapCustomerBillingEventToUserRow(
        billingEvent({
          id: "b2",
          actionType: COST_ACTION.TEXT_RERENDER,
          renderType: "text_rerender",
          netPriceEur: 0.49,
          metadataJson: { creditsUsed: 0 },
        })
      ),
    ];
    const summary = summarizeUserBillingRows(rows, "last30Days");
    assert.equal(summary.videoCount, 1);
    assert.equal(summary.amountSpentEur, 5.48);
    assert.equal(summary.creditsUsed, 450);
  });

  it("formatPriceEur is null-safe", () => {
    assert.equal(formatPriceEur(null, "nl"), "€0,00");
    assert.equal(formatPriceEur(undefined, "en"), "€0.00");
  });
});
