import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTranslator } from "@/i18n";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import {
  buildDirectorProposal,
  buildProposalShotPlanForEmptyStory,
  extractProposalTopic,
  scoreAssetMatch,
  tokenizeForAssetMatch,
} from "@/lib/studio-director-proposal-builder";
import {
  proposedSceneToCreateInput,
  proposedSceneToUpdateInput,
  proposalToStoryboardPatch,
  resolveProposedSceneText,
} from "@/lib/studio-director-proposal-apply";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { studioCharacterListItem } from "@/test/studio-api-fixtures";

const tNl = getTranslator("nl");
const tEn = getTranslator("en");

function emptyStoryboard(overrides: Partial<StudioStoryboardDetail> = {}): StudioStoryboardDetail {
  return {
    id: "sb-1",
    ownerId: "u-1",
    title: "Test",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "nl",
    voiceStyle: "",
    voiceProfile: "",
    narrationMode: "narrator",
    voiceNarrationScript: "",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: false,
    soundStyle: "",
    soundDensity: "",
    soundNotes: "",
    audioProductionEnabled: false,
    audioStyle: "",
    audioPriorityStrategy: "",
    audioNotes: "",
    audioAssetsEnabled: false,
    audioAssetNotes: "",
    autoSelectImprovedImage: false,
    sceneCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes: [],
    ...overrides,
  };
}

describe("studio-director-proposal", () => {
  it("extracts a readable topic from the idea", () => {
    assert.equal(extractProposalTopic("Reclame voor HomeCheff Garden"), "Reclame voor HomeCheff Garden");
  });

  it("builds five scenes for an empty storyboard", () => {
    const plan = buildProposalShotPlanForEmptyStory(5, "Pixar chef promo");
    assert.equal(plan.length, 5);
    assert.ok(plan[0]!.shotType);
  });

  it("prefers existing library character over proposing duplicate", () => {
    const proposal = buildDirectorProposal({
      idea: "Pixar-achtige chef promotievideo voor HomeCheff",
      storyboard: emptyStoryboard(),
      characters: [
        studioCharacterListItem({
          id: "char-chef",
          name: "Chef Mascot",
          description: "HomeCheff mascot chef",
          role: "mascot",
        }),
      ],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const usesChef = proposal!.scenes.some((s) =>
      s.characterRefs.some((c) => c.existingId === "char-chef" && c.name === "Chef Mascot")
    );
    assert.ok(usesChef, "should reference Chef Mascot from library");
    const duplicateName = proposal!.scenes.some((s) =>
      s.proposedCharacters.some((c) => /chef mascot copy/i.test(c.name))
    );
    assert.equal(duplicateName, false);
  });

  it("proposes new assets when library is empty", () => {
    const proposal = buildDirectorProposal({
      idea: "Restaurant promotie met chef in de keuken",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const hasNewSuggestions = proposal!.scenes.some(
      (s) => s.proposedCharacters.length > 0 || s.proposedLocation || s.proposedProps.length > 0
    );
    assert.ok(hasNewSuggestions);
  });

  it("keeps existing scene titles when storyboard already has scenes", () => {
    const proposal = buildDirectorProposal({
      idea: "Luxury brand launch",
      storyboard: emptyStoryboard({
        scenes: [
          {
            id: "sc-1",
            storyboardId: "sb-1",
            order: 0,
            title: "My custom title",
            description: "Custom desc",
            action: "",
            emotion: "",
            camera: "",
            shotType: "medium",
            cameraMovement: "static",
            sceneEnergy: "neutral",
            transitionToNext: "",
            musicCueType: "",
            musicEnergyTarget: "",
            musicTransitionType: "",
            musicStartBehavior: "",
            musicEndBehavior: "",
            soundEnvironmentOverride: "",
            soundCharacterOverride: "",
            soundPropOverride: "",
            soundTransitionOverride: "",
            soundAmbientOverride: "",
            voicePriority: "",
            musicPriority: "",
            soundPriority: "",
            audioFocus: "",
            duckingMode: "",
            voiceAssetOverride: "",
            musicAssetOverride: "",
            ambienceAssetOverride: "",
            sfxAssetOverride: "",
            durationSeconds: 6,
            locationId: null,
            location: null,
            characters: [],
            props: [],
            selectedSceneImageId: null,
            sceneImages: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    assert.equal(proposal!.scenes[0]!.titleParams.title, "My custom title");
  });

  it("assets-only update payload skips camera fields", () => {
    const proposal = buildDirectorProposal({
      idea: "HomeCheff Garden ad",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const scene = proposal!.scenes[0]!;
    const update = proposedSceneToUpdateInput(scene, "assets", tEn);
    assert.equal(update.shotType, undefined);
    assert.deepEqual(update.characterIds, scene.characterRefs.map((c) => c.existingId));
  });

  it("all-mode storyboard patch includes audio recommendations", () => {
    const proposal = buildDirectorProposal({
      idea: "Cinematic documentary about founders",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const patch = proposalToStoryboardPatch(proposal!, "all");
    assert.ok(patch?.voiceEnabled);
    assert.ok(patch?.musicEnabled);
    assert.ok(patch?.soundEnabled);
    assert.equal(proposalToStoryboardPatch(proposal!, "assets"), null);
  });

  it("scoreAssetMatch ranks chef mascot for chef brief", () => {
    const tokens = tokenizeForAssetMatch("chef promotie HomeCheff");
    const score = scoreAssetMatch("Chef Mascot", "HomeCheff chef", "protagonist", tokens);
    assert.ok(score >= 2);
  });

  it("has NL/EN i18n parity for directorProposal keys", () => {
    const nlKeys = Object.keys(nl).filter((k) => k.startsWith("studio.directorProposal."));
    const enKeys = Object.keys(en).filter((k) => k.startsWith("studio.directorProposal."));
    assert.deepEqual(nlKeys.sort(), enKeys.sort());
    for (const key of nlKeys) {
      assert.ok(tNl(key as keyof typeof nl).length > 0);
      assert.ok(tEn(key as keyof typeof en).length > 0);
    }
  });

  it("resolves scene copy through i18n templates", () => {
    const proposal = buildDirectorProposal({
      idea: "Local designer campaign",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
      t: tEn,
    });
    assert.ok(proposal);
    assert.equal(proposal!.version, 2);
    assert.ok(proposal!.renderReadiness.checks.length > 0);
    assert.ok(proposal!.text.openingHookKey);
    const copy = resolveProposedSceneText(proposal!.scenes[0]!, tEn);
    assert.ok(copy.title.includes("Local designer campaign") || copy.title.includes("Opening"));
    const createInput = proposedSceneToCreateInput(proposal!.scenes[0]!, tEn);
    assert.ok(createInput.title);
    assert.ok(createInput.shotType);
  });

  it("audio-only storyboard patch excludes director metadata", () => {
    const proposal = buildDirectorProposal({
      idea: "Cinematic documentary",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const patch = proposalToStoryboardPatch(proposal!, "audio");
    assert.ok(patch?.voiceEnabled);
    assert.equal(patch?.aiDirectorPrompt, undefined);
  });

  it("text mode applies narration preview only", () => {
    const proposal = buildDirectorProposal({
      idea: "HomeCheff Garden promo",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const patch = proposalToStoryboardPatch(proposal!, "text");
    assert.ok(patch?.voiceNarrationScript?.trim());
    assert.equal(proposalToStoryboardPatch(proposal!, "assets"), null);
  });

  it("enriches scenes with per-scene audio cues", () => {
    const proposal = buildDirectorProposal({
      idea: "Restaurant promo with chef",
      storyboard: emptyStoryboard(),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    assert.ok(proposal!.scenes.some((s) => s.sceneAudio.musicCueType));
  });
});
