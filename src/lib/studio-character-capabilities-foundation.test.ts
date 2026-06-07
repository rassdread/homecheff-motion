import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterCapabilities,
  buildProjectActionMemoryTrends,
  buildStoryboardActionIntelligence,
  classifySceneActions,
} from "@/lib/studio-character-capabilities";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildSceneShotBeats } from "@/lib/studio-shot-planner";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildWorldVisualField } from "@/lib/studio-world-identity-structured";
import {
  studioCharacterListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";

describe("studio-character-capabilities", () => {
  it("builds chef capabilities from outfit keywords", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef uniform",
      personality: "warm, professional",
    });
    const plan = buildCharacterCapabilities({ character: chef });
    assert.ok(plan.expected.includes("cook"));
    assert.ok(plan.expected.includes("taste"));
    assert.ok(plan.supported.includes("serve"));
  });

  it("builds garden capabilities from outfit", () => {
    const gardener = studioCharacterListItem({
      id: "garden-1",
      name: "Garden Sam",
      defaultClothing: "garden apron",
      defaultAccessories: "basket",
    });
    const plan = buildCharacterCapabilities({ character: gardener });
    assert.ok(plan.expected.includes("plant"));
    assert.ok(plan.expected.includes("harvest"));
    assert.ok(plan.supported.includes("carry"));
  });

  it("builds designer capabilities", () => {
    const designer = studioCharacterListItem({
      id: "design-1",
      name: "Studio Lena",
      defaultClothing: "designer outfit",
      defaultAccessories: "needle",
    });
    const plan = buildCharacterCapabilities({ character: designer });
    assert.ok(plan.expected.includes("draw"));
    assert.ok(plan.expected.includes("sew"));
    assert.ok(plan.supported.includes("present"));
  });

  it("prop function enriches capabilities", () => {
    const mascot = studioCharacterListItem({
      id: "mascot-1",
      name: "Ball Buddy",
      defaultClothing: "sporty",
      isMascot: true,
      role: "mascot",
    });
    const ball = studioPropListItem({
      id: "prop-ball",
      name: "Football",
      appearanceMemory: "hc:type=sport,hc:func=sports",
    });
    const plan = buildCharacterCapabilities({
      character: mascot,
      props: [ball],
      scenePropIds: ["prop-ball"],
    });
    assert.ok(plan.supported.includes("kick"));
    assert.ok(plan.supported.includes("hold"));
  });

  it("world type influences capabilities", () => {
    const host = studioCharacterListItem({
      id: "host-1",
      name: "Community Host",
      worldProfileId: "world-1",
    });
    const world = studioWorldProfileListItem({
      id: "world-1",
      name: "Community World",
      visualStyle: buildWorldVisualField(
        {
          worldType: "community_universe",
          visualStyle: "community",
          shapeLanguage: "friendly",
          colorTheme: "warm",
          lighting: "daylight",
          mood: "warm",
          environmentFeel: "local",
          freeTags: [],
        },
        ""
      ),
    });
    const plan = buildCharacterCapabilities({
      character: host,
      worlds: [world],
    });
    assert.ok(plan.supported.includes("collaborate"));
    assert.ok(plan.supported.includes("greet"));
  });

  it("classifies chef cooking as supported", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef",
    });
    const plan = buildCharacterCapabilities({ character: chef });
    const result = classifySceneActions({
      scene: studioSceneDetail({
        order: 0,
        action: "koken en proeven van het gerecht",
      }),
      characterPlan: plan,
    });
    assert.ok(result.actions.some((a) => a.classification === "supported"));
  });

  it("classifies chef football tricks as unusual", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef",
    });
    const plan = buildCharacterCapabilities({ character: chef });
    const result = classifySceneActions({
      scene: studioSceneDetail({
        order: 0,
        action: "voetbaltrucs en ruimtegevecht",
      }),
      characterPlan: plan,
    });
    assert.ok(result.actions.some((a) => a.classification === "unusual"));
  });

  it("enriches render strategy complexity with capability actions", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "bal hooghouden, schieten, juichen en rennen",
        }),
      ],
    });
    const plan = buildStudioRenderStrategyPlan({ storyboard });
    assert.equal(plan.actionComplexity, "high");
    assert.ok(plan.actionComplexityScore >= 3);
  });

  it("shot planner prefers detail beat for cooking", () => {
    const beats = buildSceneShotBeats({
      scene: {
        sceneId: "s1",
        order: 0,
        title: "Kitchen",
        action: "koken en roeren",
        emotion: "focused",
      },
      arcPhase: "build_up",
      focusShot: "medium",
      focusMovement: "static",
    });
    assert.ok(beats.some((b) => b.role === "detail"));
  });

  it("builds storyboard action intelligence with shot hints", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef",
    });
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "koken en serveren",
          characters: [chef],
        }),
      ],
    });
    const intel = buildStoryboardActionIntelligence({
      storyboard,
      characters: [chef],
    });
    assert.equal(intel.characterPlans.length, 1);
    assert.ok(intel.sceneClassifications.length >= 1);
    assert.ok(intel.shotHints.some((h) => h.capabilityId === "cook"));
  });

  it("tracks action memory trends from storyboard", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, action: "koken" }),
        studioSceneDetail({ order: 1, action: "serveren en presenteren" }),
        studioSceneDetail({ order: 2, action: "oogsten" }),
      ],
    });
    const trends = buildProjectActionMemoryTrends([storyboard]);
    assert.ok(trends.length >= 2);
    assert.ok(trends.some((t) => t.capabilityId === "cook"));
  });

  it("director proposal includes action intelligence", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef",
    });
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "koken",
          characters: [chef],
        }),
      ],
    });
    const proposal = buildDirectorProposal({
      idea: "Chef Marco cooks a community meal",
      storyboard,
      characters: [chef],
      locations: [],
      props: [],
      worlds: [],
    });
    assert.ok(proposal?.actionIntelligence);
    assert.ok(proposal.actionIntelligence.characterPlans.length >= 1);
  });
});
