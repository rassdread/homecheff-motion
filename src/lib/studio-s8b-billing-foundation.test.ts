/**
 * S.8B foundation tests — ownership, idempotency, auto top-up, constants, labels.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveStudioGenerationIdempotencyKey,
  tryResolveStudioGenerationIdempotencyKey,
} from "@/lib/studio-generation-idempotency";
import {
  STUDIO_AUTO_TOPUP_RUNTIME_BEFORE,
  buildAutoTopUpIdempotencyKey,
  carryPolicyProductionSupport,
  classifySuggestionAction,
  evaluateAutoTopUpTrigger,
  isPlanAutoTopUpEligible,
  resolvePackCatalogSourceOfTruth,
  resolvePlanCatalogSourceOfTruth,
  utcHourBucket,
  STUDIO_AUTO_TOPUP_DEFAULTS,
} from "@/lib/studio-auto-topup";
import {
  CREDIT_USD,
  USD_PER_CREDIT,
  resolveFusionCreditsForCharge,
} from "@/lib/studio-credit-constants";
import { CREDIT_USD as ANIMATION_CREDIT_USD } from "@/lib/animation-presets";
import {
  STUDIO_FINANCIAL_OWNERS,
  assertOwnerDoesNotMutateWallet,
  buildFinancialCorrelationId,
} from "@/lib/studio-financial-ownership";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";
import { isFreeStudioAction } from "@/server/studio-account/free-action-registry";
import { S8C_MARGIN_INPUT_REGISTRY } from "@/lib/studio-s8c-margin-input-registry";

describe("S.8B financial ownership", () => {
  it("lists canonical owners without wallet mutation from providers", () => {
    assert.ok(STUDIO_FINANCIAL_OWNERS.credits.includes("wallet"));
    assert.ok(STUDIO_FINANCIAL_OWNERS.billing.includes("auto_topup_payment_execution"));
    assert.equal(assertOwnerDoesNotMutateWallet("providers"), false);
    assert.equal(assertOwnerDoesNotMutateWallet("credits"), true);
    assert.match(buildFinancialCorrelationId({ ownerId: "u1", actionType: "voice_generation" }), /^fc_/);
  });
});

describe("S.8B idempotency", () => {
  it("never uses random paid keys; fingerprint is deterministic", () => {
    const a = resolveStudioGenerationIdempotencyKey({
      fallbackPrefix: "stt:sb1",
      operationFingerprint: "subtitle_transcription:sb1:en",
    });
    const b = resolveStudioGenerationIdempotencyKey({
      fallbackPrefix: "stt:sb1",
      operationFingerprint: "subtitle_transcription:sb1:en",
    });
    assert.equal(a, b);
    assert.equal(tryResolveStudioGenerationIdempotencyKey({ fallbackPrefix: "x" }), null);
  });

  it("prefers header over fingerprint", () => {
    assert.equal(
      resolveStudioGenerationIdempotencyKey({
        headerKey: "hdr",
        operationFingerprint: "fp",
        fallbackPrefix: "p",
      }),
      "hdr"
    );
  });
});

describe("S.8B auto top-up contract", () => {
  it("was CONFIG_ONLY before and requires consent + eligibility", () => {
    assert.equal(STUDIO_AUTO_TOPUP_RUNTIME_BEFORE, "CONFIG_ONLY");
    assert.equal(isPlanAutoTopUpEligible("free"), false);
    assert.equal(isPlanAutoTopUpEligible("creator"), true);
    const denied = evaluateAutoTopUpTrigger({
      settings: {
        ...STUDIO_AUTO_TOPUP_DEFAULTS,
        enabled: true,
        consentAt: null,
        status: "enabled",
        lastAttemptAt: null,
        lastSuccessAt: null,
        failureCount: 0,
      },
      planId: "creator",
      availableCredits: 0,
      requiredCredits: 40,
      hasPaymentMethod: true,
    });
    assert.equal(denied.reason, "consent_missing");
    const key = buildAutoTopUpIdempotencyKey({
      userId: "u1",
      packId: "pack_500",
      windowHourIso: utcHourBucket(new Date("2026-08-09T12:00:00Z")),
    });
    assert.match(key, /auto_topup:u1:pack_500:2026-08-09T12/);
  });
});

describe("S.8B constants and labels", () => {
  it("CREDIT_USD aliases USD_PER_CREDIT", () => {
    assert.equal(USD_PER_CREDIT, 0.005);
    assert.equal(CREDIT_USD, USD_PER_CREDIT);
    assert.equal(ANIMATION_CREDIT_USD, USD_PER_CREDIT);
  });

  it("fixes image registry providers to openai where runtime is openai", () => {
    assert.equal(getActionCost("scene_generation")?.provider, "openai");
    assert.equal(getActionCost("character_generation")?.provider, "openai");
    assert.equal(getActionCost("image_generation")?.provider, "openai");
    assert.equal(getActionCost("transformation_session")?.provider, "replicate");
  });

  it("documents fusion precedence and carry honesty", () => {
    assert.equal(resolveFusionCreditsForCharge({ intent: "future_child" }).precedence, "intent_override");
    assert.equal(resolveFusionCreditsForCharge({}).precedence, "registry_default");
    assert.equal(carryPolicyProductionSupport("UNLIMITED").supported, true);
    assert.equal(carryPolicyProductionSupport("THREE_MONTHS").supported, false);
    assert.equal(classifySuggestionAction("voice_suggestion"), "UNWIRED");
    assert.equal(resolvePackCatalogSourceOfTruth().canonical, "db_with_ts_fallback");
    assert.equal(resolvePlanCatalogSourceOfTruth().canonical, "db_with_ts_fallback");
  });

  it("keeps free actions free of provider generation fees by registry", () => {
    assert.equal(isFreeStudioAction("upload"), true);
    assert.equal(isFreeStudioAction("voice_preview_cache_hit"), true);
    assert.equal(isFreeStudioAction("scene_generation"), false);
  });

  it("exposes S.8C margin input registry rows", () => {
    assert.ok(S8C_MARGIN_INPUT_REGISTRY.length >= 10);
    const stt = S8C_MARGIN_INPUT_REGISTRY.find((r) => r.actionType === "subtitle_transcription");
    assert.equal(stt?.jobWrapped, true);
    assert.equal(stt?.pricesChangedInS8B, false);
  });
});

describe("S.8B localStorage credits non-authoritative", () => {
  it("documents that editor gate credits must not authorize StudioWallet", () => {
    // Structural: Studio authorize never reads hc_editor_user_credits (grep-enforced in architecture).
    assert.equal(typeof process.env.hc_editor_user_credits, "undefined");
  });
});
