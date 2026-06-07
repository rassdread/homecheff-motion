import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  locationIdentityCompletenessTier,
  locationIdentityFormFromLocation,
  locationIdentityFormToPatch,
  mapLocationTypeToCategory,
  parseLocationStructuredKeywords,
} from "@/lib/studio-location-identity-fields";
import {
  isAdvancedLocationStyle,
  listVisibleLocationStyles,
} from "@/lib/studio-location-identity-presets";
import {
  buildLocationIdentityVisualProductionLines,
  resolveLocationIdentityShotHint,
  resolveLocationIdentityShotHintFromLocation,
} from "@/lib/studio-location-identity-visual-hints";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { buildLocationMemoryPromptLines } from "@/lib/studio-memory-prompt";
import { studioLocationListItem } from "@/test/studio-api-fixtures";

describe("studio-location-identity-fields", () => {
  it("maps extended location type to db category", () => {
    assert.equal(mapLocationTypeToCategory("kitchen"), "restaurant");
    assert.equal(mapLocationTypeToCategory("market"), "market");
    assert.equal(mapLocationTypeToCategory("living_room"), "home");
  });

  it("round-trips structured environment keywords through form patch", () => {
    const location = studioLocationListItem({
      id: "l1",
      name: "Rotterdam Market",
      category: "market",
      environmentKeywords:
        "hc:type=market,hc:style=cinematic,hc:mood=warm,hc:arch=local,hc:mat=wood|stone,hc:color=warm,hc:light=golden_hour,hc:crowd=market_feel",
      visualIdentity: "Lively neighborhood market",
      worldMemory: "Wooden stalls and fresh produce",
      continuityNotes: "Weekly promo scenes\n\n[identity:forbidden]\nNo competitor logos",
    });

    const form = locationIdentityFormFromLocation(location);
    assert.equal(form.locationType, "market");
    assert.equal(form.visualStyle, "cinematic");
    assert.equal(form.mood, "warm");
    assert.equal(form.architecture, "local");
    assert.equal(form.materials, "wood, stone");
    assert.equal(form.colorTheme, "warm");
    assert.equal(form.lighting, "golden_hour");
    assert.equal(form.crowdLevel, "market_feel");
    assert.equal(form.forbiddenElements, "No competitor logos");

    const patch = locationIdentityFormToPatch(form);
    assert.ok(patch.environmentKeywords?.includes("hc:style=cinematic"));
    assert.ok(patch.continuityNotes?.includes("[identity:forbidden]"));
    assert.equal(patch.category, "market");
  });

  it("separates type, style and mood in structured keywords", () => {
    const parsed = parseLocationStructuredKeywords(
      "hc:type=kitchen,hc:style=warm_local,hc:mood=cozy"
    );
    assert.equal(parsed.locationType, "kitchen");
    assert.equal(parsed.visualStyle, "warm_local");
    assert.equal(parsed.mood, "cozy");
  });

  it("computes completeness tier from identity engine", () => {
    const sparse = studioLocationListItem({ id: "l1", name: "X" });
    const rich = studioLocationListItem({
      id: "l1",
      name: "Kitchen Hub",
      description: "Main kitchen",
      environmentKeywords: "hc:type=kitchen,hc:style=cinematic,hc:mood=warm",
      visualIdentity: "Warm professional kitchen",
      worldMemory: "Stainless counters",
      referenceImageUrl: "https://example.com/x.jpg",
    });
    const sparseScore = identityCompleteness(toIdentitySpec(sparse));
    const richScore = identityCompleteness(toIdentitySpec(rich));
    assert.equal(locationIdentityCompletenessTier(richScore), "complete");
    assert.equal(locationIdentityCompletenessTier(sparseScore), "missing");
  });
});

describe("studio-location-identity-presets visibility", () => {
  it("hides advanced styles for simple users", () => {
    const simple = listVisibleLocationStyles(false);
    assert.ok(simple.includes("warm_local"));
    assert.ok(!simple.includes("cyberpunk"));
    assert.ok(isAdvancedLocationStyle("cyberpunk"));
  });

  it("shows advanced styles when enabled", () => {
    const advanced = listVisibleLocationStyles(true);
    assert.ok(advanced.includes("cyberpunk"));
  });
});

describe("studio-location-identity-visual-hints", () => {
  it("exposes visual production lines from identity spec", () => {
    const location = studioLocationListItem({
      id: "l1",
      name: "Market",
      category: "market",
      environmentKeywords: "hc:type=market,hc:style=cinematic,hc:mood=busy",
      visualIdentity: "Colorful stalls",
    });
    const lines = buildLocationIdentityVisualProductionLines(toIdentitySpec(location));
    assert.ok(lines.some((l) => l.includes("market")));
    assert.ok(lines.some((l) => l.includes("cinematic")));
  });

  it("resolves shot planner hints by location type", () => {
    const marketHint = resolveLocationIdentityShotHint("market");
    assert.ok(marketHint?.preferredShotTypes.includes("wide"));
    const kitchenHint = resolveLocationIdentityShotHintFromLocation(
      studioLocationListItem({
        id: "l1",
        name: "Kitchen",
        environmentKeywords: "hc:type=kitchen",
      })
    );
    assert.ok(kitchenHint?.preferredShotTypes.includes("close_up"));
  });

  it("feeds memory prompt extras for visual production", () => {
    const lines = buildLocationMemoryPromptLines({
      id: "l1",
      name: "Garden",
      category: "garden",
      worldMemory: "",
      visualIdentity: "",
      environmentKeywords: "hc:type=garden,hc:style=nature",
      continuityNotes: "",
      referenceImageUrl: "",
      continuityStrength: "strong",
      worldProfileId: null,
      worldProfileName: null,
    });
    assert.equal(lines.length, 1);
    assert.ok(lines[0]!.includes("nature"));
  });
});
