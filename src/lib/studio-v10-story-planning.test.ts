import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretStoryIdea } from "@/lib/studio-story-interpretation";
import {
  approveV10StoryPlanning,
  buildStudioV10StoryPlanning,
  regenerateV10DialogueLine,
  toggleV10DialogueLine,
  v10PlanningToStoryPlanPatch,
} from "@/lib/studio-v10-story-planning";
import { calculateStudioV10Runtime } from "@/lib/studio-v10-runtime-intelligence";
import { buildProviderAudioCacheKey, findLibraryCacheMatch } from "@/lib/studio-provider-audio-cache";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";

describe("studio v10 story planning", () => {
  it("builds interpretation, scenes, runtime, and voice assignments", () => {
    const interpretation = interpretStoryIdea({
      idea: "Sergio wandelt door Rotterdam en ontmoet mascottes",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    const planning = buildStudioV10StoryPlanning({
      idea: "Sergio wandelt door Rotterdam",
      interpretation,
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    assert.equal(planning.version, 1);
    assert.ok(planning.sceneProposals.length >= 3);
    assert.ok(planning.storyArc.length === 5);
    assert.ok(planning.runtime.totalSeconds > 0);
    assert.equal(planning.sceneVoiceAssignments.length, planning.sceneProposals.length);
    assert.equal(planning.userApproved, false);
  });

  it("approves planning and exports story plan patch", () => {
    const interpretation = interpretStoryIdea({
      idea: "Community journey",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "en",
    });
    const planning = approveV10StoryPlanning(
      buildStudioV10StoryPlanning({
        idea: "Community journey",
        interpretation,
        selections: DEFAULT_BRIEF_SELECTIONS,
        locale: "en",
      })
    );
    assert.equal(planning.userApproved, true);
    assert.ok(planning.sceneProposals.every((s) => s.approved));
    const patch = v10PlanningToStoryPlanPatch(planning);
    assert.equal(patch.scenes.length, planning.sceneProposals.length);
  });

  it("runtime model uses voice and dialogue duration", () => {
    const runtime = calculateStudioV10Runtime({
      scenes: [
        {
          id: "s1",
          index: 1,
          title: "Open",
          location: "City",
          characters: ["Hero"],
          action: "Walk",
          emotion: "Curious",
          purpose: "Hook",
          voiceOver: "Every movement begins with one step.",
          dialogueLines: [],
          overlay: { sceneId: "s1", header: "START", position: "top", durationSeconds: 4 },
          estimatedDurationSeconds: 4,
          approved: false,
        },
      ],
      voiceOverLines: [
        {
          sceneId: "s1",
          sceneIndex: 1,
          script: "Every movement begins with one step.",
          narratorVoice: "Warm",
          emotion: "Curious",
          durationSeconds: 3.2,
        },
      ],
      dialogueLines: [],
      transitionCount: 0,
    });
    assert.ok(runtime.scenes[0]!.seconds >= 3);
    assert.ok(runtime.totalSeconds >= 3);
    assert.ok(["high", "medium", "low"].includes(runtime.confidence));
  });

  it("toggles and regenerates dialogue lines", () => {
    const interpretation = interpretStoryIdea({
      idea: "Sergio ontmoet Chef in Rotterdam",
      selections: { ...DEFAULT_BRIEF_SELECTIONS, narrative: ["characters"] },
      locale: "nl",
    });
    const planning = buildStudioV10StoryPlanning({
      idea: "Sergio ontmoet Chef",
      interpretation,
      selections: { ...DEFAULT_BRIEF_SELECTIONS, narrative: ["characters"] },
      locale: "nl",
    });
    const dialogueId = planning.dialogueLines[0]?.id;
    assert.ok(dialogueId);
    const disabled = toggleV10DialogueLine(planning, dialogueId!);
    assert.equal(disabled.dialogueLines.find((d) => d.id === dialogueId)?.enabled, false);
    const regenerated = regenerateV10DialogueLine(disabled, dialogueId!);
    assert.notEqual(
      regenerated.dialogueLines.find((d) => d.id === dialogueId)?.dialogue,
      planning.dialogueLines.find((d) => d.id === dialogueId)?.dialogue
    );
  });
});

describe("studio provider audio cache", () => {
  it("finds library cache before provider key generation", () => {
    const key = buildProviderAudioCacheKey({
      kind: "music",
      prompt: "warm cinematic track",
      provider: "elevenlabs_music",
      mood: "warm",
      genre: "cinematic",
    });
    assert.equal(key.length, 24);
    const hit = findLibraryCacheMatch(
      [
        {
          id: "m1",
          kind: "music",
          name: "warm cinematic track",
          category: "cinematic",
          mood: "warm",
          energy: "medium",
          audioUrl: "https://cdn.example.com/m.mp3",
          storageKey: "k",
          durationSeconds: 30,
          createdAt: "",
        },
      ],
      { kind: "music", prompt: "warm cinematic track", mood: "warm" }
    );
    assert.equal(hit.hit, true);
  });
});
