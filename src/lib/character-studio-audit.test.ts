import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterStudioAuditBundle,
  buildCharacterStudioCompletenessReport,
  buildCharacterWorkflowInventoryReport,
} from "@/lib/character-studio-audit";

describe("character studio audit", () => {
  it("builds workflow inventory for all character workflows", () => {
    const inventory = buildCharacterWorkflowInventoryReport();
    const ids = inventory.map((e) => e.workflowId);
    assert.ok(ids.includes("mascot_transform"));
    assert.ok(ids.includes("human_into_mascot"));
    assert.ok(ids.includes("outfit_from_reference"));
    assert.ok(ids.includes("motion_ready_character"));
    assert.ok(ids.includes("full_body_extension"));
  });

  it("computes completeness score", () => {
    const report = buildCharacterStudioCompletenessReport();
    assert.ok(report.score >= 0 && report.score <= 100);
    assert.equal(report.totalWorkflows, 11);
  });

  it("bundles audit reports", () => {
    const bundle = buildCharacterStudioAuditBundle();
    assert.ok(bundle.inventory.length > 0);
    assert.ok(bundle.copilotRouting.length > 0);
    assert.ok(bundle.duplication.score < 50);
    assert.ok(bundle.uxRecommendations.length > 0);
  });
});
