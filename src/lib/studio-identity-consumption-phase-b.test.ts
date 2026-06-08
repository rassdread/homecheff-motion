import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeCharacterReferenceNotes } from "@/lib/studio-character-canonical-references";
import { formatVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import { buildStudioSceneMotionInstructions } from "@/lib/build-studio-scene-motion-instructions";
import {
  buildStoryboardIdentityConsumption,
  identityLibrariesFromStoryboard,
  mergeDirectorContextLines,
} from "@/lib/studio-identity-consumption";
import { buildSceneIdentityConsistencyScores } from "@/lib/studio-identity-consistency-score";
import {
  buildSceneImageReferenceAssets,
  buildSceneImageGenerationPrompt,
} from "@/lib/studio-scene-image-prompt";
import { buildSceneDirectorContextLines } from "@/lib/studio-prompt-source-entities";
import { buildVoiceIntelligenceDirectorLines } from "@/lib/studio-voice-intelligence-consumption";
import { buildStoryboardShotPlan } from "@/lib/studio-shot-planner";
import { buildScenePromptForDetail } from "@/server/studio/studio-prompt-builder-service";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { MotionHandoffScene } from "@/types/motion-handoff-payload";

const WORLD_MARKER = "[identity:visual_details]";
const SHOTS_MARKER = "[identity:shots]";

function motionScene(overrides: Partial<MotionHandoffScene> = {}): MotionHandoffScene {
  return {
    sceneId: "sc-1",
    order: 0,
    title: "Scene",
    description: "",
    location: null,
    characters: [{ id: "c1", name: "Chef", role: "chef", description: "", personality: "", referenceImageUrl: "" }],
    props: [],
    action: "Cooking",
    emotion: "warm",
    camera: "",
    transitionToNext: "",
    durationSeconds: 5,
    studioContext: {
      source: "studio",
      storyboardId: "sb-1",
      sceneId: "sc-1",
      action: "Cooking",
      emotion: "warm",
      camera: "",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: "",
    },
    generatedPrompt: "Chef cooks.",
    stylePrompt: "",
    continuityPrompt: "",
    promptVersion: null,
    selectedSceneImageId: null,
    selectedSceneImageUrl: null,
    selectedSceneImagePromptVersion: null,
    selectedSceneImageGenerationVersion: null,
    sceneImageReference: null,
    sceneConsistencyScore: null,
    sceneConsistencyReport: null,
    sceneConsistencyRecommendations: [],
    sceneCorrectionRecommendations: [],
    sceneVisionScore: null,
    sceneVisionReport: null,
    selectedImageScore: null,
    selectedImageVisionScore: null,
    selectedImageConsistencyScore: null,
    selectedImageImprovementScore: null,
    selectedImageRecommended: false,
    ...overrides,
  } as MotionHandoffScene;
}

describe("identity consumption phase B", () => {
  it("merges storyboard director context into scene prompts", () => {
    const world = {
      id: "w1",
      ownerId: "u1",
      name: "Cyber Kitchen",
      slug: "cyber-kitchen",
      description: "Neon market",
      visualStyle: `hc:world=food_universe,hc:vstyle=neon,hc:color=electric_blue${WORLD_MARKER}`,
      tone: "hc:music=electronic",
      continuityRules: `${SHOTS_MARKER}\nhc:shots=establishing|detail`,
      continuityStrength: "strong" as const,
      createdAt: "",
      updatedAt: "",
    };
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      visualKeywords: "hc:type=chef,hc:style=warm,hc:color=green",
      defaultClothing: "white apron",
      worldProfile: { id: world.id, name: world.name },
    });
    const scene = studioSceneDetail({
      id: "sc-1",
      characters: [character],
      location: studioLocationListItem({ id: "loc-1", name: "Kingston Market" }),
    });
    const storyboard = studioStoryboardDetail({
      scenes: [scene],
    });
    const libraries = identityLibrariesFromStoryboard(storyboard);
    libraries.worlds = [world];

    const sceneOnly = buildSceneDirectorContextLines(scene, libraries);
    const merged = buildSceneDirectorContextLines(scene, libraries, { storyboard });

    assert.ok(merged.length >= sceneOnly.length);
    assert.ok(merged.some((l) => l.includes("World type") || l.includes("Visual style")));
    const output = buildScenePromptForDetail(scene, "commercial", {
      sourceEntities: libraries,
      storyboard,
    });
    assert.ok(output.sections.directorIdentity?.includes("Chef") || output.sections.directorIdentity?.includes("World"));
  });

  it("prioritizes high-value identity in motion memory under truncation", () => {
    const built = buildStudioSceneMotionInstructions({
      scene: motionScene(),
      sceneIndex: 0,
      sceneCount: 3,
      storyMemory: {
        characters: [
          {
            id: "c1",
            name: "Chef",
            role: "chef",
            description: "",
            personality: "Very talkative personality with long backstory",
            personalityMemory: "Loves to explain every ingredient in great detail to the audience",
            appearanceMemory: "Tall with expressive hands",
            defaultClothing: "white apron with green trim",
            defaultAccessories: "wooden spoon",
            visualKeywords: "hc:type=chef,hc:style=warm_local,hc:color=green",
            referenceImageUrl: "",
            referenceNotes: "Long reference notes that should be lower priority than outfit",
            primaryReferenceImageId: null,
            continuityNotes: "[identity:forbidden]\nno beard",
            continuityStrength: "strong",
            identityStrength: "strong",
            worldProfileId: null,
            worldProfileName: null,
            canonicalIdentity: null,
          },
        ],
        location: null,
        props: [],
        world: {
          id: "w1",
          name: "Food World",
          description: "",
          visualStyle: "hc:world=food_universe,hc:vstyle=warm_local,hc:color=golden",
          tone: "",
          continuityRules: "[identity:render]\nhc:render=hero_closeups",
          continuityStrength: "strong",
        },
      },
    });
    const identityLine = built.lines.find((l) => l.startsWith("Identity:"));
    assert.ok(identityLine);
    assert.match(identityLine!, /white apron|Clothing/i);
    assert.match(identityLine!, /Forbidden|no beard/i);
    assert.match(identityLine!, /food_universe|warm_local|golden|Render strategy/i);
  });

  it("applies world shot intelligence to shot planner beats", () => {
    const world = {
      id: "w1",
      ownerId: "u1",
      name: "Neon City",
      slug: "neon-city",
      description: "",
      visualStyle: "hc:world=cyberpunk,hc:vstyle=neon_noir,hc:color=electric_blue",
      tone: "",
      continuityRules: `${SHOTS_MARKER}\nhc:shots=establishing|wide`,
      continuityStrength: "strong" as const,
      createdAt: "",
      updatedAt: "",
    };
    const character = studioCharacterListItem({
      id: "c1",
      name: "Runner",
      worldProfile: { id: world.id, name: world.name },
    });
    const scene = studioSceneDetail({
      id: "sc-1",
      shotType: "close_up",
      characters: [character],
    });
    const storyboard = studioStoryboardDetail({ scenes: [scene] });
    const libraries = identityLibrariesFromStoryboard(storyboard);
    libraries.worlds = [world];

    const plan = buildStoryboardShotPlan({ storyboard, libraries });
    const scenePlan = plan.scenes[0]!;
    assert.ok(["wide", "extreme_wide", "medium_wide", "drone"].includes(scenePlan.shotType));
    const opening = scenePlan.beats.find((b) => b.role === "opening");
    assert.ok(opening);
    assert.ok(["wide", "extreme_wide", "medium_wide", "drone", "medium"].includes(opening!.shotType));
  });

  it("consumes voice metadata in director context lines", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Grower",
      voiceNotes: formatVoiceSelectionMemory({
        selectedAt: new Date().toISOString(),
        profileRef: "library:voice-1",
        voiceName: "Dutch Grower",
        compatibilityScore: 88,
        matchedAccentId: "dutch.nederlands",
        matchedAccentLabelKey: "studio.voiceLibrary.accent.dutch.nederlands",
        personaPresetId: "dutch_grower",
        personaLabelKey: "studio.voicePersona.garden.dutchGrower",
        matchingReasons: ["community tone", "local Dutch"],
      }),
    });
    const lines = buildVoiceIntelligenceDirectorLines({
      characters: [character],
      locationNames: ["Amsterdam"],
    });
    assert.ok(lines.some((l) => l.includes("Dutch Grower")));
    assert.ok(lines.some((l) => l.includes("compatibility 88%")));
    assert.ok(lines.some((l) => l.includes("Dutch grower") || l.includes("Dutch accent")));
  });

  it("orders canonical references primary before supporting", () => {
    const referenceNotes = serializeCharacterReferenceNotes("", {
      version: 1,
      primarySetAt: null,
      supporting: [
        {
          id: "s1",
          role: "detail",
          imageUrl: "https://example.com/detail.jpg",
          storageKey: "detail",
          uploadedAt: "2026-06-01T00:00:00.000Z",
          status: "active",
        },
        {
          id: "s2",
          role: "face",
          imageUrl: "https://example.com/face.jpg",
          storageKey: "face",
          uploadedAt: "2026-06-01T00:00:00.000Z",
          status: "active",
        },
      ],
      archive: [],
    });
    const scene = studioSceneDetail({
      id: "sc-1",
      characters: [
        studioCharacterListItem({
          id: "c1",
          name: "Chef",
          referenceImageUrl: "https://example.com/primary.jpg",
          referenceNotes,
        }),
      ],
    });
    const storyboard = studioStoryboardDetail({ scenes: [scene] });
    const libraries = identityLibrariesFromStoryboard(storyboard);
    const output = buildScenePromptForDetail(scene, "commercial", {
      sourceEntities: libraries,
      storyboard,
    });
    const memoryBundle = {
      characters: [
        {
          id: "c1",
          name: "Chef",
          role: "chef",
          description: "",
          personality: "",
          personalityMemory: "",
          appearanceMemory: "",
          defaultClothing: "",
          defaultAccessories: "",
          visualKeywords: "",
          referenceImageUrl: "https://example.com/primary.jpg",
          referenceNotes,
          primaryReferenceImageId: null,
          continuityNotes: "",
          continuityStrength: "strong" as const,
          identityStrength: "strong" as const,
          worldProfileId: null,
          worldProfileName: null,
          canonicalIdentity: null,
        },
      ],
      location: null,
      props: [],
      world: null,
      continuityStrength: "strong" as const,
    };
    const prompt = buildSceneImageGenerationPrompt(
      {
        id: scene.id,
        storyboardId: storyboard.id,
        order: scene.order,
        title: scene.title,
        description: scene.description,
        action: scene.action,
        emotion: scene.emotion,
        camera: scene.camera,
        transitionToNext: scene.transitionToNext,
        durationSeconds: scene.durationSeconds,
        characters: scene.characters,
        location: scene.location,
        props: scene.props,
        shotType: scene.shotType,
        cameraMovement: scene.cameraMovement,
        sceneEnergy: scene.sceneEnergy,
      },
      output,
      { memoryBundle }
    );
    const primaryIdx = prompt.indexOf("primary reference");
    const supportingIdx = prompt.indexOf("supporting face");
    assert.ok(primaryIdx >= 0);
    assert.ok(supportingIdx >= 0);
    assert.ok(primaryIdx < supportingIdx);

    const assets = buildSceneImageReferenceAssets(
      {
        id: scene.id,
        storyboardId: storyboard.id,
        order: 0,
        title: scene.title,
        description: "",
        action: "",
        emotion: "",
        camera: "",
        transitionToNext: "",
        durationSeconds: 5,
        characters: scene.characters,
        location: null,
        props: [],
        shotType: "",
        cameraMovement: "",
        sceneEnergy: "",
      },
      memoryBundle
    );
    assert.equal(assets.characters[0]?.referenceImageUrl, "https://example.com/primary.jpg");
    assert.equal(assets.characters[0]?.supportingReferences?.[0]?.role, "face");
  });

  it("computes scene identity consistency scores from prompt consumption", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      visualKeywords: "hc:type=chef,hc:style=warm,hc:color=green",
      defaultClothing: "white apron",
    });
    const scene = studioSceneDetail({ id: "sc-1", characters: [character] });
    const storyboard = studioStoryboardDetail({ scenes: [scene] });
    const libraries = identityLibrariesFromStoryboard(storyboard);
    const output = buildScenePromptForDetail(scene, "commercial", {
      sourceEntities: libraries,
      storyboard,
    });
    const scores = buildSceneIdentityConsistencyScores({
      scene,
      promptOutput: output,
      libraries,
    });
    assert.ok(scores.character >= 50);
    assert.ok(scores.overall >= 50);
    assert.equal(scores.sceneId, "sc-1");
  });

  it("buildStoryboardIdentityConsumption includes voice intelligence lines", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Storyteller",
      voiceNotes: formatVoiceSelectionMemory({
        selectedAt: new Date().toISOString(),
        profileRef: "library:jamaican",
        voiceName: "Marcus",
        compatibilityScore: 91,
        matchedAccentId: "english.jamaican",
        matchedAccentLabelKey: "studio.voiceLibrary.accent.english.jamaican",
        personaPresetId: "jamaican_street_chef",
        personaLabelKey: "studio.voicePersona.chef.jamaicanStreetChef",
        matchingReasons: ["street food", "Caribbean"],
      }),
    });
    const scene = studioSceneDetail({
      characters: [character],
      location: studioLocationListItem({ id: "loc-1", name: "Kingston" }),
    });
    const storyboard = studioStoryboardDetail({ scenes: [scene] });
    const consumption = buildStoryboardIdentityConsumption({
      storyboard,
      libraries: identityLibrariesFromStoryboard(storyboard),
    });
    assert.ok(
      consumption.directorContextLines.some(
        (l) => l.includes("Marcus") || l.includes("Caribbean")
      )
    );
  });

  it("mergeDirectorContextLines dedupes scene and storyboard lines", () => {
    const merged = mergeDirectorContextLines(
      ["Visual style: warm.", "Outfit: apron."],
      ["Visual style: warm.", "World type: food universe."]
    );
    assert.equal(merged.length, 3);
    assert.deepEqual(merged, [
      "Visual style: warm.",
      "Outfit: apron.",
      "World type: food universe.",
    ]);
  });
});
