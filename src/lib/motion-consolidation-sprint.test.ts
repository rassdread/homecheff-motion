import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllMotionActionPresets, validateMotionActionPresets } from "@/lib/motion-action-presets";
import { motionHubEntriesForCategory, motionHubVisibleEntries } from "@/lib/motion-studio-hub";
import { buildMotionHubPrefillPackage } from "@/lib/motion-hub-navigation";
import { buildMotionInstantIdentityPromptBlock } from "@/lib/motion-instant-identity-enrichment";
import { createMotionWizardSession } from "@/lib/motion-wizard-pipeline";
import { resolveMotionWizardGeneratePrice } from "@/lib/wizard-workflow-pricing";

describe("motion consolidation sprint", () => {
  it("exposes all presets in motion hub (no hidden NLP-only)", () => {
    const presets = getAllMotionActionPresets();
    assert.ok(presets.length >= 56);
    const hubPresetIds = new Set(
      motionHubVisibleEntries()
        .filter((e) => e.kind === "action_preset")
        .map((e) => e.presetId)
    );
    for (const preset of presets) {
      assert.ok(hubPresetIds.has(preset.id), `missing hub entry for ${preset.id}`);
    }
  });

  it("validates expanded preset catalog", () => {
    assert.deepEqual(validateMotionActionPresets(), []);
  });

  it("sports category includes penalty kick", () => {
    const sports = motionHubEntriesForCategory("sports");
    assert.ok(sports.some((e) => e.presetId === "penalty_kick"));
  });

  it("photo intent prefill targets instant wizard", () => {
    const pkg = buildMotionHubPrefillPackage({ photoIntentId: "animate_photo" });
    assert.ok(pkg);
    assert.match(pkg!.targetRoute, /\/animate\/instant/);
    assert.equal(pkg!.protectionSettings?.preserveIdentity, true);
  });

  it("identity enrichment reuses studio lock intro", () => {
    const block = buildMotionInstantIdentityPromptBlock(null);
    assert.match(block, /TRANSFORM THE EXISTING SOURCE CHARACTER/);
  });

  it("motion wizard session uses unified transaction lifecycle", () => {
    const price = resolveMotionWizardGeneratePrice("motion_ready_character");
    const session = createMotionWizardSession({
      workflowKind: "action_preset",
      price,
    });
    assert.equal(session.state, "CREATED");
    assert.equal(session.workflowKind, "action_preset");
  });
});
