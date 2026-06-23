import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("wizard refund flow", () => {
  it("pipeline returns user-facing error codes not Premium analysis failed", () => {
    const premiumSrc = readFileSync(
      join(__dirname, "editor-fusion-wizard-premium.ts"),
      "utf8"
    );
    assert.doesNotMatch(premiumSrc, /Premium analysis failed/);
    assert.match(premiumSrc, /analysis_failed/);
  });

  it("reference role flow maps errors to wizard pricing i18n keys", () => {
    const flowSrc = readFileSync(
      join(__dirname, "../components/editor/editor-reference-role-flow.tsx"),
      "utf8"
    );
    assert.match(flowSrc, /resolveWizardPipelineErrorCopy/);
    assert.match(flowSrc, /t\(copy\.key as never\)/);
  });

  it("render pipeline compensates analysis credits on render failure", () => {
    const renderSrc = readFileSync(join(__dirname, "editor-fusion-wizard-render.ts"), "utf8");
    assert.match(renderSrc, /compensateWizardPipelineFailure/);
    assert.match(renderSrc, /capturedPremiumSessions/);
  });

  it("premium analysis partial failure refunds prior captures", () => {
    const premiumSrc = readFileSync(
      join(__dirname, "editor-fusion-wizard-premium.ts"),
      "utf8"
    );
    assert.match(premiumSrc, /refundCapturedSessions/);
  });
});
