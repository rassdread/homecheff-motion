import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActionShotDistribution,
  buildDurationAdvice,
  buildSceneActionChain,
  buildSceneActionShotDistribution,
  buildStoryboardActionShotDistribution,
} from "@/lib/studio-action-shot-distribution";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildSceneImageReadiness } from "@/lib/studio-visual-production-summary";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-action-shot-distribution", () => {
  it("detects football action chain with 4+ steps", () => {
    const chain = buildSceneActionChain({
      scene: studioSceneDetail({
        order: 0,
        action: "bal hooghouden, schieten, juichen en rennen",
        description: "Voetbalmascotte op het veld",
        durationSeconds: 8,
      }),
    });
    assert.ok(chain.steps.length >= 4);
    assert.ok(chain.recommendedShotCount >= 4);
    assert.ok(chain.actionLabelKeys.some((k) => k.includes("juggle") || k.includes("ballControl")));
  });

  it("builds shot beats for football sequence", () => {
    const scene = studioSceneDetail({
      order: 0,
      action: "bal hooghouden, schieten, juichen en rennen",
      durationSeconds: 8,
    });
    const chain = buildSceneActionChain({ scene });
    const dist = buildActionShotDistribution({ scene, actionChain: chain });
    assert.ok(dist.beats.length >= 4);
    assert.equal(dist.suggestsMultipleShots, true);
    assert.ok(dist.beats.some((b) => b.role === "payoff" || b.role === "closing"));
  });

  it("advises too short duration for multi-step action", () => {
    const advice = buildDurationAdvice({
      stepCount: 5,
      beatCount: 5,
      currentSeconds: 8,
    });
    assert.equal(advice.level, "too_short");
    assert.ok(advice.recommendedMinSeconds >= 20);
  });

  it("builds cooking setup action payoff beats", () => {
    const chef = studioCharacterListItem({
      id: "chef-1",
      name: "Chef Marco",
      defaultClothing: "chef",
    });
    const scene = studioSceneDetail({
      order: 0,
      action: "koken, roeren, proeven en serveren",
      characters: [chef],
      durationSeconds: 20,
    });
    const dist = buildSceneActionShotDistribution({
      scene,
      characterPlan: null,
    });
    assert.ok(dist.beats.length >= 3);
    assert.ok(dist.actionChain.steps.some((s) => s.id === "cook" || s.id === "stir"));
  });

  it("builds delivery pickup travel handoff chain", () => {
    const chain = buildSceneActionChain({
      scene: studioSceneDetail({
        order: 0,
        action: "pakket ophalen, bezorgen en overhandigen",
        durationSeconds: 15,
      }),
    });
    assert.ok(
      chain.steps.some((s) => ["pickup", "travel", "handoff", "deliver"].includes(s.id) ||
        s.capabilityId === "deliver" || s.capabilityId === "carry")
    );
  });

  it("builds garden plant water harvest chain", () => {
    const chain = buildSceneActionChain({
      scene: studioSceneDetail({
        order: 0,
        action: "planten, water geven en oogsten",
        description: "Tuin scene",
      }),
    });
    assert.ok(chain.steps.length >= 2);
    assert.ok(
      chain.steps.some((s) => s.id === "plant" || s.id === "water" || s.id === "harvest")
    );
  });

  it("flags missing ball prop for sports action", () => {
    const chain = buildSceneActionChain({
      scene: studioSceneDetail({
        order: 0,
        action: "bal hooghouden en schieten",
        props: [],
      }),
    });
    assert.ok(chain.missingSupportingAssets.some((a) => a.reasonKey.includes("ballProp")));
  });

  it("render strategy consumes action shot distribution", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen en rennen",
          }),
        ],
      }),
    });
    assert.ok((plan.actionShotDistributions?.length ?? 0) >= 1);
    assert.ok(plan.suggestedShotSplitting.length >= 1);
    assert.equal(plan.recommendedStrategy, "action_chain");
  });

  it("visual production readiness includes action sequence check", () => {
    const readiness = buildSceneImageReadiness({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen en rennen",
            durationSeconds: 8,
          }),
        ],
      }),
      characters: [
        studioCharacterListItem({
          id: "m1",
          name: "Mascot",
          defaultClothing: "sporty",
          isMascot: true,
        }),
      ],
      props: [
        studioPropListItem({
          id: "ball",
          name: "Football",
          appearanceMemory: "hc:type=sport,hc:func=sports",
        }),
      ],
    });
    assert.ok(readiness.actionSequenceSceneIds?.length ?? 0 >= 1);
  });

  it("director proposal includes action shot distribution", () => {
    const proposal = buildDirectorProposal({
      idea: "Football mascot keeps ball up, shoots, cheers and runs",
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen en rennen",
          }),
        ],
      }),
      characters: [
        studioCharacterListItem({
          id: "m1",
          name: "Mascot",
          defaultClothing: "sporty",
        }),
      ],
      locations: [],
      props: [],
      worlds: [],
    });
    assert.ok(proposal?.actionShotDistribution);
  });

  it("storyboard distribution aggregates duration warnings", () => {
    const board = buildStoryboardActionShotDistribution({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen en rennen",
            durationSeconds: 6,
          }),
        ],
      }),
    });
    assert.equal(board.scenes.length, 1);
    assert.ok(board.scenesNeedingSplit >= 1 || board.scenes[0]!.durationAdvice.level === "too_short");
  });
});
