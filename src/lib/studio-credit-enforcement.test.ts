import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFreeActionsRegistered,
  assertRegistryCoversBillableActions,
  runCreditEnforcementAudit,
} from "@/lib/credit-enforcement-audit";
import { defaultProviderCostSpec } from "@/server/studio-account/studio-action-cost-mapping";
import { isFreeStudioAction } from "@/server/studio-account/free-action-registry";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";

describe("studio credit enforcement v1", () => {
  it("registry covers all billable provider routes", () => {
    assert.doesNotThrow(() => assertRegistryCoversBillableActions());
  });

  it("audit PASS coverage meets 90% target", () => {
    const audit = runCreditEnforcementAudit();
    assert.ok(audit.targetMet, `PASS ${audit.passPercent.toFixed(1)}% (${audit.passCount}/${audit.totalBillable})`);
    assert.ok(audit.passPercent >= 90);
  });

  it("free actions are explicitly registered", () => {
    assert.doesNotThrow(() => assertFreeActionsRegistered());
    assert.equal(isFreeStudioAction("assistant_execute_plan"), true);
    assert.equal(isFreeStudioAction("motion_render"), false);
  });

  it("defaultProviderCostSpec returns spec for gated action types", () => {
    const spec = defaultProviderCostSpec({
      actionType: "music_generation",
      userId: "user-1",
      projectId: "proj-1",
    });
    assert.ok(spec);
    assert.equal(spec?.provider, "elevenlabs");
    assert.equal(spec?.costActionType, "elevenlabs_music");
  });

  it("new action types exist in cost registry", () => {
    assert.ok(STUDIO_ACTION_COST_REGISTRY.music_generation);
    assert.ok(STUDIO_ACTION_COST_REGISTRY.sfx_generation);
    assert.ok(STUDIO_ACTION_COST_REGISTRY.subtitle_transcription);
    assert.ok(STUDIO_ACTION_COST_REGISTRY.assistant_interpret);
  });

  it("provider cost spec includes userId for ledger linking", () => {
    const spec = defaultProviderCostSpec({
      actionType: "ocr_scan",
      userId: "u-test",
    });
    assert.equal(spec?.userId, "u-test");
  });
});

describe("billProviderAction contract (unit)", () => {
  it("registry motion_render has credit estimate", () => {
    const entry = STUDIO_ACTION_COST_REGISTRY.motion_render;
    assert.ok(entry.defaultCreditCost >= 180);
    assert.equal(entry.provider, "vidu");
  });

  it("translation_export maps to openai translation cost action", () => {
    const spec = defaultProviderCostSpec({
      actionType: "translation_export",
      userId: "u1",
    });
    assert.equal(spec?.costActionType, "openai_translation");
  });
});
