import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPublishProject } from "@/lib/publish-overlay-session";
import {
  applyProductionConfigToProject,
  buildProductionSummaries,
  defaultPublishProductionConfig,
  hydrateProductionFromLegacyProject,
  loadPublishProductionFromProject,
  patchPublishProduction,
  productionNeedsEmptyStateCtas,
  resolveVoiceLabelFromSettings,
  savePublishProductionToProject,
} from "@/lib/publish-media-production";
import { nextPublishWizardStep, PUBLISH_WIZARD_STEPS } from "@/lib/publish-wizard-flow";

describe("publish-media-production", () => {
  it("wizard includes media step between proposal and review", () => {
    const proposalIdx = PUBLISH_WIZARD_STEPS.indexOf("proposal");
    const mediaIdx = PUBLISH_WIZARD_STEPS.indexOf("media");
    const reviewIdx = PUBLISH_WIZARD_STEPS.indexOf("review");
    assert.ok(mediaIdx > proposalIdx);
    assert.ok(reviewIdx > mediaIdx);
    assert.equal(nextPublishWizardStep("proposal"), "media");
    assert.equal(nextPublishWizardStep("media"), "review");
  });

  it("persists production config on project metadata", () => {
    const project = createPublishProject({ name: "Test", videoUrl: "https://example.com/v.mp4" });
    const production = defaultPublishProductionConfig();
    production.voice.mode = "ai_voice";
    production.voice.label = "Dutch Female – Friendly";
    production.voice.script = "Welcome to HomeCheff";
    const saved = savePublishProductionToProject(project, production);
    const loaded = loadPublishProductionFromProject(saved);
    assert.equal(loaded.voice.mode, "ai_voice");
    assert.equal(loaded.voice.script, "Welcome to HomeCheff");
  });

  it("hydrates voice and subtitles from legacy timeline and subtitles", () => {
    const project = createPublishProject({ name: "Legacy", videoUrl: "https://example.com/v.mp4" });
    project.subtitles = [
      {
        id: "sub1",
        text: "Hello",
        startTime: 0,
        endTime: 2,
        x: 0.5,
        y: 0.9,
        language: "nl",
        safeAreaStatus: "ok",
      },
    ];
    const hydrated = hydrateProductionFromLegacyProject(project);
    assert.equal(hydrated.subtitles.mode, "automatic");
    assert.match(hydrated.subtitles.label, /Dutch|nl/i);
  });

  it("builds review summaries for all production sections", () => {
    const config = defaultPublishProductionConfig();
    config.voice = {
      ...config.voice,
      mode: "ai_voice",
      label: resolveVoiceLabelFromSettings({ ...config.voice, mode: "ai_voice" }),
    };
    config.music.mode = "generate";
    config.music.label = "Cinematic Inspire";
    config.soundEffects.mode = "auto";
    config.subtitles.mode = "automatic";
    config.subtitles.language = "nl";
    config.textOverlays.items = [
      { id: "o1", kind: "title", text: "Title", position: "top", preset: "homecheff" },
    ];
    const summaries = buildProductionSummaries(config);
    assert.equal(summaries.length, 5);
    assert.ok(summaries.every((row) => row.active || row.detail));
  });

  it("flags empty production for CTA display", () => {
    assert.equal(productionNeedsEmptyStateCtas(defaultPublishProductionConfig()), true);
    const configured = patchPublishProduction(createPublishProject({ name: "X", videoUrl: "u" }), {
      voice: { ...defaultPublishProductionConfig().voice, mode: "ai_voice", label: "AI" },
    });
    assert.equal(productionNeedsEmptyStateCtas(loadPublishProductionFromProject(configured)), false);
  });

  it("applies production config to project metadata for export", () => {
    let project = createPublishProject({ name: "Export", videoUrl: "https://example.com/v.mp4" });
    project = patchPublishProduction(project, {
      voice: {
        ...defaultPublishProductionConfig().voice,
        mode: "ai_voice",
        script: "Narration line",
        label: "Dutch Female – Friendly",
      },
      music: {
        ...defaultPublishProductionConfig().music,
        mode: "generate",
        mood: "cinematic",
        label: "Cinematic Inspire",
      },
    });
    const applied = applyProductionConfigToProject(project);
    assert.equal(applied.metadata?.voiceScript, "Narration line");
    assert.equal(applied.metadata?.musicDirection, "Cinematic Inspire");
    assert.ok(applied.metadata?.publishProduction);
  });
});
