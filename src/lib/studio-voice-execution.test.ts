import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachVoiceToHandoffPayload } from "@/lib/attach-voice-handoff";
import {
  buildSrtFromSubtitleEntries,
  buildSubtitleEntriesFromVoiceSegments,
} from "@/lib/studio-subtitle-track";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { buildTimedVoiceSegments } from "@/lib/studio-voice-timing-execution";
import { STUDIO_VOICE_FIELD_AUDIT } from "@/lib/studio-voice-field-audit";
import { buildVoiceRequest, estimateVoiceCredits } from "@/lib/elevenlabs-voice";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

function minimalStoryboard(): StudioStoryboardDetail {
  return {
    id: "sb-1",
    ownerId: "user-1",
    title: "Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceStyle: "warm",
    voiceProfile: "warm_narrator",
    narrationMode: "narrator",
    voiceNarrationScript: "Welcome to HomeCheff. Our chef mascot guides you through the kitchen.",
    autoSelectImprovedImage: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes: [
      {
        id: "scene-1",
        storyboardId: "sb-1",
        order: 0,
        title: "Intro",
        description: "Kitchen intro",
        action: "wave",
        emotion: "happy",
        camera: "wide_shot",
        shotType: "wide",
        cameraMovement: "static",
        sceneEnergy: "neutral",
        transitionToNext: "",
        durationSeconds: 6,
        locationId: null,
        location: null,
        characters: [],
        props: [],
        sceneImages: [],
        selectedSceneImageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  } as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-1",
    title: "Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "strong",
    consistencyReport: null,
    overallConsistencyScore: 0,
    driftWarnings: [],
    correctionRecommendations: [],
    consistencyHistory: [],
    latestImprovementScore: null,
    visionReport: null,
    overallVisionScore: 0,
    visionWarnings: [],
    characterConsistencyReport: null,
    overallCharacterConsistencyScore: 0,
    characterDriftWarnings: [],
    perSceneCharacterIdentityScores: [],
    scenes: [],
  };
}

describe("studio-voice-execution V31", () => {
  it("documents voice field audit", () => {
    const used = STUDIO_VOICE_FIELD_AUDIT.filter((r) => r.status === "used");
    assert.ok(used.some((r) => r.field === "voiceNarrationScript"));
  });

  it("buildTimedVoiceSegments returns start/end per scene", () => {
    const sb = minimalStoryboard();
    const report = analyzeVoiceDirector(sb);
    const segments = buildTimedVoiceSegments({
      storyboard: sb,
      script: report.script,
      profile: getVoiceProfilePreset("warm_narrator"),
      actualDurationSeconds: 12,
    });
    assert.ok(segments.length > 0);
    assert.ok(segments[0]!.endSeconds > segments[0]!.startSeconds);
  });

  it("builds SRT from subtitle entries", () => {
    const entries = buildSubtitleEntriesFromVoiceSegments([
      {
        sceneId: "scene-1",
        order: 0,
        startSeconds: 0,
        endSeconds: 3,
        durationSeconds: 3,
        text: "Hello world",
      },
    ]);
    const srt = buildSrtFromSubtitleEntries(entries);
    assert.match(srt, /00:00:00,000 --> 00:00:03,000/);
    assert.match(srt, /Hello world/);
  });

  it("attachVoiceToHandoffPayload adds v13 voice fields", () => {
    const payload = attachVoiceToHandoffPayload(minimalHandoff(), {
      storyboard: minimalStoryboard(),
      voice: {
        language: "en",
        provider: "mock",
        voiceProfile: "warm_narrator",
        voiceStyle: "warm",
        audioUrl: "https://example.com/voice.mp3",
        durationSeconds: 12,
        status: "completed",
      },
      subtitle: {
        language: "en",
        status: "ready",
        entriesJson: [{ start: 0, end: 3, text: "Hello", sceneId: "scene-1" }],
      },
    });
    assert.equal(payload.version, 23);
    assert.ok(payload.voiceMetadata?.ready);
    assert.equal(payload.subtitleAvailability, true);
    assert.ok(payload.subtitleTrack?.srt.includes("Hello"));
  });

  it("legacy handoff without voice leaves metadata absent", () => {
    const legacy = { ...minimalHandoff(), version: 11 as typeof MOTION_HANDOFF_PAYLOAD_VERSION };
    const attached = attachVoiceToHandoffPayload(legacy, {
      storyboard: { ...minimalStoryboard(), voiceEnabled: false },
      voice: null,
      subtitle: null,
    });
    assert.equal(attached.voiceMetadata?.ready, false);
  });

  it("buildVoiceRequest produces ElevenLabs-shaped request", () => {
    const req = buildVoiceRequest({
      script: "Test narration for the brand.",
      voiceProfile: "warm_narrator",
      voiceLanguage: "en",
      narrationMode: "narrator",
    });
    assert.ok(req.text.length > 0);
    assert.equal(req.model_id, "eleven_multilingual_v2");
    assert.ok(estimateVoiceCredits(req.text.length).estimatedCredits >= 1);
  });
});
