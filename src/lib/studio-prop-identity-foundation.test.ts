import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  suggestPropLinkedCharacters,
} from "@/lib/studio-prop-identity-character-suggestions";
import {
  propIdentityCompletenessTier,
  propIdentityFormFromProp,
  propIdentityFormToPatch,
  mapPropTypeToCategory,
} from "@/lib/studio-prop-identity-fields";
import {
  buildPropAppearanceMemory,
  parsePropStructuredKeywords,
} from "@/lib/studio-prop-identity-structured";
import {
  buildPropIdentityVisualProductionLines,
  resolvePropIdentityShotHint,
  resolvePropIdentityShotHintFromProp,
} from "@/lib/studio-prop-identity-visual-hints";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { buildPropMemoryPromptLines } from "@/lib/studio-memory-prompt";
import {
  studioCharacterListItem,
  studioPropListItem,
} from "@/test/studio-api-fixtures";

describe("studio-prop-identity-fields", () => {
  it("maps extended prop type to db category", () => {
    assert.equal(mapPropTypeToCategory("tool"), "tool");
    assert.equal(mapPropTypeToCategory("sport"), "other");
    assert.equal(mapPropTypeToCategory("business"), "brand_asset");
  });

  it("round-trips structured appearance memory through form patch", () => {
    const prop = studioPropListItem({
      id: "p1",
      name: "Chef Spoon",
      category: "tool",
      appearanceMemory: buildPropAppearanceMemory(
        {
          propType: "tool",
          propFunction: "cooking",
          shapeLanguage: "rounded",
          material: "metal",
          colorTheme: "warm",
          sizeImpression: "handheld",
          styleId: "artisan",
          linkedCharacterIds: ["c1"],
          freeTags: [],
        },
        "Polished stainless spoon"
      ),
      brandingRules: "No competitor logos",
      continuityNotes: "Kitchen promo scenes",
    });

    const form = propIdentityFormFromProp(prop);
    assert.equal(form.propType, "tool");
    assert.equal(form.propFunction, "cooking");
    assert.equal(form.shapeLanguage, "rounded");
    assert.equal(form.material, "metal");
    assert.equal(form.sizeImpression, "handheld");
    assert.equal(form.styleId, "artisan");
    assert.equal(form.appearanceMemory, "Polished stainless spoon");
    assert.equal(form.linkedCharacterIds[0], "c1");
    assert.equal(form.forbiddenElements, "No competitor logos");

    const patch = propIdentityFormToPatch(form);
    assert.ok(patch.appearanceMemory?.includes("hc:func=cooking"));
    assert.equal(patch.category, "tool");
  });

  it("separates type and function in structured keywords", () => {
    const parsed = parsePropStructuredKeywords("hc:type=sport,hc:func=sports,hc:shape=playful");
    assert.equal(parsed.propType, "sport");
    assert.equal(parsed.propFunction, "sports");
    assert.equal(parsed.shapeLanguage, "playful");
  });

  it("computes completeness tier from identity engine", () => {
    const sparse = studioPropListItem({ id: "p1", name: "X" });
    const rich = studioPropListItem({
      id: "p1",
      name: "Football",
      description: "Match ball",
      appearanceMemory: "hc:type=sport,hc:func=sports,hc:size=medium,hc:style=playful",
      referenceImageUrl: "https://example.com/x.jpg",
    });
    assert.equal(propIdentityCompletenessTier(identityCompleteness(toIdentitySpec(sparse))), "missing");
    assert.equal(propIdentityCompletenessTier(identityCompleteness(toIdentitySpec(rich))), "complete");
  });
});

describe("studio-prop-identity-character-suggestions", () => {
  it("suggests mascot for sport props", () => {
    const mascot = studioCharacterListItem({
      id: "c1",
      name: "HomeCheff Mascot",
      role: "mascot",
      isMascot: true,
    });
    const suggestions = suggestPropLinkedCharacters({
      prop: studioPropListItem({ id: "p1", name: "Football", category: "other" }),
      form: { propType: "sport", propFunction: "sports", name: "Football" },
      characters: [mascot],
    });
    assert.equal(suggestions[0]?.id, "c1");
  });
});

describe("studio-prop-identity-visual-hints", () => {
  it("exposes visual production lines from identity spec", () => {
    const prop = studioPropListItem({
      id: "p1",
      name: "Spoon",
      appearanceMemory: "hc:type=tool,hc:func=cooking,hc:style=artisan",
    });
    const lines = buildPropIdentityVisualProductionLines(toIdentitySpec(prop));
    assert.ok(lines.some((l) => l.includes("cooking")));
  });

  it("resolves shot planner hints by prop type and function", () => {
    assert.ok(resolvePropIdentityShotHint("tool", "cooking")?.preferredShotTypes.includes("close_up"));
    const hint = resolvePropIdentityShotHintFromProp(
      studioPropListItem({
        id: "p1",
        name: "Package",
        appearanceMemory: "hc:type=business,hc:func=delivery",
      })
    );
    assert.ok(hint?.preferredShotTypes.includes("medium"));
  });

  it("feeds memory prompt extras for visual production", () => {
    const lines = buildPropMemoryPromptLines([
      {
        id: "p1",
        name: "Ball",
        category: "other",
        appearanceMemory: "hc:type=sport,hc:func=sports",
        brandingRules: "",
        continuityNotes: "",
        referenceImageUrl: "",
        continuityStrength: "strong",
        worldProfileId: null,
        worldProfileName: null,
      },
    ]);
    assert.equal(lines.length, 1);
    assert.ok(lines[0]!.includes("sport"));
  });
});
