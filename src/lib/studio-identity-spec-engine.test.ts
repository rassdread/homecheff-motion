import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCharacterMemorySnapshot } from "@/lib/studio-memory-mappers";
import {
  collectSceneIdentitySpecs,
  fromIdentitySpec,
  fromMemorySnapshot,
  identityCompleteness,
  mergePersonality,
  toIdentitySpec,
  toMemorySnapshot,
  toSearchHaystack,
} from "@/lib/studio-identity-spec-engine";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
} from "@/test/studio-api-fixtures";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

function studioWorldListItem(
  partial: Partial<StudioWorldProfileListItem> & { id: string; name: string }
): StudioWorldProfileListItem {
  return {
    id: partial.id,
    ownerId: partial.ownerId ?? "u1",
    name: partial.name,
    slug: partial.slug ?? partial.name.toLowerCase(),
    description: partial.description ?? "",
    visualStyle: partial.visualStyle ?? "",
    tone: partial.tone ?? "",
    continuityRules: partial.continuityRules ?? "",
    continuityStrength: partial.continuityStrength ?? "strong",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("studio-identity-spec-engine", () => {
  it("maps character entity to identity spec with voice reference", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      role: "mascot",
      isMascot: true,
      description: "HomeCheff chef",
      personality: "Warm and playful",
      personalityMemory: "Always cheerful in kitchen scenes",
      appearanceMemory: "Green apron, white hat",
      visualKeywords: "chef, apron, friendly",
      referenceImageUrl: "https://example.com/marco.jpg",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      worldProfile: { id: "w1", name: "HomeCheff World" },
      worldProfileId: "w1",
    });

    const spec = toIdentitySpec(character);
    assert.equal(spec.kind, "character");
    assert.equal(spec.name, "Chef Marco");
    assert.equal(spec.role, "mascot");
    assert.ok(spec.visualRules.includes("Green apron"));
    assert.ok(spec.tags.includes("mascot"));
    assert.equal(spec.voice?.profile, "warm_narrator");
    assert.equal(spec.world.id, "w1");
  });

  it("round-trips character memory snapshot via engine", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      appearanceMemory: "Green apron",
      visualKeywords: "chef",
      referenceImageUrl: "https://example.com/marco.jpg",
    });

    const viaMapper = toCharacterMemorySnapshot({
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
      worldProfile: null,
    });

    const viaEngine = toMemorySnapshot(toIdentitySpec(character));
    assert.deepEqual(viaEngine, viaMapper);
  });

  it("fromIdentitySpec produces character memory patch fields", () => {
    const spec = toIdentitySpec(
      studioCharacterListItem({
        id: "c1",
        name: "Chef Marco",
        appearanceMemory: "Apron",
        visualKeywords: "chef",
        referenceImageUrl: "https://example.com/marco.jpg",
      })
    );
    const patch = fromIdentitySpec(spec);
    assert.equal(patch.kind, "character");
    assert.equal(patch.patch.name, "Chef Marco");
    assert.equal(patch.patch.appearanceMemory, "Apron");
    assert.equal(patch.patch.visualKeywords, "chef");
  });

  it("mergePersonality prefers personalityMemory over base personality", () => {
    const spec = toIdentitySpec(
      studioCharacterListItem({
        id: "c1",
        name: "Chef Marco",
        personality: "Base",
        personalityMemory: "Memory wins",
      })
    );
    assert.equal(mergePersonality(spec), "Memory wins");
  });

  it("toSearchHaystack includes appearance memory for characters", () => {
    const haystack = toSearchHaystack(
      toIdentitySpec(
        studioCharacterListItem({
          id: "c1",
          name: "Chef Marco",
          appearanceMemory: "Green apron",
          description: "Chef",
        })
      )
    );
    assert.ok(haystack.fullText.toLowerCase().includes("green apron"));
    assert.ok(haystack.extraFields.some((f) => f.includes("Green apron")));
  });

  it("fromMemorySnapshot round-trips character memory snapshot", () => {
    const snapshot = toMemorySnapshot(
      toIdentitySpec(studioCharacterListItem({ id: "c1", name: "Chef Marco" }))
    );
    const spec = fromMemorySnapshot(snapshot);
    assert.equal(spec.kind, "character");
    assert.equal(spec.id, "c1");
    assert.equal(spec.name, "Chef Marco");
  });

  it("maps location and world specs", () => {
    const location = studioLocationListItem({
      id: "l1",
      name: "Rotterdam Markt",
      category: "market",
      environmentKeywords: "outdoor, busy",
      visualIdentity: "Colorful stalls",
    });
    const locSpec = toIdentitySpec(location);
    assert.equal(locSpec.kind, "location");
    assert.equal(locSpec.visualKeywords, "outdoor, busy");

    const world = studioWorldListItem({
      id: "w1",
      name: "HomeCheff",
      visualStyle: "Pixar-like 3D",
      tone: "Warm",
      continuityRules: "No realistic humans",
    });
    const worldSpec = toIdentitySpec(world);
    assert.equal(worldSpec.kind, "world");
    assert.equal(worldSpec.personality, "Warm");
    assert.ok(worldSpec.forbiddenElements.includes("No realistic humans"));
  });

  it("identityCompleteness increases when memory fields are filled", () => {
    const sparse = toIdentitySpec(studioCharacterListItem({ id: "c1", name: "X" }));
    const rich = toIdentitySpec(
      studioCharacterListItem({
        id: "c1",
        name: "Chef Marco",
        description: "Chef",
        appearanceMemory: "Apron",
        visualKeywords: "chef",
        referenceImageUrl: "https://example.com/x.jpg",
      })
    );
    assert.ok(identityCompleteness(rich) > identityCompleteness(sparse));
  });

  it("collectSceneIdentitySpecs reads linked scene assets", () => {
    const character = studioCharacterListItem({ id: "c1", name: "Chef Marco" });
    const location = studioLocationListItem({ id: "l1", name: "Kitchen" });
    const bundle = collectSceneIdentitySpecs({
      scene: studioSceneDetail({
        order: 0,
        characters: [character],
        locationId: "l1",
        location,
      }),
      characters: [character],
      locations: [location],
      props: [],
      worlds: [],
    });
    assert.equal(bundle.characters.length, 1);
    assert.equal(bundle.characters[0]?.name, "Chef Marco");
    assert.equal(bundle.location?.name, "Kitchen");
  });
});
