import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterStudioP0AuditBundle,
  buildCopilotRoutingReport,
  buildFixedRouteReport,
  logoPlacementHubHref,
  verifyCharacterFusionIntentCoverage,
} from "@/lib/character-studio-p0-audit";
import { resolveLegacyEditorStartRedirect } from "@/lib/character-studio-legacy-routes";
import { buildLogoPlacementWizardRoute } from "@/lib/assistant-editor-routes";
import { detectCharacterStudioFlowFromMessage } from "@/lib/character-studio-copilot";

describe("character studio P0 audit", () => {
  it("production readiness score exceeds 90 after P0 consolidation", () => {
    const bundle = buildCharacterStudioP0AuditBundle();
    assert.ok(bundle.productionReadinessScore >= 90, `score=${bundle.productionReadinessScore}`);
    assert.equal(bundle.fixedRouteReport.status, "pass");
    assert.equal(bundle.copilotRoutingReport.status, "pass");
    assert.equal(bundle.logoPlacementVisibilityReport.status, "pass");
    assert.equal(bundle.outfitFlowVerificationReport.status, "pass");
    assert.equal(bundle.editorLeakReport.status, "pass");
    assert.ok(bundle.duplicationScore <= 6);
  });

  it("legacy mascot_transform redirects to character studio", () => {
    const redirect = resolveLegacyEditorStartRedirect({ workflow: "mascot_transform" });
    assert.ok(redirect);
    assert.match(redirect!.to, /flow=mascot_transform/);
  });

  it("character fusion intents resolve to character studio", () => {
    assert.deepEqual(verifyCharacterFusionIntentCoverage(), []);
  });

  it("logo wizard route uses character studio hub", () => {
    assert.match(buildLogoPlacementWizardRoute({ targetObjectId: "shirt" }), /flow=logo_placement/);
    assert.match(logoPlacementHubHref(), /flow=logo_placement/);
  });
});

describe("character studio copilot P0 gaps", () => {
  it("routes audit phrases correctly", () => {
    const report = buildCopilotRoutingReport();
    assert.ok(report.auditGaps.every((row) => row.pass));
  });

  it("routes 3d versie to character upgrade", () => {
    const match = detectCharacterStudioFlowFromMessage("maak een 3d versie");
    assert.equal(match.kind, "flow");
    if (match.kind === "flow") {
      assert.equal(match.flowId, "character_upgrade");
    }
  });

  it("fixed route report lists canonical hub", () => {
    const report = buildFixedRouteReport();
    assert.equal(report.canonicalHub, "/studio/characters/prepare");
    assert.ok(report.legacyRedirects.length >= 3);
  });
});
