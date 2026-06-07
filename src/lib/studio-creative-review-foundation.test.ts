import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCreativeReview, buildCreativeReviewContext } from "@/lib/studio-creative-review";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-creative-review", () => {
  it("builds creative review with quality summary", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, title: "Opening", action: "Welcome guests" }),
        studioSceneDetail({ order: 1, title: "Show product", action: "Present dish" }),
        studioSceneDetail({ order: 2, title: "CTA", action: "Order now at HomeCheff" }),
      ],
    });
    const review = buildCreativeReview({
      storyboard,
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
    });
    assert.equal(review.version, 1);
    assert.ok(review.qualitySummary.score >= 0);
    assert.ok(review.storyReview.phases.length >= 3);
    assert.ok(Array.isArray(review.strengths));
    assert.ok(Array.isArray(review.weaknesses));
    assert.ok(review.directorContextLines.some((l) => l.startsWith("review:")));
  });

  it("story review maps structure phases", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, title: "Intro" }),
        studioSceneDetail({ order: 1, title: "Build" }),
        studioSceneDetail({ order: 2, title: "Climax", emotion: "excited" }),
        studioSceneDetail({ order: 3, title: "End" }),
      ],
    });
    const review = buildCreativeReview({ storyboard });
    const phaseIds = review.storyReview.phases.map((p) => p.phase);
    assert.ok(phaseIds.includes("intro"));
    assert.ok(phaseIds.includes("climax"));
  });

  it("asset review lists missing assets from evolution", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [] })],
    });
    const review = buildCreativeReview({
      storyboard,
      characters: [],
      locations: [],
    });
    assert.ok(Array.isArray(review.assetReview.items));
    assert.ok(Array.isArray(review.missingElements));
  });

  it("action review includes distribution signals", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "Runs, jumps, kicks ball, scores and celebrates",
        }),
      ],
    });
    const review = buildCreativeReview({
      storyboard,
      characters: [studioCharacterListItem({ id: "m1", name: "Mascot", isMascot: true })],
    });
    assert.ok(Array.isArray(review.actionReview.items));
  });

  it("image review reports generation readiness", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const review = buildCreativeReview({ storyboard });
    assert.ok(review.imageReview.items.length > 0);
    assert.ok(typeof review.imageReview.orderLogical === "boolean");
  });

  it("audio review maps narration and music status", () => {
    const storyboard = studioStoryboardDetail({
      voiceEnabled: true,
      voiceNarrationScript: "Welcome to our story",
      musicEnabled: true,
      musicStyle: "uplifting",
      scenes: [studioSceneDetail({ order: 0, description: "Scene copy" })],
    });
    const review = buildCreativeReview({ storyboard });
    assert.equal(review.audioReview.items.length, 4);
    assert.ok(review.audioReview.items.some((i) => i.id === "audio-narration"));
  });

  it("render review includes strategy and execution signals", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, action: "Kick ball" }),
        studioSceneDetail({ order: 1, action: "Score goal" }),
      ],
    });
    const review = buildCreativeReview({ storyboard });
    assert.ok(review.renderReview.strategy.length > 0);
    assert.ok(review.renderReview.items.length > 0);
  });

  it("production memory review is optional", () => {
    const review = buildCreativeReview({
      storyboard: studioStoryboardDetail({ scenes: [] }),
    });
    assert.equal(review.memoryReview.similarProductionCount, 0);
  });

  it("AI Director consumes creativeReviewContext", () => {
    const idea = "HomeCheff promo with chef presenting garden vegetables";
    const storyboard = studioStoryboardDetail({ scenes: [], aiDirectorPrompt: idea });
    const proposal = buildDirectorProposal({
      idea,
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    assert.ok(proposal!.creativeReviewContext);
    assert.ok(proposal!.creativeReviewContext!.contextLines.length > 0);
  });

  it("creative review context exposes recommendation keys", () => {
    const context = buildCreativeReviewContext({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({ order: 0 }),
          studioSceneDetail({ order: 1 }),
          studioSceneDetail({ order: 2 }),
        ],
      }),
    });
    assert.ok(context.review);
    assert.ok(context.contextLines.length > 0);
  });
});
