import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPrefillPackageFromInterpretation,
  interpretAssistantRequest,
} from "@/lib/assistant-interpretation-engine";
import { buildMotionActionPresetPrefillPackage } from "@/lib/assistant-prefill-engine";
import { buildAssistantSuggestions } from "@/lib/assistant-suggestions";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { applyAssistantPrefillToInstantMotion } from "@/lib/assistant-wizard-prefill-apply";
import {
  buildMotionActionPresetMetadata,
  detectMotionActionPresetFromMessage,
  getAllMotionActionPresets,
  getMotionActionPreset,
  MOTION_ACTION_PRESET_FEATURED_IDS,
  validateMotionActionPresets,
} from "@/lib/motion-action-presets";
import { shouldPromptMotionReadyForActionPreset } from "@/lib/motion-action-preset-motion-ready";
import { extractActionPresetFromPosterSettings } from "@/lib/library-consistency-completion";

describe("motion action preset system v1", () => {
  it("doelpunt maken maps to goal_celebration preset", () => {
    const interpretation = interpretAssistantRequest(
      "Ik wil zo'n filmpje maken waarin ik een doelpunt maak.",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    assert.equal(interpretation?.inferredSettings.actionPresetId, "goal_celebration");
    assert.equal(interpretation?.detectedIntent, "create_motion_video");
  });

  it("moonwalk maps to moonwalk preset", () => {
    const id = detectMotionActionPresetFromMessage("Ik wil een moonwalk doen");
    assert.equal(id, "moonwalk");
  });

  it("snowboard sprong maps to snowboard_jump preset", () => {
    const id = detectMotionActionPresetFromMessage("Maak een snowboard sprong video");
    assert.equal(id, "snowboard_jump");
  });

  it("preset prefill uses /animate/instant route", () => {
    const pkg = buildMotionActionPresetPrefillPackage({ presetId: "goal_celebration" });
    assert.ok(pkg);
    assert.match(pkg?.targetRoute ?? "", /\/animate\/instant/);
    assert.equal(pkg?.providerCalls, 0);
    assert.equal(pkg?.creditsConsumed, 0);
  });

  it("goal_celebration contains feasibility note about ball contact", () => {
    const preset = getMotionActionPreset("goal_celebration");
    assert.ok(preset);
    assert.ok(preset.feasibilityNote.toLowerCase().includes("balcontact"));
  });

  it("no provider calls during preset prefill", () => {
    const interpretation = interpretAssistantRequest("Ik scoor een doelpunt", { locale: "nl" });
    assert.ok(interpretation);
    const pkg = buildPrefillPackageFromInterpretation(interpretation, {});
    assert.ok(pkg);
    assert.equal(pkg?.providerCalls, 0);
    assert.equal(pkg?.creditsConsumed, 0);
  });

  it("motion wizard apply reads actionPresetId", () => {
    const pkg = buildMotionActionPresetPrefillPackage({ presetId: "moonwalk" });
    assert.ok(pkg);
    const patch = applyAssistantPrefillToInstantMotion(pkg);
    assert.equal(patch.actionPresetId, "moonwalk");
    assert.ok(patch.motionText?.includes("moonwalk"));
    assert.ok(patch.posterMotionSettings?.hcActionPreset?.actionPresetId === "moonwalk");
  });

  it("motion-ready check triggers for non-motion-ready character", () => {
    assert.equal(
      shouldPromptMotionReadyForActionPreset({
        actionPresetActive: true,
        motionReadyPreferred: true,
        attachedCharacterMotionReady: false,
        hasAttachedImage: true,
      }),
      true
    );
  });

  it("motion output metadata shape contains actionPresetId fields", () => {
    const preset = getMotionActionPreset("goal_celebration");
    assert.ok(preset);
    const metadata = buildMotionActionPresetMetadata(preset);
    assert.equal(metadata.actionPresetId, "goal_celebration");
    assert.equal(metadata.actionPresetCategory, "sports");
    assert.ok(metadata.promptTemplate.length > 0);
    assert.ok(metadata.feasibilityNote.length > 0);
  });

  it("all presets have required fields", () => {
    const errors = validateMotionActionPresets();
    assert.deepEqual(errors, []);
    assert.equal(getMotionActionPreset("city_sprint")?.requiredInputs.includes("person"), true);
  });

  it("featured action preset cards cover UI presets", () => {
    assert.ok(MOTION_ACTION_PRESET_FEATURED_IDS.includes("goal_celebration"));
    assert.ok(MOTION_ACTION_PRESET_FEATURED_IDS.includes("moonwalk"));
    assert.equal(MOTION_ACTION_PRESET_FEATURED_IDS.length, getAllMotionActionPresets().length);
  });

  it("assistant recommendations include action preset outcomes on home", () => {
    const snap = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const suggestions = buildAssistantSuggestions({
      snapshot: snap,
      pathname: "/",
    });
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.every((row) => row.promptMessage.length > 0));
  });

  it("extracts action preset metadata from poster settings", () => {
    const extracted = extractActionPresetFromPosterSettings({
      version: 1,
      hcActionPreset: {
        actionPresetId: "red_carpet_moment",
        actionPresetCategory: "comedy",
        actionPresetTitle: "Rode loper moment",
        promptTemplate: "red carpet pose",
        feasibilityNote: "reliable",
      },
    });
    assert.equal(extracted?.actionPresetId, "red_carpet_moment");
  });
});
