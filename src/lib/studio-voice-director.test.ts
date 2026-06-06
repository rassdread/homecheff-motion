import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVoiceRequest,
  estimateVoiceCredits,
  validateVoiceSettings,
} from "@/lib/elevenlabs-voice";
import { buildProductionScoreReport } from "@/lib/studio-production-score";
import {
  STUDIO_VOICE_PROFILE_PRESETS,
  getVoiceProfilePreset,
  normalizeStudioVoiceProfileId,
  profileIdForNarrationMode,
} from "@/lib/studio-voice-profiles";
import {
  buildVoiceScriptBundle,
  countWords,
  estimateSecondsFromWords,
} from "@/lib/studio-voice-script-builder";
import { analyzeVoiceDirector, computeVoiceScore } from "@/lib/studio-voice-director";
import { planVoiceTiming } from "@/lib/studio-voice-timing";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

function scene(order: number, partial?: Partial<StudioSceneDetail>): StudioSceneDetail {
  return studioSceneDetail({
    id: `scene-${order}`,
    order,
    title: partial?.title ?? `Scene ${order + 1}`,
    description: partial?.description ?? "Team collaborates in a bright office.",
    action: partial?.action ?? "",
    emotion: partial?.emotion ?? "hopeful",
    durationSeconds: partial?.durationSeconds ?? 5,
    location: partial?.location ?? null,
    characters: partial?.characters ?? [],
    ...partial,
  });
}

function storyboard(scenes: StudioSceneDetail[], voice?: Partial<StudioStoryboardDetail>): StudioStoryboardDetail {
  return studioStoryboardDetail({
    title: "HomeCheff Journey",
    description: "A founder story about building community through food.",
    aiDirectorPrompt: "Like an Apple commercial",
    voiceEnabled: voice?.voiceEnabled ?? true,
    voiceLanguage: voice?.voiceLanguage ?? "en",
    voiceStyle: voice?.voiceStyle ?? "warm",
    voiceProfile: voice?.voiceProfile ?? "warm_narrator",
    narrationMode: voice?.narrationMode ?? "narrator",
    voiceNarrationScript: voice?.voiceNarrationScript ?? "",
    scenes,
    ...voice,
  });
}

describe("studio-voice-director", () => {
  it("voice presets expose ElevenLabs recommendations and pacing", () => {
    const preset = getVoiceProfilePreset("documentary");
    assert.ok(preset.elevenLabsVoiceRecommendation.includes("documentary"));
    assert.ok(preset.stability >= 0 && preset.stability <= 1);
    assert.ok(preset.speakingPaceWpm > 100);
  });

  it("profileIdForNarrationMode maps founder to inspirational_founder", () => {
    assert.equal(profileIdForNarrationMode("founder"), "inspirational_founder");
    assert.equal(normalizeStudioVoiceProfileId("invalid"), "warm_narrator");
  });

  it("buildVoiceScriptBundle generates full, scene, short, and subtitle narrations", () => {
    const sb = storyboard([
      scene(0, { title: "Opening", description: "We welcome viewers to Rotterdam." }),
      scene(1, { title: "Growth", description: "The team scales with purpose." }),
    ]);
    const bundle = buildVoiceScriptBundle({ storyboard: sb, narrationMode: "founder" });
    assert.ok(bundle.fullNarration.length > 40);
    assert.equal(bundle.sceneNarrations.length, 2);
    assert.ok(bundle.shortNarration.length > 0);
    assert.ok(bundle.subtitleNarration.includes("|"));
  });

  it("planVoiceTiming warns when narration exceeds scene duration", () => {
    const sb = storyboard([
      scene(0, {
        durationSeconds: 2,
        description:
          "A very long narration line that should exceed the short scene duration budget when spoken at normal pace.",
      }),
    ]);
    const script = buildVoiceScriptBundle({ storyboard: sb });
    const timing = planVoiceTiming({
      storyboard: sb,
      script,
      profile: STUDIO_VOICE_PROFILE_PRESETS.commercial,
    });
    assert.ok(timing.totalWords > 5);
    assert.ok(timing.estimatedSeconds > 0);
    assert.ok(
      timing.warnings.some((w) => w.code === "exceeds_scene_duration" || w.code === "narration_too_long")
    );
  });

  it("validateVoiceSettings requires script when voice enabled", () => {
    const invalid = validateVoiceSettings({
      voiceEnabled: true,
      voiceLanguage: "en",
      voiceProfile: "warm_narrator",
      narrationMode: "narrator",
      script: "",
    });
    assert.equal(invalid.ok, false);
    const valid = validateVoiceSettings({
      voiceEnabled: true,
      voiceLanguage: "en",
      voiceProfile: "warm_narrator",
      narrationMode: "narrator",
      script: "Hello world narration.",
    });
    assert.equal(valid.ok, true);
  });

  it("buildVoiceRequest and estimateVoiceCredits stay planning-only", () => {
    const request = buildVoiceRequest({
      script: "Sample narration for ElevenLabs planning.",
      voiceProfile: "premium_brand",
      voiceLanguage: "en",
      narrationMode: "cinematic",
    });
    assert.ok(request.voice_id_recommendation.length > 0);
    assert.equal(request.voice_settings.stability, STUDIO_VOICE_PROFILE_PRESETS.premium_brand.stability);
    const credits = estimateVoiceCredits(request.text.length);
    assert.ok(credits.estimatedCredits >= 1);
  });

  it("computeVoiceScore rewards valid enabled voice plans", () => {
    const sb = storyboard([scene(0), scene(1)]);
    const report = analyzeVoiceDirector(sb);
    const score = computeVoiceScore({
      enabled: true,
      script: report.script,
      timing: report.timing,
      settingsValid: true,
    });
    assert.ok(score > 30);
  });

  it("buildProductionScoreReport includes overallProductionScore with voice", () => {
    const sb = storyboard([scene(0), scene(1), scene(2)], { voiceEnabled: true });
    const production = buildProductionScoreReport(sb);
    assert.ok(production.overallProductionScore >= 0);
    assert.ok(production.overallProductionScore <= 100);
    assert.ok(typeof production.voiceScore === "number");
    assert.ok(production.storyScore > 0);
  });

  it("countWords and estimateSecondsFromWords align with profile WPM", () => {
    const words = countWords("one two three four five");
    assert.equal(words, 5);
    const seconds = estimateSecondsFromWords(words, 150);
    assert.ok(seconds >= 1 && seconds <= 5);
  });
});
