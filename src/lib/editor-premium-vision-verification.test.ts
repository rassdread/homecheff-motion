/**
 * Premium Vision Analysis — pre-commit verification suite.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  PREMIUM_VISION_ANALYSIS_CREDITS,
  type PremiumVisionAnalysisBillingLog,
} from "@/lib/editor-premium-vision-credits";
import {
  buildPremiumAnalysisBillingLog,
  resolvePremiumVisionAnalysisGate,
} from "@/lib/editor-vision-analysis-tier";
import { getActionCost, STUDIO_ACTION_TYPES } from "@/server/studio-account/studio-action-cost-registry";
import { getPricingCatalogMeta } from "@/lib/studio-pricing-catalog-meta";

const ROOT = join(process.cwd(), "src");

function readSrc(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("Premium Vision Analysis verification", () => {
  describe("Credits", () => {
    it("blocks user with 4 credits — no server authorize path when gate fails", () => {
      const gate = resolvePremiumVisionAnalysisGate({ creditsAvailable: 4, isAdmin: false });
      assert.equal(gate.allowed, false);
      assert.equal(gate.requiredCredits, 5);

      const start = readSrc("lib/start-editor-image-analysis.ts");
      assert.match(start, /blockedReason = "insufficient_credits"/);
      assert.match(start, /const willExecute = blockedReason == null/);
      const earlyReturnIdx = start.indexOf("willExecute: false,\n      blockedReason");
      const authorizeIdx = start.indexOf("await authorizePremiumVisionCreditsClient");
      assert.ok(earlyReturnIdx >= 0 && authorizeIdx >= 0);
      assert.ok(earlyReturnIdx < authorizeIdx);
    });

    it("allows user with exactly 5 credits", () => {
      const gate = resolvePremiumVisionAnalysisGate({ creditsAvailable: 5, isAdmin: false });
      assert.equal(gate.allowed, true);
      assert.equal(PREMIUM_VISION_ANALYSIS_CREDITS, 5);
    });

    it("captures 5 credits on success and refunds on failure paths", () => {
      const start = readSrc("lib/start-editor-image-analysis.ts");
      assert.match(start, /capturePremiumCreditsIfNeeded/);
      assert.match(start, /refundPremiumCreditsIfNeeded\(premiumCreditSession\)/);
      const refundCount = start.match(/refundPremiumCreditsIfNeeded\(premiumCreditSession\)/g)?.length ?? 0;
      assert.ok(refundCount >= 3, "expected refund on tier-not-stamped, acceptance fail, and catch");
    });
  });

  describe("Admin bypass", () => {
    it("admin gate allows with 0 required credits and label", () => {
      const gate = resolvePremiumVisionAnalysisGate({ isAdmin: true });
      assert.equal(gate.allowed, true);
      assert.equal(gate.requiredCredits, 0);
      assert.match(gate.adminTestLabel ?? "", /Admin test/i);
      assert.match(gate.adminTestLabel ?? "", /geen credits/i);
    });

    it("billing server skips capture for admin-bypass reservation", () => {
      const billing = readSrc("server/editor/editor-premium-vision-billing.ts");
      assert.match(billing, /adminBypass/);
      assert.match(billing, /creditStatus: "admin_free"/);
    });
  });

  describe("Refunds", () => {
    it("refund API route exists and sets failedGeneration", () => {
      const route = readSrc("app/api/editor/vision/premium-credits/route.ts");
      assert.match(route, /refundPremiumVisionAnalysis/);
      assert.match(route, /failedGeneration/);
    });

    it("UI maps failure reasons to refund message", () => {
      const panel = readSrc("components/editor/editor-vision-parts-panel.tsx");
      assert.match(panel, /premiumFailedRefunded/);
      assert.match(panel, /premiumInsufficientCredits/);
    });
  });

  describe("ProviderCostEvent dedupe", () => {
    it("uses unique providerCallId per route", () => {
      const mod = readSrc("server/editor/editor-premium-provider-cost.ts");
      assert.match(mod, /buildEditorPremiumProviderCallId/);
      assert.match(mod, /relatedJobId: providerCallId/);
      assert.match(mod, /if \(existing && input.status === "completed"\)/);
    });

    it("style_dna and vision_parts routes each call recordEditorPremiumProviderCost once", () => {
      const style = readSrc("app/api/editor/vision/style-dna/route.ts");
      const parts = readSrc("app/api/editor/vision/parts/route.ts");
      assert.match(style, /recordEditorPremiumProviderCost/);
      assert.match(parts, /recordEditorPremiumProviderCost/);
      assert.match(style, /route: "style_dna"/);
      assert.match(parts, /route: "vision_parts"/);
    });
  });

  describe("Basic analyse gratis", () => {
    it("basic tier returns before premium API calls", () => {
      const bootstrap = readSrc("lib/editor-detection-bootstrap.ts");
      const basicExit = bootstrap.slice(
        bootstrap.indexOf('if (analysisTier === "basic")'),
        bootstrap.indexOf("// Premium: Style DNA")
      );
      assert.match(basicExit, /terminalStateReason: "basic_analysis_only"/);
      assert.doesNotMatch(basicExit, /authorizePremiumVisionCreditsClient/);
    });
  });

  describe("Billing metadata", () => {
    it("premiumAnalysisBilling includes all required fields", () => {
      const log = buildPremiumAnalysisBillingLog({
        creditsRequired: 5,
        creditsCharged: 5,
        creditStatus: "charged",
        creditTransactionId: "res-abc",
        providerCostEstimateUsd: 0.024,
        providerCostActualUsd: 0.024,
        status: "complete",
        startedAt: "2026-06-22T00:00:00.000Z",
        completedAt: "2026-06-22T00:00:30.000Z",
      }) satisfies PremiumVisionAnalysisBillingLog;

      assert.equal(log.creditsRequired, 5);
      assert.equal(log.creditsCharged, 5);
      assert.equal(log.creditStatus, "charged");
      assert.equal(log.creditTransactionId, "res-abc");
      assert.equal(log.providerCostEstimateUsd, 0.024);
      assert.equal(log.providerCostActualUsd, 0.024);
      assert.ok(log.startedAt);
      assert.ok(log.completedAt);
    });
  });

  describe("UI copy", () => {
    const keys = [
      "editor.visionAnalysis.premiumAnalyzeWithCredits",
      "editor.visionAnalysis.premiumAnalyzeHintWithCredits",
      "editor.visionAnalysis.premiumInsufficientCredits",
      "editor.visionAnalysis.premiumFailedRefunded",
      "editor.visionAnalysis.premiumAnalyzeInProgress",
    ];

    for (const locale of ["nl.ts", "en.ts"] as const) {
      it(`${locale} has premium vision i18n keys`, () => {
        const src = readSrc(`i18n/locales/${locale}`);
        for (const key of keys) {
          assert.match(src, new RegExp(`"${key.replace(/\./g, "\\.")}"`));
        }
      });
    }

    it("hook clears premiumAnalysisActive in finally (no infinite spinner)", () => {
      const hook = readSrc("hooks/use-editor-vision-analysis-run.ts");
      assert.match(hook, /setPremiumAnalysisActive\(false\)/);
      assert.match(hook, /finally[\s\S]*setPremiumAnalysisActive\(false\)/);
    });
  });

  describe("Database / registry", () => {
    it("premium_vision_analysis in STUDIO_ACTION_TYPES and catalog", () => {
      assert.ok(STUDIO_ACTION_TYPES.includes("premium_vision_analysis"));
      const entry = getActionCost("premium_vision_analysis");
      assert.ok(entry);
      assert.equal(entry?.defaultCreditCost, 5);
      assert.ok(getPricingCatalogMeta("premium_vision_analysis"));
      assert.match(
        getPricingCatalogMeta("premium_vision_analysis")!.descriptionNl,
        /ogen, mond, haar/
      );
    });
  });
});
