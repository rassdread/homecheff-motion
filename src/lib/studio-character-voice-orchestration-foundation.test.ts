import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachCharacterVoicePlanToHandoff } from "@/lib/attach-character-voice-plan-handoff";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import {
  buildCharacterVoiceOrchestration,
  buildCharacterVoiceOrchestrationContext,
  buildInsightsVoiceCastSummary,
  buildStoryboardVoicePlan,
  resolveCastVoiceSourceType,
} from "@/lib/studio-character-voice-orchestration";
import { buildStudioInsightsHubView } from "@/lib/studio-insights-hub";
import { buildStoryArchitecture } from "@/lib/studio-story-architecture";
import { formatClonedVoiceProfileRef, formatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import { buildFrequentCastAdvisories } from "@/lib/studio-voice-cast-advisories";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import { studioCharacterListItem, studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

function storyboardWithCast() {
  const chef = studioCharacterListItem({
    id: "chef",
    name: "Chef",
    voiceEnabled: true,
    voiceProfile: formatLibraryVoiceProfileRef("british-chef"),
    voiceDescription: "British Chef",
  });
  const garden = studioCharacterListItem({
    id: "garden",
    name: "Garden",
    voiceEnabled: true,
    voiceProfile: formatClonedVoiceProfileRef("sergio-clone"),
    voiceDescription: "Sergio Clone",
  });
  const sergio = studioCharacterListItem({
    id: "sergio",
    name: "Sergio",
    voiceEnabled: true,
    voiceProfile: "documentary",
  });
  return studioStoryboardDetail({
    voiceEnabled: true,
    voiceLanguage: "en",
    scenes: [
      studioSceneDetail({ order: 0, characters: [sergio] }),
      studioSceneDetail({ order: 1, characters: [chef] }),
      studioSceneDetail({ order: 2, characters: [garden] }),
      studioSceneDetail({ order: 3, characters: [chef] }),
      studioSceneDetail({ order: 4, characters: [sergio] }),
    ],
  });
}

describe("studio-character-voice-orchestration", () => {
  it("builds cast members with voice source types", () => {
    const sb = storyboardWithCast();
    const orch = buildCharacterVoiceOrchestration({ storyboard: sb });
    assert.equal(orch.castMembers.length, 3);
    assert.equal(orch.castMembers.find((m) => m.characterName === "Chef")?.voiceSourceType, "persona");
    assert.equal(orch.castMembers.find((m) => m.characterName === "Garden")?.voiceSourceType, "my_voice");
    assert.equal(resolveCastVoiceSourceType("warm_narrator"), "none");
  });

  it("computes dialogue readiness for multi-character cast", () => {
    const sb = storyboardWithCast();
    const orch = buildCharacterVoiceOrchestration({ storyboard: sb });
    assert.ok(["multi_character", "dialogue_ready"].includes(orch.dialogueReadiness.status));
    assert.equal(orch.dialogueReadiness.characterCount, 3);
  });

  it("maps story moment speakers from architecture", () => {
    const sb = storyboardWithCast();
    const architecture = buildStoryArchitecture({
      userIdea: "Chef and garden story",
      storyboard: sb,
      characters: sb.scenes.flatMap((s) => s.characters),
    });
    const orch = buildCharacterVoiceOrchestration({
      storyboard: sb,
      storyArchitecture: architecture,
    });
    assert.ok(orch.momentSpeakers.length >= 5);
    assert.ok(orch.momentSpeakers.some((m) => m.carrierCharacterName));
  });

  it("builds storyboard voice plan with per-scene speakers", () => {
    const sb = storyboardWithCast();
    const plan = buildStoryboardVoicePlan({ storyboard: sb });
    assert.equal(plan.sceneSpeakerAssignments.length, 5);
    assert.equal(plan.sceneSpeakerAssignments[0]?.speakerName, "Sergio");
    assert.equal(plan.sceneSpeakerAssignments[1]?.speakerName, "Chef");
    assert.ok(plan.estimatedVoiceChanges >= 2);
  });

  it("flags missing voice assignments", () => {
    const missing = studioCharacterListItem({
      id: "designer",
      name: "Designer",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
    });
    const sb = studioStoryboardDetail({
      voiceEnabled: true,
      scenes: [studioSceneDetail({ order: 0, characters: [missing] })],
    });
    const orch = buildCharacterVoiceOrchestration({ storyboard: sb });
    assert.equal(orch.castMembers[0]?.status, "missing_voice");
    assert.equal(orch.dialogueReadiness.status, "single_voice");
  });
});

describe("character voice orchestration integrations", () => {
  it("enriches director proposal with characterVoiceContext", () => {
    const sb = storyboardWithCast();
    const proposal = buildDirectorProposal({
      idea: "Multi-character chef garden story",
      storyboard: sb,
      characters: sb.scenes.flatMap((s) => s.characters),
      locations: [],
      props: [],
      worlds: [],
    });
    assert.ok(proposal?.characterVoiceContext);
    assert.ok(proposal!.characterVoiceContext!.voicePlan.sceneSpeakerAssignments.length >= 1);
  });

  it("adds creation assistant assign-voice tasks", () => {
    const designer = studioCharacterListItem({
      id: "designer",
      name: "Designer",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
    });
    const sb = studioStoryboardDetail({
      voiceEnabled: true,
      scenes: [
        studioSceneDetail({ order: 0, characters: [designer] }),
        studioSceneDetail({
          order: 1,
          characters: [
            studioCharacterListItem({
              id: "chef",
              name: "Chef",
              voiceEnabled: true,
              voiceProfile: formatLibraryVoiceProfileRef("x"),
            }),
          ],
        }),
      ],
    });
    const view = buildCreationAssistantView({
      storyboard: sb,
      characters: [designer, ...sb.scenes[1]!.characters],
    });
    const task = view.nowTasks.find(
      (t) => t.messageKey === "studio.creationAssistant.task.assignCharacterVoice"
    );
    assert.ok(task);
    assert.equal(task!.source, "character_voice");
  });

  it("includes voice cast summary in insights hub", () => {
    const sb = storyboardWithCast();
    const view = buildStudioInsightsHubView({
      storyboard: sb,
      characters: sb.scenes.flatMap((s) => s.characters),
    });
    assert.ok(view.voiceCastSummary);
    assert.equal(view.voiceCastSummary!.characterCount, 3);
    assert.equal(view.voiceCastSummary!.cloneCount, 1);
  });

  it("attaches characterVoicePlan to motion handoff", () => {
    const sb = storyboardWithCast();
    const payload = attachCharacterVoicePlanToHandoff(
      {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: sb.id,
        title: sb.title,
        description: sb.description,
        promptStyleProfile: "default",
        directorProfile: "default",
        shotDiversityScore: 0,
        characterMemory: [],
        locationMemory: null,
        propMemory: [],
        worldMemory: null,
        continuityStrength: "medium",
        consistencyReport: { overallScore: 0, sceneReports: [], driftWarnings: [] },
        overallConsistencyScore: 0,
        driftWarnings: [],
        correctionRecommendations: [],
        consistencyHistory: [],
        latestImprovementScore: null,
        visionReport: { overallVisionScore: 0, sceneReports: [], visionWarnings: [] },
        overallVisionScore: 0,
        visionWarnings: [],
        characterConsistencyReport: {
          overallCharacterConsistencyScore: 0,
          perSceneCharacterScores: [],
          driftWarnings: [],
        },
        overallCharacterConsistencyScore: 0,
        characterDriftWarnings: [],
        perSceneCharacterIdentityScores: [],
        scenes: [],
      },
      { storyboard: sb }
    );
    assert.ok(payload.characterVoicePlan);
    assert.equal(payload.characterVoicePlan!.castMemberCount, 3);
    assert.equal(payload.characterVoicePlan!.sceneSpeakerAssignments.length, 5);
  });

  it("builds frequent cast advisories from production memory", () => {
    const memory: StudioProjectMemorySnapshot = {
      characters: {},
      locations: {},
      props: {},
      worlds: {},
      voices: [],
      castCombinations: [
        { characterIds: ["sergio", "chef", "garden"], storyboardCount: 4 },
      ],
      narrationAudio: [],
      libraryAudio: [],
      styles: [],
      shotPatterns: [],
    };
    const advisories = buildFrequentCastAdvisories({
      characters: [
        studioCharacterListItem({ id: "sergio", name: "Sergio" }),
        studioCharacterListItem({ id: "chef", name: "Chef" }),
        studioCharacterListItem({ id: "garden", name: "Garden" }),
      ],
      projectMemory: memory,
    });
    assert.equal(advisories.length, 1);
    assert.match(advisories[0]!.messageParams.castNames, /Sergio/);
  });

  it("buildInsightsVoiceCastSummary aggregates cast stats", () => {
    const summary = buildInsightsVoiceCastSummary(
      buildCharacterVoiceOrchestration({ storyboard: storyboardWithCast() })
    );
    assert.equal(summary.personaCount, 1);
    assert.equal(summary.presetCount, 1);
  });

  it("buildCharacterVoiceOrchestrationContext merges plan lines", () => {
    const ctx = buildCharacterVoiceOrchestrationContext({
      storyboard: storyboardWithCast(),
    });
    assert.ok(ctx.contextLines.some((line) => line.startsWith("Scene ")));
    assert.ok(ctx.recommendationKeys.length >= 0);
  });
});
