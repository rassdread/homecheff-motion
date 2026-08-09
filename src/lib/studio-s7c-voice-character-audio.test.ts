/**
 * S.7C — Voice & Character Audio foundation tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCharacterVoiceStudio } from "@/lib/studio-character-voice-studio";
import { buildStoryboardVoiceCastingPlan } from "@/lib/studio-voice-casting";
import { buildStoryboardDialoguePlan, dialogueLineToAudioIntent } from "@/lib/studio-dialogue-system";
import { buildCharacterVoiceVariants, resolveCharacterVoiceVariant } from "@/lib/studio-voice-variants";
import { normalizeStudioVoiceEmotion } from "@/lib/studio-voice-emotion";
import { normalizeStudioVoiceStyle } from "@/lib/studio-voice-style";
import {
  getStudioVoiceExperiencePack,
  listStudioVoiceExperiencePacks,
  voicePackToOpenExperienceInput,
} from "@/lib/studio-voice-experience-packs";
import { organizeVoiceLibraryEntries } from "@/lib/studio-voice-library-organize";
import { recommendVoicePerformance } from "@/lib/studio-voice-performance-guidance";
import { checkCharacterVoiceContinuity } from "@/lib/studio-voice-continuity";
import {
  audioSpecificationFromCharacterVoiceStudio,
  audioSpecificationFromDialogueLine,
} from "@/lib/studio-voice-matrix-mapping";
import { buildWorkspaceVoiceEntity } from "@/lib/studio-workspace-voice-entity";
import { STUDIO_AUDIO_EXPERIENCE_PACK_STATUS } from "@/lib/studio-audio-director-boundary";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("S.7C Character Voice Studio", () => {
  it("builds canonical Voice Studio from Character without provider calls", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
      voiceNotes: "warm, dutch; culinary",
    });
    const studio = buildCharacterVoiceStudio(character, "en");
    assert.equal(studio.version, "7c.1");
    assert.equal(studio.characterId, "c1");
    assert.equal(studio.identity.voiceLock, true);
    assert.equal(studio.variants.length, 7);
    assert.equal(studio.preview.replacesFinalGeneration, false);
    assert.equal(studio.reuse.reuseWithoutRegeneration, true);
    assert.ok(studio.characteristics.voiceTags.includes("warm"));
  });

  it("keeps variants linked to the same Character", () => {
    const variants = buildCharacterVoiceVariants("c1");
    assert.ok(variants.every((v) => v.characterId === "c1"));
    const happy = resolveCharacterVoiceVariant("c1", "happy");
    assert.equal(happy.id, "happy");
    assert.equal(happy.emotionHint, "happy");
  });
});

describe("S.7C casting + dialogue", () => {
  it("casts narrator and characters without mutating Character identity", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      voiceProfile: "commercial",
      voiceLanguage: "en",
      scenes: [
        studioSceneDetail({
          order: 0,
          characters: [chef],
          description: "Chef greets guests",
        }),
      ],
    });
    const casting = buildStoryboardVoiceCastingPlan(storyboard);
    assert.equal(casting.mutatesCharacterIdentity, false);
    const characterCast = casting.assignments.find((a) => a.role === "character");
    assert.equal(characterCast?.voiceProfile, "warm_narrator");
    assert.equal(characterCast?.voiceLock, true);
  });

  it("builds multi-speaker dialogue from tagged script", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const host = studioCharacterListItem({
      id: "c2",
      name: "Host",
      voiceEnabled: true,
      voiceProfile: "commercial",
      voiceLock: false,
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      voiceStyle: "podcast",
      voiceNarrationScript: "[Chef] Welcome.\n[Host] Thank you.",
      scenes: [
        studioSceneDetail({ order: 0, characters: [chef, host] }),
      ],
    });
    const plan = buildStoryboardDialoguePlan(storyboard);
    assert.equal(plan.providerNeutral, true);
    assert.equal(plan.conversationMode, "podcast");
    assert.equal(plan.lines.length, 2);
    assert.equal(plan.lines[0]?.speakerName, "Chef");
    assert.equal(plan.lines[0]?.voiceIntent.voiceLock, true);
    const intent = dialogueLineToAudioIntent(plan.lines[0]!);
    assert.equal(intent.locked, true);
  });

  it("maps dialogue line to provider-neutral AudioSpecification", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      voiceNarrationScript: "[Chef] Hello kitchen.",
      scenes: [studioSceneDetail({ order: 0, characters: [chef] })],
    });
    const plan = buildStoryboardDialoguePlan(storyboard);
    const spec = audioSpecificationFromDialogueLine(plan.lines[0]!);
    assert.equal(spec.capability, "VOICE_TTS");
    assert.equal(spec.characterVoice?.locked, true);
    assert.equal(spec.script, "Hello kitchen.");
    assert.ok(!JSON.stringify(spec).includes("stability"));
  });
});

describe("S.7C emotion/style/performance/packs", () => {
  it("normalizes structured emotion and style", () => {
    assert.equal(normalizeStudioVoiceEmotion("Happy"), "happy");
    assert.equal(normalizeStudioVoiceStyle("TikTok"), "tiktok");
  });

  it("recommends performance without forcing", () => {
    const g = recommendVoicePerformance({ style: "homecheff" });
    assert.equal(g.forced, false);
    assert.ok(g.toneHints.includes("homecheff"));
  });

  it("lists voice experience packs mapped to Matrix engines", () => {
    const packs = listStudioVoiceExperiencePacks();
    assert.ok(packs.length >= 10);
    const voice = getStudioVoiceExperiencePack("VOICE_STUDIO");
    assert.equal(voice.matrixExperienceId, "VOICE_TTS");
    assert.equal(voice.status, "PARTIAL");
    const open = voicePackToOpenExperienceInput("VOICE_CLONE_STUDIO");
    assert.equal(open.doorHint, "voice_clone_studio");
    assert.equal(STUDIO_AUDIO_EXPERIENCE_PACK_STATUS.VoiceStudio, "PARTIAL");
  });

  it("organizes library with free reuse", () => {
    const organized = organizeVoiceLibraryEntries([
      {
        id: "1",
        label: "Clone A",
        voiceProfileRef: "clone:abc",
        characterId: "c1",
        language: "en",
        bucketHint: { isClone: true },
      },
    ]);
    assert.equal(organized[0]?.bucket, "cloned_voices");
    assert.equal(organized[0]?.reuseWithoutCharge, true);
  });
});

describe("S.7C continuity + workspace", () => {
  it("detects no drift when motion keeps locked Character voice", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      voiceProfile: "commercial",
      scenes: [studioSceneDetail({ order: 0, characters: [chef] })],
    });
    const check = checkCharacterVoiceContinuity({
      character: chef,
      storyboard,
      motionResolvedProfile: "warm_narrator",
      renderResolvedProfile: "warm_narrator",
    });
    assert.equal(check.ok, true);
    assert.equal(check.driftDetected, false);
  });

  it("flags drift when motion overwrites locked Character voice", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceLock: true,
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      voiceProfile: "commercial",
      scenes: [studioSceneDetail({ order: 0, characters: [chef] })],
    });
    const check = checkCharacterVoiceContinuity({
      character: chef,
      storyboard,
      motionResolvedProfile: "commercial",
    });
    assert.equal(check.driftDetected, true);
  });

  it("builds workspace voice entity without redesign flag", () => {
    const chef = studioCharacterListItem({
      id: "c1",
      name: "Chef",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
    });
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      scenes: [studioSceneDetail({ order: 0, characters: [chef], description: "Hi" })],
    });
    const entity = buildWorkspaceVoiceEntity({ character: chef, storyboard });
    assert.equal(entity.redesignsWorkspace, false);
    assert.ok(entity.voiceStudio);
    assert.ok(entity.dialogue);
    const spec = audioSpecificationFromCharacterVoiceStudio(entity.voiceStudio!);
    assert.equal(spec.scope, "CHARACTER_VOICE");
  });
});
