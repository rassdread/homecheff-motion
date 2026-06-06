import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildActionPrompt } from "@/lib/studio-prompt-action-builder";
import { buildCameraPrompt } from "@/lib/studio-prompt-camera-builder";
import { buildCharacterPromptLine } from "@/lib/studio-prompt-character-builder";
import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import { buildEmotionPrompt } from "@/lib/studio-prompt-emotion-builder";
import { buildLocationPrompt } from "@/lib/studio-prompt-location-builder";
import { buildPropsPrompt } from "@/lib/studio-prompt-prop-builder";
import {
  buildPromptSections,
  buildScenePrompt,
  buildScenePromptFromInput,
} from "@/lib/studio-prompt-builder";
import { scorePromptQuality } from "@/lib/studio-prompt-quality";
import { buildStyleProfilePrompt } from "@/lib/studio-prompt-style-profiles";
import { sceneSnapshotToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import { PROMPT_BUILDER_VERSION } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

const rotterdamScene: SceneSnapshot = {
  sceneId: "scene-rotterdam",
  order: 0,
  title: "HomeCheff launch",
  description: "Presenting the platform",
  location: {
    id: "loc-1",
    name: "Rotterdam",
    category: "city",
    description: "Modern Rotterdam waterfront and urban energy.",
    referenceImageUrl: "",
  },
  characters: [
    {
      id: "char-chef",
      name: "Chef",
      role: "mascot",
      description: "HomeCheff chef mascot",
      personality: "Friendly, energetic, community-driven",
      referenceImageUrl: "",
    },
    {
      id: "char-sergio",
      name: "Sergio",
      role: "human",
      description: "Founder presenting the product",
      personality: "",
      referenceImageUrl: "",
    },
  ],
  props: [
    {
      id: "prop-laptop",
      name: "Laptop",
      category: "laptop",
      description: "HomeCheff platform on screen",
      referenceImageUrl: "",
    },
  ],
  action: "presenting",
  emotion: "excited",
  camera: "medium_shot",
  transitionToNext: "",
  durationSeconds: 8,
};

describe("studio prompt builders", () => {
  it("buildActionPrompt maps presenting", () => {
    assert.match(buildActionPrompt("presenting"), /explaining a product/i);
  });

  it("buildEmotionPrompt maps excited", () => {
    assert.match(buildEmotionPrompt("excited"), /enthusiasm/i);
  });

  it("buildCameraPrompt maps medium shot", () => {
    assert.match(buildCameraPrompt("medium_shot"), /medium/i);
  });

  it("buildCharacterPromptLine includes personality", () => {
    const line = buildCharacterPromptLine(rotterdamScene.characters[0]!);
    assert.match(line, /Chef/i);
    assert.match(line, /community-driven/i);
  });

  it("buildLocationPrompt uses name and description", () => {
    const text = buildLocationPrompt(rotterdamScene.location);
    assert.match(text, /Rotterdam/i);
    assert.match(text, /waterfront/i);
  });

  it("buildPropsPrompt lists prop details", () => {
    const text = buildPropsPrompt(rotterdamScene.props);
    assert.match(text, /Laptop/i);
    assert.match(text, /HomeCheff platform/i);
  });

  it("buildContinuityPrompt references characters and location", () => {
    const text = buildContinuityPrompt({
      characters: rotterdamScene.characters,
      location: rotterdamScene.location,
      props: rotterdamScene.props,
    });
    assert.match(text, /Chef mascot/i);
    assert.match(text, /Rotterdam/i);
    assert.match(text, /Laptop/i);
  });

  it("buildScenePrompt produces cinematic paragraphs", () => {
    const output = buildScenePrompt(rotterdamScene, "commercial");
    assert.match(output.prompt, /Rotterdam/i);
    assert.match(output.prompt, /Chef|Sergio/i);
    assert.match(output.prompt, /Laptop/i);
    assert.match(output.prompt, /commercial/i);
    assert.match(output.prompt, /medium|Balanced neutral scene energy/i);
    assert.match(output.sections.director, /Commercial direction/i);
    assert.equal(output.metadata.sceneId, "scene-rotterdam");
    assert.equal(output.metadata.promptVersion, PROMPT_BUILDER_VERSION);
    assert.ok(output.metadata.generatedPrompt.length > 0);
    assert.ok(output.continuityPrompt.length > 0);
  });

  it("buildPromptSections separates all sections", () => {
    const input = sceneSnapshotToPromptInput(rotterdamScene, "commercial");
    const sections = buildPromptSections(input);
    assert.ok(sections.characters.length > 0);
    assert.ok(sections.location.length > 0);
    assert.ok(sections.props.length > 0);
    assert.ok(sections.action.length > 0);
    assert.ok(sections.emotion.length > 0);
    assert.ok(sections.camera.length > 0);
    assert.equal(sections.visualStyle, buildStyleProfilePrompt("commercial"));
  });

  it("scorePromptQuality returns strong for complete scene", () => {
    const input = sceneSnapshotToPromptInput(rotterdamScene);
    const quality = scorePromptQuality(input);
    assert.equal(quality.score, 100);
    assert.equal(quality.tier, "strong");
  });

  it("scorePromptQuality returns weak when fields missing", () => {
    const quality = scorePromptQuality({
      scene: {
        sceneId: "s1",
        title: "",
        description: "",
        action: "",
        emotion: "",
        camera: "",
      },
      location: null,
      characters: [],
      props: [],
      styleProfile: "commercial",
    });
    assert.equal(quality.score, 0);
    assert.equal(quality.tier, "weak");
  });

  it("buildScenePromptFromInput respects style profile", () => {
    const cinematic = buildScenePromptFromInput(
      sceneSnapshotToPromptInput(rotterdamScene, "cinematic")
    );
    assert.match(cinematic.stylePrompt, /Cinematic/i);
    assert.equal(cinematic.metadata.styleProfile, "cinematic");
  });

  it("injects character memory into continuity prompt", () => {
    const input = sceneSnapshotToPromptInput(rotterdamScene, "commercial");
    const output = buildScenePromptFromInput({
      ...input,
      memoryBundle: {
        characters: [
          {
            id: "chef",
            name: "Chef",
            role: "mascot",
            appearanceMemory: "White chef hat and green apron",
            personalityMemory: "Friendly",
            continuityNotes: "",
            defaultClothing: "",
            defaultAccessories: "",
            visualKeywords: "",
            referenceImageUrl: "",
            primaryReferenceImageId: "chef",
            referenceNotes: "",
            identityStrength: "strong",
            continuityStrength: "strong",
            worldProfileId: null,
            worldProfileName: null,
          },
        ],
        location: null,
        props: [],
        world: null,
        continuityStrength: "strong",
      },
    });
    assert.match(output.continuityPrompt, /Chef mascot identity/i);
    assert.match(output.continuityPrompt, /chef hat/i);
  });
});
