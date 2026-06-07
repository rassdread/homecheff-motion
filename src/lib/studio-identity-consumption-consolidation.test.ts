import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import {
  characterIdentityConsistencyPhrases,
  worldIdentityConsistencyPhrases,
} from "@/lib/studio-identity-consistency-phrases";
import { buildSceneWorldIdentityPromptContext } from "@/lib/studio-identity-prompt-context";
import { buildSceneIdentityConsumption } from "@/lib/studio-identity-consumption";
import { buildSceneMemoryBundle } from "@/lib/studio-memory-mappers";
import { buildWorldToneField, buildWorldVisualField } from "@/lib/studio-world-identity-structured";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";

describe("studio-identity-consumption-consolidation", () => {
  const world = studioWorldProfileListItem({
    id: "w1",
    name: "Community World",
    visualStyle: buildWorldVisualField(
      {
        worldType: "community_universe",
        visualStyle: "community",
        shapeLanguage: "rounded",
        colorTheme: "warm",
        lighting: "soft",
        mood: "warm",
        environmentFeel: "community",
        freeTags: [],
      },
      ""
    ),
    tone: buildWorldToneField(
      {
        musicStyle: "warm",
        ambience: "community",
        audioEnergy: "positive",
        voiceDirection: "human_local",
        soundFeel: "local",
        freeTags: [],
      },
      ""
    ),
  });

  const character = studioCharacterListItem({
    id: "c1",
    name: "Chef Marco",
    visualKeywords: "hc:type=human,hc:style=3d_cartoon,hc:energy=energetic",
    worldProfileId: "w1",
  });

  const location = studioLocationListItem({
    id: "l1",
    name: "Market",
    environmentKeywords: "hc:type=market,hc:style=warm_local,hc:mood=busy",
    worldProfileId: "w1",
  });

  const prop = studioPropListItem({
    id: "p1",
    name: "Wooden spoon",
    appearanceMemory: "hc:type=tool,hc:func=cooking",
    worldProfileId: "w1",
  });

  const libraries = {
    characters: [character],
    locations: [location],
    props: [prop],
    worlds: [world],
  };

  const scene = studioSceneDetail({
    order: 0,
    characters: [character],
    location,
    props: [prop],
  });

  it("builds prompt identity section from world and entity visual hints", () => {
    const input = studioSceneDetailToPromptInput(scene, "commercial", undefined, {
      sourceEntities: libraries,
    });
    const output = buildScenePromptFromInput(input);
    assert.ok(output.sections.identity.length > 0);
    assert.match(output.sections.characters, /Chef Marco/i);
    assert.match(output.prompt, /Community World|community|warm/i);
    assert.ok(output.sections.continuity.length > 0);
  });

  it("buildSceneWorldIdentityPromptContext uses full world library data", () => {
    const context = buildSceneWorldIdentityPromptContext({ scene, libraries });
    assert.ok(context.length > 0);
    assert.match(context, /Community World|community/i);
  });

  it("resolves client world memory from worlds library instead of empty stub", () => {
    const stubBundle = buildSceneMemoryBundle({
      characters: [
        {
          id: character.id,
          name: character.name,
          role: character.role,
          description: character.description,
          personality: character.personality,
          referenceImageUrl: character.referenceImageUrl,
          appearanceMemory: character.appearanceMemory,
          personalityMemory: character.personalityMemory,
          continuityNotes: character.continuityNotes,
          defaultClothing: character.defaultClothing,
          defaultAccessories: character.defaultAccessories,
          visualKeywords: character.visualKeywords,
          primaryReferenceImageId: character.primaryReferenceImageId,
          referenceNotes: character.referenceNotes,
          identityStrength: character.identityStrength,
          continuityStrength: character.continuityStrength,
          worldProfileId: character.worldProfileId,
          worldProfile: {
            id: world.id,
            name: world.name,
            description: "",
            visualStyle: "",
            tone: "",
            continuityRules: "",
            continuityStrength: "strong",
          },
        },
      ],
      location: null,
      props: [],
    });
    assert.equal(stubBundle.world?.visualStyle, "");

    const input = studioSceneDetailToPromptInput(scene, "commercial", undefined, {
      sourceEntities: libraries,
    });
    assert.ok(input.memoryBundle?.world);
    assert.ok(input.memoryBundle.world.visualStyle.length > 0);
    assert.ok(input.memoryBundle.world.tone.length > 0);
  });

  it("consistency analyzers derive phrases from visual-hints lines", () => {
    const bundle = buildSceneMemoryBundle({
      characters: [
        {
          id: character.id,
          name: character.name,
          role: character.role,
          description: character.description,
          personality: character.personality,
          referenceImageUrl: character.referenceImageUrl,
          appearanceMemory: character.appearanceMemory,
          personalityMemory: character.personalityMemory,
          continuityNotes: character.continuityNotes,
          defaultClothing: character.defaultClothing,
          defaultAccessories: character.defaultAccessories,
          visualKeywords: character.visualKeywords,
          primaryReferenceImageId: character.primaryReferenceImageId,
          referenceNotes: character.referenceNotes,
          identityStrength: character.identityStrength,
          continuityStrength: character.continuityStrength,
          worldProfileId: character.worldProfileId,
          worldProfile: {
            id: world.id,
            name: world.name,
            description: world.description,
            visualStyle: world.visualStyle,
            tone: world.tone,
            continuityRules: world.continuityRules,
            continuityStrength: world.continuityStrength,
          },
        },
      ],
      location: null,
      props: [],
    });
    const characterMemory = bundle.characters[0]!;
    const characterPhrases = characterIdentityConsistencyPhrases(characterMemory);
    assert.ok(characterPhrases.some((p) => /cartoon|human|energetic/i.test(p)));

    const worldPhrases = worldIdentityConsistencyPhrases(bundle.world!);
    assert.ok(worldPhrases.some((p) => /community|warm/i.test(p)));
  });

  it("buildSceneIdentityConsumption exposes per-scene rationales for all asset kinds", () => {
    const consumption = buildSceneIdentityConsumption({ scene, libraries });
    assert.ok(consumption.assets.length >= 4);
    assert.ok(consumption.visualLines.length > 0);
    assert.ok(
      consumption.rationales.some(
        (r) => r.reasonKey === "studio.identityConsumption.rationale.characterIdentity"
      )
    );
    assert.ok(
      consumption.rationales.some(
        (r) => r.reasonKey === "studio.identityConsumption.rationale.locationIdentity"
      )
    );
    assert.ok(
      consumption.rationales.some(
        (r) => r.reasonKey === "studio.identityConsumption.rationale.propAction"
      )
    );
    assert.ok(
      consumption.rationales.some(
        (r) => r.reasonKey === "studio.identityConsumption.rationale.worldRules"
      )
    );
  });
});
