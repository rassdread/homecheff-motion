import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import {
  buildFrequentCloneAdvisories,
  topFrequentCloneVoices,
} from "@/lib/studio-user-voice-advisories";
import {
  formatClonedVoiceProfileRef,
  normalizeStoredVoiceProfile,
  normalizeVoiceProfileForSynthesis,
  resolvePlanningVoiceProfile,
} from "@/lib/studio-voice-profile-ref";
import { studioCharacterListItem, studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

function memoryWithClone(name: string, storyboardCount: number): StudioProjectMemorySnapshot {
  return {
    characters: {},
    locations: {},
    props: {},
    worlds: {},
    voices: [
      {
        profileId: formatClonedVoiceProfileRef("clone-voice-1"),
        labelKey: "studio.voiceClone.clonedVoice",
        displayName: name,
        characterCount: 2,
        storyboardCount,
      },
      {
        profileId: "warm_narrator",
        labelKey: "studio.voice.preset.warmNarrator",
        characterCount: 1,
        storyboardCount: 1,
      },
    ],
    narrationAudio: [],
    libraryAudio: [],
    styles: [],
    shotPatterns: [],
    productionRecords: [],
  };
}

describe("studio-user-voice-advisories", () => {
  it("ranks clone voices by storyboard usage", () => {
    const top = topFrequentCloneVoices(memoryWithClone("Sergio Voice Clone", 5), 2);
    assert.equal(top.length, 1);
    assert.equal(top[0]!.voiceName, "Sergio Voice Clone");
    assert.equal(top[0]!.storyboardCount, 5);
  });

  it("builds director advisories without auto-select payload", () => {
    const advisories = buildFrequentCloneAdvisories(memoryWithClone("Sergio Voice Clone", 4));
    assert.equal(advisories.length, 1);
    assert.equal(advisories[0]!.messageParams.voiceName, "Sergio Voice Clone");
    assert.equal(advisories[0]!.voiceProfile, "clone:clone-voice-1");
  });
});

describe("studio-user-voice-library clone retention", () => {
  it("preserves clone refs through planning and synthesis", () => {
    const cloneRef = formatClonedVoiceProfileRef("abc123");
    assert.equal(resolvePlanningVoiceProfile(cloneRef), cloneRef);
    assert.equal(normalizeVoiceProfileForSynthesis(cloneRef), cloneRef);
    assert.equal(normalizeStoredVoiceProfile(cloneRef), cloneRef);
  });

  it("analyzeVoiceDirector keeps clone profile on storyboard", () => {
    const cloneRef = formatClonedVoiceProfileRef("chef-clone");
    const report = analyzeVoiceDirector(
      studioStoryboardDetail({
        voiceEnabled: true,
        voiceProfile: cloneRef,
        scenes: [studioSceneDetail({ order: 0 })],
      })
    );
    assert.equal(report.voiceProfile, cloneRef);
    assert.equal(report.presetLabelKey, "studio.voiceClone.clonedVoice");
  });
});

describe("studio-user-voice-library integrations", () => {
  it("includes frequent clone advisories in director proposal", () => {
    const proposal = buildDirectorProposal({
      idea: "A personal chef story",
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        scenes: [studioSceneDetail({ order: 0 })],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef", voiceEnabled: true })],
      locations: [],
      props: [],
      worlds: [],
      projectMemory: memoryWithClone("Sergio Voice Clone", 6),
    });
    assert.ok(proposal);
    assert.ok(proposal!.voices.frequentCloneAdvisories.length >= 1);
    assert.equal(
      proposal!.voices.frequentCloneAdvisories[0]!.messageParams.voiceName,
      "Sergio Voice Clone"
    );
  });

  it("adds production brief clone recommendation from memory", () => {
    const brief = buildProductionBrief({
      idea: "Community kitchen story",
      characters: [],
      locations: [],
      projectMemory: memoryWithClone("Sergio Voice Clone", 3),
    });
    assert.ok(brief);
    assert.ok(
      brief!.recommendations.some(
        (r) => r.messageKey === "studio.productionBrief.recommendation.frequentClone"
      )
    );
  });

  it("adds optional creation assistant clone advisory", () => {
    const view = buildCreationAssistantView({
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        scenes: [studioSceneDetail({ order: 0 })],
      }),
      characters: [],
      projectMemory: memoryWithClone("Sergio Voice Clone", 2),
    });
    const task = view.optionalTasks.find(
      (t) => t.messageKey === "studio.creationAssistant.advisory.frequentClone"
    );
    assert.ok(task);
    assert.equal(task!.messageParams?.voiceName, "Sergio Voice Clone");
  });
});
