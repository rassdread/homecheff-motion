import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAssetReferencesBundle } from "@/lib/studio-asset-canonical-references";
import { buildStudioSceneMotionInstructions } from "@/lib/build-studio-scene-motion-instructions";
import { serializeCharacterReferenceNotes } from "@/lib/studio-character-canonical-references";
import { buildCharacterIdentityVisualProductionLines } from "@/lib/studio-character-identity-visual-hints";
import {
  characterToIdentitySpec,
  locationToIdentitySpec,
} from "@/lib/studio-identity-spec-mappers";
import {
  buildCharacterMemoryPromptLines,
  buildPropMemoryPromptLines,
} from "@/lib/studio-memory-prompt";
import {
  buildSceneImageGenerationPrompt,
  buildSceneImageReferenceAssets,
} from "@/lib/studio-scene-image-prompt";
import {
  comparePreviewAndProductionPrompts,
  productionPromptHasIdentityContext,
} from "@/lib/studio-prompt-parity";
import { buildStoryboardShotPlan } from "@/lib/studio-shot-planner";
import { buildScenePromptForDetail } from "@/server/studio/studio-prompt-builder-service";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { MotionHandoffScene } from "@/types/motion-handoff-payload";

const FORBIDDEN_MARKER = "[identity:forbidden]";

describe("identity consumption phase A", () => {
  it("wires character forbidden elements through identity spec", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      continuityNotes: `Chef on market\n\n${FORBIDDEN_MARKER}\nno glasses\nno beard\nno modern cars`,
      visualKeywords: "hc:type=chef,hc:shape=rounded,hc:energy=energetic,hc:color=green",
      defaultAccessories: "chef knife, wooden spoon",
      defaultClothing: "white apron",
    });
    const spec = characterToIdentitySpec(character);
    assert.match(spec.forbiddenElements, /no glasses/);
    const lines = buildCharacterIdentityVisualProductionLines(spec);
    assert.ok(lines.some((l) => l.startsWith("Forbidden:")));
    assert.ok(lines.some((l) => l.includes("Shape language: rounded")));
    assert.ok(lines.some((l) => l.includes("Energy: energetic")));
    assert.ok(lines.some((l) => l.includes("Accessories: chef knife")));
  });

  it("wires location forbidden elements through identity spec", () => {
    const location = studioLocationListItem({
      id: "loc-1",
      name: "Market",
      continuityNotes: `Busy market\n\n${FORBIDDEN_MARKER}\nno neon signs`,
    });
    const spec = locationToIdentitySpec(location);
    assert.equal(spec.forbiddenElements, "no neon signs");
  });

  it("emits explicit forbidden line in character memory prompts", () => {
    const lines = buildCharacterMemoryPromptLines([
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
        visualKeywords: "hc:type=chef",
        referenceImageUrl: "",
        referenceNotes: "",
        primaryReferenceImageId: null,
        continuityNotes: `${FORBIDDEN_MARKER}\nno beard`,
        continuityStrength: "strong",
        identityStrength: "strong",
        worldProfileId: null,
        worldProfileName: null,
        canonicalIdentity: null,
      },
    ]);
    assert.ok(lines[0]?.includes("Forbidden: no beard"));
    assert.ok(!lines[0]?.includes(FORBIDDEN_MARKER));
  });

  it("includes supporting reference assets for props and locations", () => {
    const propBundle = formatAssetReferencesBundle({
      version: 1,
      primarySetAt: null,
      supporting: [
        {
          id: "sup-2",
          role: "detail",
          imageUrl: "https://example.com/knife.png",
          storageKey: "knife",
          uploadedAt: "2026-06-01T00:00:00.000Z",
          status: "active",
        },
      ],
      archive: [],
    });
    const locBundle = formatAssetReferencesBundle({
      version: 1,
      primarySetAt: null,
      supporting: [
        {
          id: "sup-1",
          role: "context",
          imageUrl: "https://example.com/stall.png",
          storageKey: "stall",
          uploadedAt: "2026-06-01T00:00:00.000Z",
          status: "active",
        },
      ],
      archive: [],
    });
    const scene = studioSceneDetail({
      location: studioLocationListItem({
        id: "loc-1",
        name: "Market",
        continuityNotes: locBundle,
      }),
      props: [
        studioPropListItem({
          id: "prop-1",
          name: "Knife",
          continuityNotes: propBundle,
        }),
      ],
    });
    const memoryBundle = {
      characters: [],
      location: {
        id: "loc-1",
        name: "Market",
        category: "outdoor",
        description: "",
        referenceImageUrl: "",
        worldMemory: "",
        visualIdentity: "",
        environmentKeywords: "",
        continuityNotes: locBundle,
        continuityStrength: "strong" as const,
        worldProfileId: null,
        worldProfileName: null,
      },
      props: [
        {
          id: "prop-1",
          name: "Knife",
          category: "tool",
          description: "",
          referenceImageUrl: "",
          appearanceMemory: "",
          brandingRules: "",
          continuityNotes: propBundle,
          continuityStrength: "strong" as const,
          worldProfileId: null,
          worldProfileName: null,
        },
      ],
      world: null,
      continuityStrength: "strong" as const,
    };
    const assets = buildSceneImageReferenceAssets(scene, memoryBundle);
    assert.equal(assets.location?.supportingReferences?.length, 1);
    assert.equal(assets.props[0]?.supportingReferences?.length, 1);

    const prompt = buildSceneImageGenerationPrompt(
      scene,
      { prompt: "Base prompt", sections: {}, version: 4 },
      { memoryBundle }
    );
    assert.match(prompt, /preserve shape, branding, and material/);
    assert.match(prompt, /preserve architecture, materials, and lighting/);
  });

  it("biases shot planner from energetic character identity", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Vendor",
      visualKeywords: "hc:type=human,hc:energy=energetic",
    });
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          id: "s1",
          order: 0,
          shotType: "wide",
          characters: [character],
        }),
      ],
    });
    const plan = buildStoryboardShotPlan({ storyboard });
    const scenePlan = plan.scenes[0]!;
    assert.notEqual(scenePlan.shotType, "extreme_wide");
    assert.equal(scenePlan.sceneEnergy, "dynamic");
  });

  it("consumes world render strategies in motion instructions", () => {
    const scene = {
      sceneId: "s1",
      order: 0,
      title: "Scene",
      description: "",
      action: "",
      emotion: "",
      camera: "medium",
      shotType: "medium",
      cameraMovement: "static",
      sceneEnergy: "neutral",
      transitionToNext: "cut",
      durationSeconds: 5,
      characters: [],
      props: [],
      location: null,
      studioContext: {
        source: "studio",
        storyboardId: "sb-1",
        sceneId: "s1",
        action: "",
        emotion: "",
        camera: "",
        transitionToNext: "cut",
        location: null,
        characters: [],
        props: [],
        notes: "",
      },
    } as MotionHandoffScene;
    const built = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: 0,
      sceneCount: 1,
      storyMemory: {
        characters: [],
        location: null,
        props: [],
        world: {
          id: "w1",
          name: "Cyber World",
          description: "",
          visualStyle:
            "hc:world=cinematic_universe,hc:vstyle=cinematic,hc:shape=angular,hc:color=neon",
          tone: "",
          continuityRules: "[identity:render]\nhc:render=story_montage|cinematic_pacing",
          continuityStrength: "strong",
        },
      },
    });
    assert.match(built.text, /World:/);
    assert.match(built.text, /Render strategy|Camera intent|Pacing/i);
  });

  it("links prop to character name in memory prompt", () => {
    const lines = buildPropMemoryPromptLines(
      [
        {
          id: "p1",
          name: "Chef Knife",
          category: "tool",
          description: "",
          referenceImageUrl: "",
          appearanceMemory: "hc:chars=char-1",
          brandingRules: "",
          continuityNotes: "",
          continuityStrength: "strong",
          worldProfileId: null,
          worldProfileName: null,
        },
      ],
      { characterNamesById: new Map([["char-1", "Chef Sergio"]]) }
    );
    assert.ok(lines[0]?.includes("Signature prop for Chef Sergio"));
  });

  it("production prompt includes forbidden and structured identity", () => {
    const character = studioCharacterListItem({
      id: "char-1",
      name: "Chef",
      visualKeywords: "hc:type=chef,hc:shape=rounded,hc:color=green",
      defaultAccessories: "wooden spoon",
      continuityNotes: `${FORBIDDEN_MARKER}\nno beard`,
      referenceNotes: serializeCharacterReferenceNotes("", {
        version: 1,
        primarySetAt: null,
        supporting: [
          {
            id: "ref-1",
            role: "face",
            label: "Chef face",
            imageUrl: "https://example.com/face.png",
            storageKey: "face",
            uploadedAt: "2026-06-01T00:00:00.000Z",
            status: "active",
          },
        ],
        archive: [],
      }),
    });
    const scene = studioSceneDetail({ id: "scene-1", characters: [character] });
    const report = comparePreviewAndProductionPrompts({ scene });
    assert.equal(report.parity, true);
    const production = buildScenePromptForDetail(scene, "cinematic");
    assert.ok(productionPromptHasIdentityContext(production));
    assert.match(production.prompt, /Forbidden: no beard/);
    assert.match(production.prompt, /Shape language: rounded/);
    assert.match(production.prompt, /Accessories: wooden spoon/);
  });
});
