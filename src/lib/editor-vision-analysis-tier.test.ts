import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateAnalysisCostUsd,
  getEditorVisionAnalysisCostLogsForTests,
  logEditorVisionAnalysisCost,
  normalizeEditorVisionAnalysisTier,
  providersForAnalysisTier,
  resetEditorVisionAnalysisCostLogsForTests,
  resolveEditorVisionAnalysisTierFromInput,
  resolvePremiumVisionAnalysisGate,
} from "@/lib/editor-vision-analysis-tier";

describe("editor-vision-analysis-tier", () => {
  it("maps legacy depth aliases to basic and premium", () => {
    assert.equal(normalizeEditorVisionAnalysisTier("provisional"), "basic");
    assert.equal(normalizeEditorVisionAnalysisTier("full"), "premium");
    assert.equal(normalizeEditorVisionAnalysisTier("basic"), "basic");
    assert.equal(normalizeEditorVisionAnalysisTier("premium"), "premium");
  });

  it("defaults auto-start to basic and deep-analyze to premium", () => {
    assert.equal(
      resolveEditorVisionAnalysisTierFromInput({ trigger: "auto-start" }),
      "basic"
    );
    assert.equal(
      resolveEditorVisionAnalysisTierFromInput({ trigger: "deep-analyze" }),
      "premium"
    );
  });

  it("blocks premium for non-admin users without enough credits", () => {
    const gate = resolvePremiumVisionAnalysisGate({ isAdmin: false, creditsAvailable: 4 });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "no_credits");
    assert.equal(gate.requiredCredits, 5);
  });

  it("allows premium when user has at least 5 credits", () => {
    const gate = resolvePremiumVisionAnalysisGate({ isAdmin: false, creditsAvailable: 5 });
    assert.equal(gate.allowed, true);
    assert.equal(gate.reason, "credits_available");
    assert.equal(gate.requiredCredits, 5);
  });

  it("allows premium for admin test bypass", () => {
    const gate = resolvePremiumVisionAnalysisGate({ isAdmin: true });
    assert.equal(gate.allowed, true);
    assert.equal(gate.reason, "admin_bypass");
    assert.match(gate.adminTestLabel ?? "", /Admin test/i);
  });

  it("logs cost with providers per tier", () => {
    resetEditorVisionAnalysisCostLogsForTests();
    const basicProviders = providersForAnalysisTier("basic");
    const premiumProviders = providersForAnalysisTier("premium");
    assert.deepEqual(basicProviders, ["rtdetr_local", "template_local"]);
    assert.ok(premiumProviders.includes("vision_parts_api"));
    assert.ok(estimateAnalysisCostUsd(premiumProviders) > estimateAnalysisCostUsd(basicProviders));

    logEditorVisionAnalysisCost({
      analysisType: "basic",
      triggeredBy: "upload",
      providersUsed: basicProviders,
    });
    logEditorVisionAnalysisCost({
      analysisType: "premium",
      triggeredBy: "manual_button",
      providersUsed: premiumProviders,
    });
    const logs = getEditorVisionAnalysisCostLogsForTests();
    assert.equal(logs.length, 2);
    assert.equal(logs[0]?.analysisType, "basic");
    assert.equal(logs[1]?.analysisType, "premium");
    assert.ok(logs[1]!.estimatedCost > logs[0]!.estimatedCost);
  });
});
