import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  worldIdentityCompletenessTier,
  worldIdentityFormFromWorld,
  worldIdentityFormToPatch,
} from "@/lib/studio-world-identity-fields";
import {
  isAdvancedWorldType,
  listVisibleWorldTypes,
} from "@/lib/studio-world-identity-presets";
import {
  buildWorldContinuityField,
  buildWorldToneField,
  buildWorldVisualField,
  parseWorldVisualStructured,
} from "@/lib/studio-world-identity-structured";
import {
  buildWorldIdentityAudioProductionLines,
  buildWorldIdentityRenderStrategyHints,
  buildWorldIdentityRulePresence,
  buildWorldIdentityVisualProductionLines,
  resolveWorldIdentityShotHint,
} from "@/lib/studio-world-identity-visual-hints";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { buildWorldMemoryPromptLines } from "@/lib/studio-memory-prompt";
import { studioWorldProfileListItem } from "@/test/studio-api-fixtures";

describe("studio-world-identity-fields", () => {
  it("round-trips structured world identity through form patch", () => {
    const world = studioWorldProfileListItem({
      id: "w1",
      name: "HomeCheff Universe",
      description: "Community food brand world",
      visualStyle: buildWorldVisualField(
        {
          worldType: "community_universe",
          visualStyle: "cartoon_3d",
          shapeLanguage: "rounded",
          colorTheme: "homecheff",
          lighting: "warm_interior",
          mood: "warm",
          environmentFeel: "community",
          freeTags: [],
        },
        "HomeCheff green #006D52 and blue #0067B1"
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
        "Warm, positive, human, local"
      ),
      continuityRules: buildWorldContinuityField({
        usageContext: "Community promos and local market stories",
        shots: {
          cameraStyle: "steady",
          motionStyle: "steady",
          pacing: "medium",
          preferredShots: "medium, group",
          forbiddenShotStyles: "horror angles",
          freeTags: [],
        },
        renderStrategies: ["multi_image", "hybrid"],
        forbiddenElements: "No horror, no competitor logos",
        audioForbiddenElements: "No aggressive SFX",
        brandRules: "Always show HomeCheff colors",
      }),
    });

    const form = worldIdentityFormFromWorld(world);
    assert.equal(form.worldType, "community_universe");
    assert.equal(form.visualStyle, "cartoon_3d");
    assert.equal(form.shapeLanguage, "rounded");
    assert.equal(form.colorTheme, "homecheff");
    assert.equal(form.musicStyle, "warm");
    assert.equal(form.preferredShots, "medium, group");
    assert.deepEqual(form.renderStrategies, ["multi_image", "hybrid"]);
    assert.equal(form.forbiddenElements, "No horror, no competitor logos");

    const patch = worldIdentityFormToPatch(form);
    assert.ok(patch.visualStyle?.includes("hc:world=community_universe"));
    assert.ok(patch.tone?.includes("hc:music=warm"));
    assert.ok(patch.continuityRules?.includes("[identity:render]"));
    assert.ok(patch.continuityRules?.includes("[identity:forbidden]"));
  });

  it("parses visual structured tokens from identity spec", () => {
    const parsed = parseWorldVisualStructured(
      "hc:world=food_universe,hc:vstyle=cinematic,hc:shape=friendly,hc:color=warm,hc:light=golden_hour,hc:mood=warm,hc:env=cozy"
    );
    assert.equal(parsed.worldType, "food_universe");
    assert.equal(parsed.visualStyle, "cinematic");
    assert.equal(parsed.shapeLanguage, "friendly");
  });

  it("computes completeness tier from identity engine", () => {
    const sparse = studioWorldProfileListItem({ id: "w1", name: "X" });
    const rich = studioWorldProfileListItem({
      id: "w1",
      name: "Food World",
      description: "Warm kitchen universe",
      visualStyle: "hc:world=food_universe,hc:vstyle=warm_local,hc:mood=warm",
      tone: "hc:music=warm,hc:ambience=kitchen",
      continuityRules: "Recipe promos\n\n[identity:forbidden]\nNo horror",
    });
    assert.equal(
      worldIdentityCompletenessTier(identityCompleteness(toIdentitySpec(sparse))),
      "missing"
    );
    assert.equal(
      worldIdentityCompletenessTier(identityCompleteness(toIdentitySpec(rich))),
      "complete"
    );
  });
});

describe("studio-world-identity-presets visibility", () => {
  it("hides advanced world types for simple users", () => {
    const simple = listVisibleWorldTypes(false);
    assert.ok(simple.includes("food_universe"));
    assert.ok(!simple.includes("cyberpunk"));
    assert.ok(isAdvancedWorldType("fantasy"));
  });

  it("shows advanced world types when enabled", () => {
    const advanced = listVisibleWorldTypes(true);
    assert.ok(advanced.includes("cyberpunk"));
    assert.ok(advanced.includes("sci_fi"));
  });
});

describe("studio-world-identity-visual-hints", () => {
  it("exposes visual production lines from identity spec", () => {
    const world = studioWorldProfileListItem({
      id: "w1",
      name: "Community",
      visualStyle: "hc:world=community_universe,hc:vstyle=community,hc:mood=warm",
      continuityRules: "Promos\n\n[identity:forbidden]\nNo competitor logos",
    });
    const lines = buildWorldIdentityVisualProductionLines(toIdentitySpec(world));
    assert.ok(lines.some((l) => l.includes("community")));
    assert.ok(lines.some((l) => l.includes("Forbidden visuals")));
  });

  it("exposes audio production lines from tone metadata", () => {
    const world = studioWorldProfileListItem({
      id: "w1",
      name: "Sports",
      tone: "hc:music=rhythmic,hc:energy=dynamic,hc:voice=commercial",
    });
    const lines = buildWorldIdentityAudioProductionLines(toIdentitySpec(world));
    assert.ok(lines.some((l) => l.includes("rhythmic")));
    assert.ok(lines.some((l) => l.includes("dynamic")));
  });

  it("resolves shot planner hints by world type and custom preferred shots", () => {
    const foodHint = resolveWorldIdentityShotHint(
      studioWorldProfileListItem({
        id: "w1",
        name: "Food",
        visualStyle: "hc:world=food_universe",
      })
    );
    assert.ok(foodHint?.preferredShotTypes.includes("close_up"));

    const customHint = resolveWorldIdentityShotHint(
      studioWorldProfileListItem({
        id: "w2",
        name: "Custom",
        visualStyle: "hc:world=brand_universe",
        continuityRules:
          "[identity:shots]\nhc:camera=steady,hc:motion=tracking,hc:pacing=fast,hc:shots=wide|tracking",
      })
    );
    assert.ok(customHint?.preferredShotTypes.includes("wide"));
  });

  it("builds render strategy hints and consistency rule presence", () => {
    const world = studioWorldProfileListItem({
      id: "w1",
      name: "Hybrid",
      visualStyle: "hc:world=design_universe,hc:vstyle=premium,hc:color=premium",
      tone: "hc:music=cinematic,hc:voice=warm_narrator",
      continuityRules: buildWorldContinuityField({
        usageContext: "Product launches",
        shots: {
          cameraStyle: "cinematic",
          motionStyle: "slow",
          pacing: "slow",
          preferredShots: "wide",
          forbiddenShotStyles: "",
          freeTags: [],
        },
        renderStrategies: ["hybrid"],
        forbiddenElements: "No clutter",
        audioForbiddenElements: "",
        brandRules: "",
      }),
    });

    const renderHints = buildWorldIdentityRenderStrategyHints(world);
    assert.ok(renderHints.some((l) => l.includes("hybrid")));

    const presence = buildWorldIdentityRulePresence(world);
    assert.equal(presence.visual, true);
    assert.equal(presence.color, true);
    assert.equal(presence.audio, true);
    assert.equal(presence.voice, true);
    assert.equal(presence.shots, true);
    assert.equal(presence.motion, true);
    assert.equal(presence.forbidden, true);
  });

  it("feeds memory prompt extras for project memory", () => {
    const lines = buildWorldMemoryPromptLines({
      id: "w1",
      name: "HomeCheff",
      description: "Brand world",
      visualStyle: "hc:world=community_universe,hc:vstyle=cartoon_3d",
      tone: "hc:music=warm",
      continuityRules: "",
      continuityStrength: "strong",
    });
    assert.equal(lines.length, 1);
    assert.ok(lines[0]!.includes("cartoon"));
  });
});
