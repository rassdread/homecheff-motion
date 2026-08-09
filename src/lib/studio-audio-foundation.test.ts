/**
 * S.7B — Audio foundation unit tests (ownership, voice precedence, spec, jobs policy).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_AUDIO_NOT_IMPLEMENTED,
  STUDIO_AUDIO_OWNERSHIP,
  STUDIO_AUDIO_CACHE_POLICY,
  classifyAudioBillingBypass,
  isAudioBypassAllowedForNormalUser,
} from "@/lib/studio-audio-ownership";
import { resolveVoiceIdentity } from "@/lib/studio-audio-voice-resolver";
import {
  audioSpecificationFromQuickIntent,
  emptyAudioSpecification,
} from "@/lib/studio-audio-specification";
import { defaultStudioAudioMixContract } from "@/lib/studio-audio-mix-contract";
import { buildContinuityAudioContext } from "@/lib/studio-audio-continuity";
import { elevenLabsCapabilityFromAudioSpec } from "@/lib/studio-audio-provider-transforms";
import { getStudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import { studioCharacterListItem } from "@/test/studio-api-fixtures";
import type { StudioCharacterListItem } from "@/types/studio-api";

function character(
  partial: Partial<StudioCharacterListItem> & { id: string; name: string }
): StudioCharacterListItem {
  return studioCharacterListItem({
    id: partial.id,
    name: partial.name,
    voiceEnabled: true,
    voiceProvider: "elevenlabs",
    voiceProfile: "warm_narrator",
    voiceLanguage: "en",
    voiceLock: false,
    ...partial,
  });
}

describe("S.7B audio ownership", () => {
  it("defines canonical ownership scopes", () => {
    assert.equal(STUDIO_AUDIO_OWNERSHIP.CHARACTER_VOICE.sourceOfTruth.includes("StudioCharacter"), true);
    assert.equal(STUDIO_AUDIO_OWNERSHIP.NARRATION.sourceOfTruth.includes("StudioStoryboard"), true);
    assert.equal(STUDIO_AUDIO_OWNERSHIP.PROJECT_MUSIC.notes.includes("per-scene"), true);
    assert.equal(STUDIO_AUDIO_NOT_IMPLEMENTED.DUBBING, "NOT_IMPLEMENTED");
    assert.equal(STUDIO_AUDIO_NOT_IMPLEMENTED.AI_LIPSYNC, "NOT_IMPLEMENTED");
    assert.equal(STUDIO_AUDIO_CACHE_POLICY.cacheHit, "CACHE_HIT_NO_CHARGE");
  });

  it("locks admin/internal bypass away from normal production users", () => {
    assert.equal(
      classifyAudioBillingBypass({ isAdmin: true }),
      "ADMIN_ONLY"
    );
    assert.equal(
      classifyAudioBillingBypass({ productionChainBypass: true }),
      "INTERNAL_PIPELINE"
    );
    assert.equal(classifyAudioBillingBypass({}), "PRODUCTION_USER");
    assert.equal(isAudioBypassAllowedForNormalUser("PRODUCTION_USER"), false);
    assert.equal(isAudioBypassAllowedForNormalUser("ADMIN_ONLY"), true);
  });
});

describe("S.7B resolveVoiceIdentity precedence", () => {
  it("uses storyboard for narrator role", () => {
    const resolved = resolveVoiceIdentity({
      role: "narrator",
      storyboardVoiceProfile: "warm_narrator",
      storyboardVoiceLanguage: "nl",
    });
    assert.equal(resolved.source, "narrator");
    assert.equal(resolved.voiceProfile, "warm_narrator");
    assert.equal(resolved.language, "nl");
    assert.equal(resolved.overrideBlocked, false);
  });

  it("blocks storyboard override when Character voiceLock=true", () => {
    const locked = character({
      id: "c1",
      name: "Chef",
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const resolved = resolveVoiceIdentity({
      role: "character",
      character: locked,
      storyboardVoiceProfile: "commercial",
      language: "en",
    });
    assert.equal(resolved.source, "character");
    assert.equal(resolved.voiceProfile, "warm_narrator");
    assert.equal(resolved.voiceLock, true);
    assert.equal(resolved.overrideBlocked, true);
    assert.equal(resolved.attemptedOverrideProfile, "commercial");
  });

  it("keeps character profile for speaking role even when unlocked", () => {
    const unlocked = character({
      id: "c2",
      name: "Host",
      voiceProfile: "commercial",
      voiceLock: false,
    });
    const resolved = resolveVoiceIdentity({
      role: "character",
      character: unlocked,
      storyboardVoiceProfile: "warm_narrator",
    });
    assert.equal(resolved.source, "character");
    assert.equal(resolved.voiceProfile, "commercial");
    assert.equal(resolved.overrideBlocked, false);
  });

  it("falls back to project default when no character assigned", () => {
    const resolved = resolveVoiceIdentity({
      role: "unassigned",
      storyboardVoiceProfile: "warm_narrator",
    });
    assert.equal(resolved.source, "project_default");
    assert.equal(resolved.voiceProfile, "warm_narrator");
  });
});

describe("S.7B AudioSpecification + Matrix mapping", () => {
  it("builds provider-neutral specs from quick intents", () => {
    const voice = audioSpecificationFromQuickIntent("add_voice_over");
    assert.equal(voice.capability, "VOICE_TTS");
    assert.equal(voice.matrixExperienceId, "VOICE_TTS");
    assert.equal(voice.generationCapability, "VOICE_TTS");

    const music = audioSpecificationFromQuickIntent("create_music");
    assert.equal(music.scope, "PROJECT_MUSIC");
    assert.equal(music.brandAudio?.wired, false);

    const translate = audioSpecificationFromQuickIntent("translate_video");
    assert.equal(translate.translationIntent?.mode, "overlay_export");
  });

  it("maps ElevenLabs boundary capabilities", () => {
    assert.equal(elevenLabsCapabilityFromAudioSpec("VOICE_TTS"), "TTS");
    assert.equal(elevenLabsCapabilityFromAudioSpec("VOICE_CLONE"), "CLONE");
    assert.equal(elevenLabsCapabilityFromAudioSpec("MUSIC_GENERATE"), "MUSIC");
    assert.equal(elevenLabsCapabilityFromAudioSpec("SFX_GENERATE"), "SFX");
    assert.equal(elevenLabsCapabilityFromAudioSpec("SUBTITLE_TRANSCRIBE"), "STT");
  });

  it("keeps SFX GenerationJob scope as user library bed", () => {
    assert.equal(getStudioGenerationCapability("SFX_GENERATE").targetScope, "user");
    assert.equal(getStudioGenerationCapability("MUSIC_GENERATE").targetScope, "project");
    assert.equal(getStudioGenerationCapability("VOICE_CLONE").targetScope, "user");
  });
});

describe("S.7B mix + continuity contracts", () => {
  it("formalizes static bed mix contract", () => {
    const mix = defaultStudioAudioMixContract();
    assert.equal(mix.semantics, "static_beds_not_timeline");
    assert.equal(mix.inputs.subtitleBurnInSeparate, true);
    assert.equal(mix.looping.musicLoops, true);
  });

  it("builds audio continuity without provider calls", () => {
    const audio = buildContinuityAudioContext({
      storyboardVoiceProfile: "warm_narrator",
      storyboardVoiceLanguage: "en",
      projectMusicAssetId: "music-1",
      sfxBedAssetId: "sfx-1",
    });
    assert.equal(audio.narratorVoice?.voiceProfileId, "warm_narrator");
    assert.equal(audio.projectMusicAssetId, "music-1");
    assert.equal(audio.brandAudio.wired, false);
  });

  it("empty AudioSpecification stays structured (no giant prompt string)", () => {
    const spec = emptyAudioSpecification("SFX_GENERATE", "SCENE_SFX");
    assert.equal(spec.version, "7b.1");
    assert.equal(spec.sfx, null);
  });
});
