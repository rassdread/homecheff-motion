import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVoiceRequest, synthesizeElevenLabsSpeech } from "@/lib/elevenlabs-voice";
import { listCharacterVoiceHistory } from "@/server/studio/studio-character-voice-history";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem } from "@/types/studio-api";

function sampleCharacter(overrides: Partial<StudioCharacterListItem> = {}): StudioCharacterListItem {
  return {
    id: "char-1",
    ownerId: "user-1",
    name: "Chef Mascot",
    slug: "chef-mascot",
    role: "protagonist",
    description: "",
    personality: "",
    referenceImageUrl: "",
    isMascot: true,
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: "",
    defaultClothing: "",
    defaultAccessories: "",
    visualKeywords: "",
    primaryReferenceImageId: null,
    referenceNotes: "",
    identityStrength: "strong",
    continuityStrength: "strong",
    worldProfileId: null,
    worldProfile: null,
    voiceEnabled: true,
    voiceProvider: "elevenlabs",
    voiceProfile: "warm_narrator",
    voiceLanguage: "nl",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("studio voice identity sprint", () => {
  it("buildVoiceRequest includes language_code", () => {
    const req = buildVoiceRequest({
      script: "Hallo wereld",
      voiceProfile: "warm_narrator",
      voiceLanguage: "nl",
      narrationMode: "narrator",
    });
    assert.equal(req.language_code, "nl");
  });

  it("resolveCharacterVoiceIdentity respects voice lock against storyboard override", () => {
    const character = sampleCharacter({
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const identity = resolveCharacterVoiceIdentity({
      character,
      language: "nl",
      attemptedOverrideProfile: "confident_creator",
    });
    assert.equal(identity.voiceProfile, "warm_narrator");
    assert.equal(identity.source, "locked_base");
  });

  it("resolveCharacterVoiceIdentity uses language override when set", () => {
    const character = sampleCharacter({
      voiceProfilesByLanguage: {
        nl: { voiceProfile: "friendly_guide" },
      },
    });
    const identity = resolveCharacterVoiceIdentity({
      character,
      language: "nl",
    });
    assert.equal(identity.voiceProfile, "friendly_guide");
    assert.equal(identity.source, "language_override");
  });

  it("listCharacterVoiceHistory is exported and callable", () => {
    assert.equal(typeof listCharacterVoiceHistory, "function");
  });

  it("synthesizeElevenLabsSpeech sends language_code in POST body when configured", async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody = "";
    globalThis.fetch = (async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    }) as typeof fetch;

    process.env.ELEVENLABS_API_KEY = "test-key";

    try {
      await synthesizeElevenLabsSpeech({
        voiceProfile: "warm_narrator",
        request: buildVoiceRequest({
          script: "Test",
          voiceProfile: "warm_narrator",
          voiceLanguage: "nl",
          narrationMode: "narrator",
        }),
      });
      const parsed = JSON.parse(capturedBody) as { language_code?: string };
      assert.equal(parsed.language_code, "nl");
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.ELEVENLABS_API_KEY;
    }
  });
});
