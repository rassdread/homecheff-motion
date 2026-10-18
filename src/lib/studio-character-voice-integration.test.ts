import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildVoiceRequest } from "@/lib/elevenlabs-voice";
import {
  normalizeElevenLabsSpeechSpeed,
  readCharacterSpeechSpeed,
  voiceProfilesWithSpeechSpeed,
} from "@/lib/elevenlabs-speech-speed";
import { studioCharacterFormToUpdatePayload } from "@/components/studio/studio-character-form";
import { buildVoicePreviewTextHash } from "@/lib/studio-voice-preview-cache-key";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";
import { decideVoicePreviewCharge } from "@/lib/studio-voice-preview-charge";
import type { StudioCharacterDetail } from "@/types/studio-api";

const voice = {
  voiceEnabled: true,
  voiceProvider: "elevenlabs",
  voiceProfile: "library:21m00Tcm4TlvDq8ikWAM",
  voiceLanguage: "nl",
  voiceGender: "",
  voiceDescription: "Warm",
  voiceNotes: "",
  voiceLock: false,
  speechSpeed: 1,
  voiceProfilesByLanguage: {},
};

describe("character voice integration", () => {
  it("keeps the reference image when the voice changes and the voice when the image changes", () => {
    const previous = {
      referenceImageUrl: "https://example.com/baker.png",
      referenceStorageKey: "studio/baker/main.png",
    } as StudioCharacterDetail;
    const values = {
      identity: {
        name: "Baker",
        description: "Warm kitchen",
        characterType: "human",
        role: "human",
        visualStyle: "",
        shapeLanguage: "",
        energy: "",
        personality: "Friendly",
        colorTheme: "",
        clothing: "",
        accessories: "",
        appearanceMemory: "",
        forbiddenElements: "",
        usageContext: "",
        worldProfileId: null,
      },
      referenceImageUrl: "https://example.com/baker.png",
      referenceStorageKey: "studio/baker/main.png",
      voice: { ...voice, voiceProfile: "library:EXAVITQu4vr4xnSDxMaL" },
      performance: {
        performanceEnabled: false,
        defaultSmileStrength: 0,
        defaultBlinkRate: "",
        defaultHeadMovement: "",
        defaultMouthIntensity: "",
        idleAnimationStyle: "",
        performanceNotes: "",
        mouthAnimationEnabled: false,
        mouthClosedAssetUrl: "",
        mouthSmallAssetUrl: "",
        mouthMediumAssetUrl: "",
        mouthWideAssetUrl: "",
      },
    };
    const voiceChange = studioCharacterFormToUpdatePayload(values, previous);
    assert.equal(voiceChange.voiceProfile, "library:EXAVITQu4vr4xnSDxMaL");
    assert.equal(voiceChange.referenceImageUrl, undefined);

    const imageChange = studioCharacterFormToUpdatePayload(
      {
        ...values,
        referenceImageUrl: "https://example.com/baker-2.png",
        referenceStorageKey: "studio/baker/next.png",
      },
      previous
    );
    assert.equal(imageChange.referenceImageUrl, "https://example.com/baker-2.png");
    assert.equal(imageChange.voiceProfile, "library:EXAVITQu4vr4xnSDxMaL");
    assert.equal(imageChange.speechSpeed, 1);
  });

  it("plays a cached preview for free and requires confirmation before an uncached charge", () => {
    assert.deepEqual(
      decideVoicePreviewCharge({
        cacheHit: true,
        confirmCharge: false,
        credits: 15,
        studioHcAvailable: 9625,
      }),
      { action: "play_free" }
    );
    assert.deepEqual(
      decideVoicePreviewCharge({
        cacheHit: false,
        confirmCharge: false,
        credits: 15,
        studioHcAvailable: 9625,
      }),
      { action: "require_confirmation" }
    );
    assert.deepEqual(
      decideVoicePreviewCharge({
        cacheHit: false,
        confirmCharge: true,
        credits: 15,
        studioHcAvailable: 9625,
      }),
      { action: "charge" }
    );
    assert.deepEqual(
      decideVoicePreviewCharge({
        cacheHit: false,
        confirmCharge: true,
        credits: 15,
        studioHcAvailable: 10,
      }),
      { action: "insufficient" }
    );
  });

  it("accepts only ElevenLabs speech speeds and stores a non-default speed beside the voice profile", () => {
    assert.equal(normalizeElevenLabsSpeechSpeed(1.03), 1);
    assert.equal(normalizeElevenLabsSpeechSpeed(1.05), 1.05);
    assert.equal(normalizeElevenLabsSpeechSpeed(1.2), 1.2);
    assert.equal(readCharacterSpeechSpeed({ speechSpeed: 0.8, en: { voiceProfile: "warm_narrator" } }), 0.8);
    const stored = voiceProfilesWithSpeechSpeed({ en: { voiceProfile: "warm_narrator" } }, 1.1);
    assert.equal(stored?.speechSpeed, 1.1);
    assert.equal((stored?.en as { voiceProfile: string }).voiceProfile, "warm_narrator");
    const request = buildVoiceRequest({
      script: "Hallo.",
      voiceProfile: "warm_narrator",
      voiceLanguage: "nl",
      narrationMode: "narrator",
      speechSpeed: 1.1,
    });
    assert.equal(request.model_id, "eleven_multilingual_v2");
    assert.equal(request.speed, 1.1);
    const base = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
    });
    const same = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
      speechSpeed: 1,
    });
    const faster = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
      speechSpeed: 1.1,
    });
    const slower = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
      speechSpeed: 0.9,
    });
    const five = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
      speechSpeed: 1.05,
    });
    const withSettings = buildVoicePreviewTextHash({
      voiceId: "voice",
      previewText: "Hallo.",
      language: "nl",
      modelId: request.model_id,
      speechSpeed: 1,
      provider: "elevenlabs",
      voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
    });
    assert.equal(base, same);
    assert.notEqual(base, faster);
    assert.notEqual(faster, slower);
    assert.notEqual(faster, five);
    assert.notEqual(base, withSettings);
    const requestFast = buildVoiceRequest({
      script: "I love baking cupcakes.",
      voiceProfile: "library:21m00Tcm4TlvDq8ikWAM",
      voiceLanguage: "en",
      narrationMode: "narrator",
      speechSpeed: 1.05,
    });
    assert.equal(requestFast.speed, 1.05);
    assert.equal(requestFast.model_id, "eleven_multilingual_v2");
  });

  it("only accepts an internal project return path", () => {
    assert.equal(
      safeStudioProjectReturnTo("/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters"),
      "/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters"
    );
    assert.equal(safeStudioProjectReturnTo("https://evil.example/studio/projects/x"), null);
    assert.equal(safeStudioProjectReturnTo("//evil.example"), null);
  });

  it("checks the preview cache before billing and keeps character routes behind the session", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/studio/characters/[id]/voice-preview/route.ts"),
      "utf8"
    );
    assert.match(route, /requireActiveUser/);
    assert.match(route, /cacheOnly: true/);
    const cacheAt = route.indexOf("cacheOnly: true");
    const billAt = route.lastIndexOf("runBilledProviderRoute");
    assert.ok(cacheAt > 0 && cacheAt < billAt);
    assert.match(route, /voicePreviewChargeResponse/);
    const masters = readFileSync(
      join(process.cwd(), "src/app/studio/projects/[projectId]/character-masters/page.tsx"),
      "utf8"
    );
    assert.match(masters, /replaceExisting \|\| !savedKeys.has/);
  });
});
