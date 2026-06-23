import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containsTechnicalUserCopy, wizardFriendlyReferenceLabel } from "@/lib/wizard-user-copy";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("wizard user copy", () => {
  it("detects technical terms in user copy", () => {
    assert.equal(containsTechnicalUserCopy("Premium analysis failed"), true);
    assert.equal(containsTechnicalUserCopy("Fusion Intelligence blueprint"), true);
    assert.equal(containsTechnicalUserCopy("Deze transformatie kost 20 credits"), false);
  });

  it("strips internal reference ids from labels", () => {
    assert.equal(wizardFriendlyReferenceLabel("ref_123abc"), "");
    assert.equal(wizardFriendlyReferenceLabel("Chef mascotte.png"), "Chef mascotte.png");
  });

  it("pricing panel does not show per-photo asset ids to users", () => {
    const panelSrc = readFileSync(
      join(__dirname, "../components/editor/editor-wizard-workflow-pricing-panel.tsx"),
      "utf8"
    );
    assert.doesNotMatch(panelSrc, /instanceId/);
    assert.doesNotMatch(panelSrc, /photos\.map/);
    assert.match(panelSrc, /wizard-workflow-pricing-panel/);
  });

  it("plan summary hides technical blueprint lines in wizard mode", () => {
    const planSrc = readFileSync(
      join(__dirname, "../components/editor/editor-plan-summary-panel.tsx"),
      "utf8"
    );
    assert.match(planSrc, /wizardSummary/);
    assert.match(planSrc, /!wizardSummary && summaryLines/);
  });

  it("progress UI uses four user-facing steps", () => {
    const progressSrc = readFileSync(
      join(__dirname, "../components/editor/editor-fusion-wizard-progress.tsx"),
      "utf8"
    );
    assert.match(progressSrc, /WIZARD_USER_PROGRESS_STEP_KEYS/);
    assert.doesNotMatch(progressSrc, /buildingBlueprint/);
  });
});
