import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildEditorPremiumProviderCallId,
  PREMIUM_VISION_ANALYSIS_CREDITS,
} from "@/lib/editor-premium-vision-credits";
import {
  buildPremiumAnalysisBillingLog,
  providersForAnalysisTier,
  resolvePremiumVisionAnalysisGate,
  stampPremiumAnalysisBilling,
} from "@/lib/editor-vision-analysis-tier";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";
import {
  buildOpenAiVisionUsageMetrics,
  parseOpenAiChatCompletionUsage,
} from "@/server/openai/openai-vision-usage";

const ROOT = join(process.cwd(), "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("editor premium vision credits", () => {
  it("registers premium_vision_analysis at 5 credits", () => {
    const entry = getActionCost("premium_vision_analysis");
    assert.ok(entry);
    assert.equal(entry?.defaultCreditCost, 5);
    assert.equal(PREMIUM_VISION_ANALYSIS_CREDITS, 5);
  });

  it("admin bypass costs 0 credits", () => {
    const gate = resolvePremiumVisionAnalysisGate({ isAdmin: true });
    assert.equal(gate.allowed, true);
    assert.equal(gate.requiredCredits, 0);
    assert.match(gate.adminTestLabel ?? "", /geen credits/i);
  });

  it("requires 5 credits for normal users", () => {
    assert.equal(
      resolvePremiumVisionAnalysisGate({ creditsAvailable: 4 }).allowed,
      false
    );
    assert.equal(
      resolvePremiumVisionAnalysisGate({ creditsAvailable: 5 }).allowed,
      true
    );
  });

  it("dedupe key is stable per analysis run and route", () => {
    const style = buildEditorPremiumProviderCallId({
      analysisRunId: "run-1",
      route: "style_dna",
    });
    const parts = buildEditorPremiumProviderCallId({
      analysisRunId: "run-1",
      route: "vision_parts",
    });
    assert.equal(style, "run-1::style_dna");
    assert.equal(parts, "run-1::vision_parts");
    assert.notEqual(style, parts);
  });

  it("basic bootstrap path skips Style DNA and Vision Parts APIs", () => {
    const bootstrap = readSrc("lib/editor-detection-bootstrap.ts");
    const basicBlock = bootstrap.slice(
      bootstrap.indexOf('if (analysisTier === "basic")'),
      bootstrap.indexOf("// Premium: Style DNA")
    );
    assert.doesNotMatch(basicBlock, /analyzeEditorPremiumStyleDnaApi/);
    assert.doesNotMatch(basicBlock, /fetchIllustrationPartsApi/);
  });

  it("premium bootstrap uses editor style-dna route (no wallet double billing)", () => {
    const bootstrap = readSrc("lib/editor-detection-bootstrap.ts");
    assert.match(bootstrap, /analyzeEditorPremiumStyleDnaApi/);
    assert.doesNotMatch(bootstrap, /analyzeAssetStyleDnaApi/);
  });

  it("startEditorImageAnalysis authorizes credits before premium pipeline", () => {
    const source = readSrc("lib/start-editor-image-analysis.ts");
    assert.match(source, /authorizePremiumVisionCreditsClient/);
    assert.match(source, /capturePremiumVisionCreditsClient/);
    assert.match(source, /refundPremiumVisionCreditsClient/);
    const authIndex = source.indexOf("await authorizePremiumVisionCreditsClient");
    const pipelineIndex = source.indexOf("await runEditorVisionAndObjectDetection");
    assert.ok(authIndex >= 0 && pipelineIndex >= 0);
    assert.ok(authIndex < pipelineIndex);
  });

  it("vision parts route records provider cost events", () => {
    const route = readSrc("app/api/editor/vision/parts/route.ts");
    assert.match(route, /recordEditorPremiumProviderCost/);
    assert.match(route, /route: "vision_parts"/);
  });

  it("style-dna editor route skips legacy asset derivation metering", () => {
    const route = readSrc("app/api/editor/vision/style-dna/route.ts");
    assert.doesNotMatch(route, /withStudioCreditGate\([\s\S]*premium_vision_analysis/);
    assert.match(route, /billingMode === "premium_session"/);
    assert.match(route, /skipLegacyMetering: true/);
    assert.match(route, /recordEditorPremiumProviderCost/);
    assert.match(route, /route: "style_dna"/);
  });

    it("provider cost dedupe checks completed events by providerCallId", () => {
      const providerCostSrc = readSrc("server/editor/editor-premium-provider-cost.ts");
      assert.match(providerCostSrc, /relatedJobId: providerCallId/);
      assert.match(providerCostSrc, /status: "completed"/);
    });

  it("parses OpenAI token usage when available", () => {
    const usage = parseOpenAiChatCompletionUsage({
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
    assert.equal(usage.inputTokens, 100);
    assert.equal(usage.outputTokens, 50);
    assert.equal(usage.totalTokens, 150);

    const metrics = buildOpenAiVisionUsageMetrics({
      model: "gpt-4o-mini",
      durationMs: 1200,
      imageCount: 1,
      ...usage,
    });
    assert.equal(metrics.costSource, "token_usage");
  });

  it("falls back to flat estimate without token usage", () => {
    const metrics = buildOpenAiVisionUsageMetrics({
      model: "gpt-4o-mini",
      durationMs: 900,
      imageCount: 1,
    });
    assert.equal(metrics.costSource, "flat_estimate");
    assert.ok(metrics.estimatedCostUsd > 0);
  });

  it("stamps premium billing log on document", () => {
    const billing = buildPremiumAnalysisBillingLog({
      creditsRequired: 5,
      creditsCharged: 5,
      creditStatus: "charged",
      creditTransactionId: "res-123",
      status: "complete",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:10.000Z",
      providersUsed: providersForAnalysisTier("premium"),
    });
    const doc = stampPremiumAnalysisBilling(
      {
        sessionId: "sess",
        name: "Test",
        backgroundUrl: "https://example.com/a.png",
        objects: [],
        createdAt: "",
        updatedAt: "",
      },
      billing
    );
    assert.equal(doc.visionV6Meta?.premiumAnalysisBilling?.creditsCharged, 5);
    assert.equal(doc.visionV6Meta?.premiumAnalysisBilling?.creditStatus, "charged");
  });

  it("UI shows 5 credits on premium button copy", () => {
    const panel = readSrc("components/editor/editor-vision-parts-panel.tsx");
    assert.match(panel, /premiumAnalyzeWithCredits/);
    assert.match(panel, /PREMIUM_VISION_ANALYSIS_CREDITS/);
  });
});
