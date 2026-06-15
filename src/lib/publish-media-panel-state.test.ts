import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPublishProject } from "@/lib/publish-overlay-session";
import {
  applyProductionConfigForExport,
  buildProductionSummaries,
  buildVoiceReviewDetail,
  defaultPublishProductionConfig,
  loadPublishProductionFromProject,
  patchPublishProduction,
  resolveVoiceLabelFromSettings,
} from "@/lib/publish-media-production";
import {
  musicPanelVisibility,
  productionConfigAfterStepChange,
  subtitlesPanelVisibility,
  updateMusicMode,
  updateSubtitlesMode,
  updateVoiceMode,
  voicePanelVisibility,
} from "@/lib/publish-media-panel-state";

describe("publish-media-panel-state", () => {
  it("clicking AI voice shows script controls and hides empty state", () => {
    const base = defaultPublishProductionConfig().voice;
    const next = updateVoiceMode(base, "ai_voice", { defaultScript: "Hello world" });

    const visibility = voicePanelVisibility(next);
    assert.equal(visibility.emptyState, false);
    assert.equal(visibility.aiControls, true);
    assert.equal(visibility.recordedControls, false);
    assert.equal(visibility.generateVoiceAction, true);
    assert.equal(next.script, "Hello world");
  });

  it("clicking Geen voice hides controls and clears label", () => {
    const voice = updateVoiceMode(defaultPublishProductionConfig().voice, "ai_voice", {
      defaultScript: "Narration",
    });
    const next = updateVoiceMode(voice, "none");

    const visibility = voicePanelVisibility(next);
    assert.equal(visibility.emptyState, true);
    assert.equal(visibility.aiControls, false);
    assert.equal(visibility.scopeControls, false);
    assert.equal(next.label, "");
    assert.equal(next.script, "");
  });

  it("clicking AI music shows generation controls", () => {
    const base = { ...defaultPublishProductionConfig().music, mood: "" };
    const next = updateMusicMode(base, "generate", { suggestedMood: "uplifting" });

    const visibility = musicPanelVisibility(next);
    assert.equal(visibility.emptyState, false);
    assert.equal(visibility.generateControls, true);
    assert.equal(visibility.libraryPicker, false);
    assert.equal(visibility.uploadControls, false);
    assert.equal(next.provider, "elevenlabs");
    assert.equal(next.mood, "uplifting");
  });

  it("clicking library music shows picker", () => {
    const base = defaultPublishProductionConfig().music;
    const next = updateMusicMode(base, "library");

    const visibility = musicPanelVisibility(next);
    assert.equal(visibility.libraryPicker, true);
    assert.equal(visibility.generateControls, false);
    assert.equal(next.mode, "library");
  });

  it("clicking subtitles automatic updates review summary", () => {
    const base = defaultPublishProductionConfig().subtitles;
    const next = updateSubtitlesMode(base, "automatic");

    const visibility = subtitlesPanelVisibility(next);
    assert.equal(visibility.automaticControls, true);
    assert.equal(visibility.styleControls, true);
    assert.match(next.label, /Dutch Auto|Auto/i);

    const production = { ...defaultPublishProductionConfig(), subtitles: next };
    const voiceRow = buildProductionSummaries(production).find((row) => row.section === "subtitles");
    assert.ok(voiceRow?.active);
    assert.match(voiceRow?.detail ?? "", /Auto/i);
  });

  it("AI voice review shows Dutch Female Friendly and none shows Geen voice key", () => {
    const aiVoice = updateVoiceMode(defaultPublishProductionConfig().voice, "ai_voice");
    aiVoice.label = resolveVoiceLabelFromSettings(aiVoice);
    assert.match(aiVoice.label, /Dutch Female.*Friendly/i);
    assert.equal(buildVoiceReviewDetail(aiVoice), aiVoice.label);

    const noneVoice = updateVoiceMode(aiVoice, "none");
    assert.equal(buildVoiceReviewDetail(noneVoice), "publish.media.review.voiceNone");
  });

  it("state survives step change via project metadata", () => {
    let project = createPublishProject({ name: "Media", videoUrl: "https://example.com/v.mp4" });
    const production = defaultPublishProductionConfig();
    production.voice = updateVoiceMode(production.voice, "ai_voice", { defaultScript: "Line one" });
    production.music = updateMusicMode(production.music, "generate");

    project = patchPublishProduction(project, production);
    const afterMedia = productionConfigAfterStepChange(project, "media");
    assert.equal(afterMedia?.voice.mode, "ai_voice");
    assert.equal(afterMedia?.music.mode, "generate");

    const afterReview = productionConfigAfterStepChange(project, "review");
    assert.equal(afterReview?.voice.script, "Line one");

    const reloaded = loadPublishProductionFromProject(project);
    assert.equal(reloaded.voice.mode, "ai_voice");
    assert.equal(reloaded.music.mode, "generate");
  });

  it("export receives selected production config", () => {
    let project = createPublishProject({ name: "Export", videoUrl: "https://example.com/v.mp4" });
    const production = defaultPublishProductionConfig();
    production.voice = {
      ...updateVoiceMode(production.voice, "ai_voice", { defaultScript: "Export narration" }),
      label: "Dutch Female – Friendly",
    };
    production.music = updateMusicMode(production.music, "library");
    production.music.trackId = "cinematic_inspire";
    production.music.label = "Cinematic Inspire";
    production.subtitles = updateSubtitlesMode(production.subtitles, "automatic");

    project = patchPublishProduction(project, production);
    const exported = applyProductionConfigForExport(project);

    assert.equal(exported.metadata?.voiceScript, "Export narration");
    assert.equal(exported.metadata?.musicDirection, "Cinematic Inspire");
    assert.equal(exported.metadata?.subtitlesMode, "automatic");
    assert.ok(exported.metadata?.publishProduction);
    const loaded = loadPublishProductionFromProject(exported);
    assert.equal(loaded.voice.mode, "ai_voice");
    assert.equal(loaded.music.mode, "library");
  });
});
