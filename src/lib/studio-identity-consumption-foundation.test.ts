import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  biasShotTypeFromIdentity,
  buildSceneIdentityConsumption,
  buildStoryboardIdentityConsumption,
  completenessStatusFromScore,
  resolveSceneIdentityShotBias,
} from "@/lib/studio-identity-consumption";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildAudioProductionDirectorPlan } from "@/lib/studio-audio-production-director";
import { buildSceneImageReadiness } from "@/lib/studio-visual-production-summary";
import { buildShotPlannerAssetAdvice } from "@/lib/studio-asset-evolution";
import { collectSceneIdentitySpecs } from "@/lib/studio-identity-spec-engine";
import { buildWorldToneField, buildWorldVisualField } from "@/lib/studio-world-identity-structured";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";

describe("studio-identity-consumption", () => {
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

  it("collects scene identity specs from linked assets", () => {
    const scene = studioSceneDetail({
      order: 0,
      characters: [character],
      location,
      props: [prop],
    });
    const bundle = collectSceneIdentitySpecs({ scene, ...libraries });
    assert.equal(bundle.characters.length, 1);
    assert.equal(bundle.location?.name, "Market");
    assert.equal(bundle.props.length, 1);
    assert.equal(bundle.worlds.length, 1);
  });

  it("resolves shot bias from world identity before prop hints", () => {
    const scene = studioSceneDetail({
      order: 0,
      characters: [character],
      location,
      props: [prop],
    });
    const bundle = collectSceneIdentitySpecs({ scene, ...libraries });
    const hint = resolveSceneIdentityShotBias({ bundle, libraries });
    assert.ok(hint);
    assert.equal(hint.sourceKind, "world");
    assert.equal(hint.rationaleKey, "studio.worldIdentity.shotHint.community");
  });

  it("builds storyboard consumption with visual and audio lines", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          characters: [character],
          location,
          props: [prop],
        }),
      ],
    });
    const consumption = buildStoryboardIdentityConsumption({
      storyboard,
      libraries,
    });
    assert.ok(consumption.visualProductionLines.length > 0);
    assert.ok(consumption.audioProductionLines.length > 0);
    assert.ok(consumption.rationales.length > 0);
  });

  it("biases conflicting shot types toward identity hint", () => {
    const biased = biasShotTypeFromIdentity("wide", {
      preferredShotTypes: ["close_up", "medium_close_up"],
      rationaleKey: "studio.worldIdentity.shotHint.food",
      sourceName: "Food World",
      sourceKind: "world",
    });
    assert.equal(biased, "close_up");
  });

  it("maps completeness tiers", () => {
    assert.equal(completenessStatusFromScore(90), "complete");
    assert.equal(completenessStatusFromScore(60), "almost");
    assert.equal(completenessStatusFromScore(10), "missing");
  });
});

describe("studio-identity-consumption downstream", () => {
  const world = studioWorldProfileListItem({
    id: "w1",
    name: "Food World",
    visualStyle: "hc:world=food_universe,hc:vstyle=warm_local",
    tone: "hc:music=warm,hc:ambience=kitchen",
  });
  const character = studioCharacterListItem({
    id: "c1",
    name: "Chef",
    visualKeywords: "hc:type=human,hc:energy=energetic",
    worldProfileId: "w1",
  });
  const location = studioLocationListItem({
    id: "l1",
    name: "Kitchen",
    environmentKeywords: "hc:type=kitchen",
    worldProfileId: "w1",
  });
  const libraries = {
    characters: [character],
    locations: [location],
    props: [],
    worlds: [world],
  };

  it("feeds visual production readiness with identity checks", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [character], location })],
    });
    const readiness = buildSceneImageReadiness({ storyboard, ...libraries });
    assert.ok(readiness.checks.some((c) => c.id === "identity"));
  });

  it("feeds shot planner advice from identity hints", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [character], location })],
    });
    const advice = buildShotPlannerAssetAdvice(storyboard, libraries);
    assert.ok(advice.some((a) => a.code === "shot_identity_hint"));
  });

  it("feeds audio production with world identity context", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [character], location })],
    });
    const plan = buildAudioProductionDirectorPlan(storyboard, libraries);
    assert.ok(plan.identityContextLines && plan.identityContextLines.length > 0);
  });

  it("feeds AI director proposal with identity consumption", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [character], location })],
    });
    const proposal = buildDirectorProposal({
      idea: "Community kitchen promo",
      storyboard,
      ...libraries,
      t: (key) => key,
    });
    assert.ok(proposal?.identityConsumption);
    assert.ok(proposal.identityConsumption!.directorContextLines.length > 0);
  });
});
