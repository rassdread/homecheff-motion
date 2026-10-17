import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPENAI_DALLE3_IMAGE_USD } from "@/lib/studio-cost-estimates";
import {
  assessPassionMasterQuote,
  assessPassionProviderCall,
  evaluatePassionMasterCall,
  GPT_IMAGE_1_PORTRAIT_HIGH_USD,
  issuePassionMasterQuote,
  PASSION_CALL_USD_BOUND,
  PASSION_HC_PER_IMAGE,
  planPreviewTestTopUp,
  proposePassionStageAImages,
} from "@/lib/studio-passion-stage-a";

describe("MADE WITH PASSION Stage A preflight", () => {
  it("grants 9500 only from a verified 500 HC balance", () => {
    const decision = planPreviewTestTopUp({ currentBalance: 500, grantAlreadyRecorded: false });
    assert.equal(decision.write, true);
    assert.equal(decision.credits, 9500);
  });

  it("does not grant again when the audit reason is already on the ledger", () => {
    const decision = planPreviewTestTopUp({ currentBalance: 10000, grantAlreadyRecorded: true });
    assert.equal(decision.write, false);
    assert.equal(decision.action, "skip");
    assert.equal(decision.credits, 0);
  });

  it("holds a different balance instead of adding 9500", () => {
    const decision = planPreviewTestTopUp({ currentBalance: 600, grantAlreadyRecorded: false });
    assert.equal(decision.write, false);
    assert.equal(decision.action, "hold");
    assert.equal(decision.credits, 9400);
  });

  it("prices gpt-image-1 portrait high from the published card, not DALL-E 3", () => {
    const proposal = proposePassionStageAImages();
    assert.equal(proposal.model, "gpt-image-1");
    assert.equal(proposal.size, "1024x1536");
    assert.equal(proposal.quality, "high");
    assert.equal(proposal.imageUsdEach, 0.25);
    assert.notEqual(proposal.imageUsdEach, OPENAI_DALLE3_IMAGE_USD);
    assert.equal(proposal.threeMasterImageUsd, 0.75);
    assert.equal(proposal.retryImageUsd, 0.75);
    assert.equal(proposal.maximumImageUsd, 1.5);
    assert.equal(proposal.withinCeiling, true);
    assert.ok(proposal.maximumWithTextAllowanceUsd <= 5);
    assert.equal(GPT_IMAGE_1_PORTRAIT_HIGH_USD, 0.25);
  });

  it("blocks a call that leaves the locked model, size, quality, or budget", () => {
    assert.equal(
      assessPassionProviderCall({
        model: "gpt-image-1",
        size: "1024x1024",
        quality: "high",
        spentUsd: 0,
      }).allowed,
      false
    );
    assert.equal(
      assessPassionProviderCall({
        model: "dall-e-3",
        size: "1024x1536",
        quality: "high",
        spentUsd: 0,
      }).reason,
      "MODEL_NOT_LOCKED"
    );
    assert.equal(
      assessPassionProviderCall({
        model: "gpt-image-1",
        size: "1024x1536",
        quality: "low",
        spentUsd: 0,
      }).reason,
      "QUALITY_NOT_LOCKED"
    );
    assert.equal(
      assessPassionProviderCall({
        model: "gpt-image-1",
        size: "1024x1536",
        quality: "high",
        spentUsd: 4.9,
      }).reason,
      "PROVIDER_BUDGET_EXCEEDED"
    );
    assert.equal(
      assessPassionProviderCall({
        model: "gpt-image-1",
        size: "1024x1536",
        quality: "high",
        spentUsd: 0,
      }).allowed,
      true
    );
  });

  it("signs a batch quote and refuses an unconfirmed or duplicate call", () => {
    const secret = "stage-a-test-secret";
    const now = Date.parse("2026-10-17T12:00:00.000Z");
    const quote = issuePassionMasterQuote({
      userId: "sergio",
      projectId: "project-passion",
      nowMs: now,
      secret,
    });
    assert.equal(quote.model, "gpt-image-1");
    assert.equal(quote.size, "1024x1536");
    assert.equal(quote.quality, "high");
    assert.equal(quote.hcPerImage, 125);
    assert.equal(quote.initialHc, 375);
    assert.equal(quote.maxHc, 750);
    assert.equal(PASSION_HC_PER_IMAGE, 125);
    assert.ok(PASSION_CALL_USD_BOUND > GPT_IMAGE_1_PORTRAIT_HIGH_USD);
    assert.ok(PASSION_CALL_USD_BOUND * 6 <= 5);
    assert.equal(
      assessPassionMasterQuote({
        secret,
        nowMs: now,
        presented: quote,
        userId: "sergio",
        projectId: "project-passion",
      }).ok,
      true
    );
    const unconfirmed = evaluatePassionMasterCall({
      quoteOk: true,
      quoteId: quote.id,
      confirmed: false,
      retryConfirmed: false,
      characterKey: "baker",
      attempt: 1,
      attempts: [],
    });
    assert.equal(unconfirmed.ok, false);
    if (!unconfirmed.ok) assert.equal(unconfirmed.code, "CONFIRMATION_REQUIRED");

    const first = evaluatePassionMasterCall({
      quoteOk: true,
      quoteId: quote.id,
      confirmed: true,
      retryConfirmed: false,
      characterKey: "baker",
      attempt: 1,
      attempts: [],
    });
    assert.equal(first.ok && first.action, "generate");

    const duplicate = evaluatePassionMasterCall({
      quoteOk: true,
      quoteId: quote.id,
      confirmed: true,
      retryConfirmed: false,
      characterKey: "baker",
      attempt: 1,
      attempts: [{ characterKey: "baker", attempt: 1, status: "captured", providerUsd: PASSION_CALL_USD_BOUND }],
    });
    assert.equal(duplicate.ok && duplicate.action, "reuse");

    const silentRetry = evaluatePassionMasterCall({
      quoteOk: true,
      quoteId: quote.id,
      confirmed: true,
      retryConfirmed: false,
      characterKey: "baker",
      attempt: 2,
      attempts: [{ characterKey: "baker", attempt: 1, status: "captured", providerUsd: PASSION_CALL_USD_BOUND }],
    });
    assert.equal(silentRetry.ok, false);
    if (!silentRetry.ok) assert.equal(silentRetry.code, "RETRY_NOT_CONFIRMED");
  });

  it("stops when another image would pass the provider or HC ceiling", () => {
    const secret = "stage-a-test-secret";
    const quote = issuePassionMasterQuote({
      userId: "sergio",
      projectId: "project-passion",
      nowMs: Date.parse("2026-10-17T12:00:00.000Z"),
      secret,
    });
    const full = Array.from({ length: 6 }, (_, index) => ({
      characterKey: (index % 2 === 0 ? "baker" : "potter") as "baker" | "potter",
      attempt: (index < 2 ? 1 : 2) as 1 | 2,
      status: "captured" as const,
      providerUsd: PASSION_CALL_USD_BOUND,
    }));
    const blocked = evaluatePassionMasterCall({
      quoteOk: true,
      quoteId: quote.id,
      confirmed: true,
      retryConfirmed: true,
      characterKey: "gardener",
      attempt: 1,
      attempts: full,
    });
    assert.equal(blocked.ok, false);
  });
});
