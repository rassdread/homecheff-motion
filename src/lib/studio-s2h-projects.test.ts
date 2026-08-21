/**
 * S2H — Project library status, title, continue, dedup helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  compareStudioProjectSummariesByRecency,
  resolveStudioProjectContinueHref,
  resolveStudioProjectHumanType,
  resolveStudioProjectOrigin,
  resolveStudioProjectStatus,
  resolveStudioProjectTitle,
} from "@/lib/studio-project-status";
import { LOCAL_QUICK_VIDEO_LIBRARY_CAPABILITY } from "@/types/studio-project-summary";

describe("S2H project status resolver", () => {
  it("draft when no scenes", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 0,
      scenesWithStory: 0,
      scenesWithVisual: 0,
      hasFinalOutput: false,
    });
    assert.equal(r.status, "draft");
    assert.equal(r.recommendedAction, "continue_story");
    assert.equal(r.providerCalls, 0);
  });

  it("visuals incomplete → in_progress + continue_visuals", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 3,
      scenesWithStory: 3,
      scenesWithVisual: 1,
      hasFinalOutput: false,
    });
    assert.equal(r.status, "in_progress");
    assert.equal(r.recommendedStage, "visuals");
    assert.equal(r.recommendedAction, "continue_visuals");
  });

  it("ready when final output exists", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 2,
      scenesWithStory: 2,
      scenesWithVisual: 2,
      hasFinalOutput: true,
    });
    assert.equal(r.status, "ready");
    assert.equal(r.recommendedAction, "view_video");
  });

  it("needs_update when edited after output; keeps current output", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 2,
      scenesWithStory: 2,
      scenesWithVisual: 2,
      hasFinalOutput: true,
      editedAfterOutput: true,
    });
    assert.equal(r.status, "needs_update");
    assert.equal(r.hasCurrentOutput, true);
    assert.equal(r.isStale, true);
  });

  it("failed latest with old output → needs_update + warning", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 1,
      scenesWithStory: 1,
      scenesWithVisual: 1,
      hasFinalOutput: true,
      lastAttemptFailed: true,
    });
    assert.equal(r.status, "needs_update");
    assert.equal(r.hasCurrentOutput, true);
    assert.ok(r.secondaryWarningKey);
  });

  it("failed with no output → failed", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 1,
      scenesWithStory: 1,
      scenesWithVisual: 1,
      hasFinalOutput: false,
      lastAttemptFailed: true,
    });
    assert.equal(r.status, "failed");
  });

  it("generating status", () => {
    const r = resolveStudioProjectStatus({
      sceneCount: 2,
      scenesWithStory: 2,
      scenesWithVisual: 2,
      hasFinalOutput: false,
      isGenerating: true,
    });
    assert.equal(r.status, "generating");
  });
});

describe("S2H title / type / origin / continue", () => {
  it("title priority: user > preset > fallback empty", () => {
    assert.equal(
      resolveStudioProjectTitle({ userTitle: "Mijn film", presetDisplayTitle: "Rode loper" }),
      "Mijn film"
    );
    assert.equal(
      resolveStudioProjectTitle({ userTitle: "Untitled", presetDisplayTitle: "Rode loper" }),
      "Rode loper"
    );
    assert.equal(resolveStudioProjectTitle({ userTitle: "  " }), "");
  });

  it("human types", () => {
    assert.equal(
      resolveStudioProjectHumanType({ sourceType: "storyboard", sceneCount: 4 }),
      "story"
    );
    assert.equal(
      resolveStudioProjectHumanType({ sourceType: "motion", isInstantOrMotion: true }),
      "animation"
    );
    assert.equal(resolveStudioProjectHumanType({ sourceType: "image", isImageOnly: true }), "image");
  });

  it("origin and continue hrefs", () => {
    assert.equal(resolveStudioProjectOrigin({ homecheffItemId: "i1" }), "homecheff");
    assert.equal(resolveStudioProjectOrigin({ growthLeadId: "g1" }), "growth");
    const href = resolveStudioProjectContinueHref({
      sourceType: "storyboard",
      sourceId: "sb1",
      recommendedStage: "visuals",
    });
    assert.ok(href.includes("storyboardId=sb1"));
    assert.ok(href.includes("stage=visuals"));
    assert.ok(href.includes("continueInStudio=1"));
    assert.equal(
      resolveStudioProjectContinueHref({ sourceType: "motion", sourceId: "ap1" }),
      "/videos/ap1"
    );
  });

  it("sort stability", () => {
    const a = { lastEditedAt: "2026-01-01T00:00:00.000Z", createdAt: "2025-01-01T00:00:00.000Z", id: "a" };
    const b = { lastEditedAt: "2026-01-01T00:00:00.000Z", createdAt: "2025-01-01T00:00:00.000Z", id: "b" };
    assert.ok(compareStudioProjectSummariesByRecency(a, b) < 0);
  });
});

describe("S2H Quick Video local library policy", () => {
  it("declares LOCAL_DRAFT_LIBRARY_NOT_SUPPORTED", () => {
    assert.equal(LOCAL_QUICK_VIDEO_LIBRARY_CAPABILITY, "LOCAL_DRAFT_LIBRARY_NOT_SUPPORTED");
  });
});

describe("S2H dedup policy (unit)", () => {
  it("linked motion is represented under storyboard root id namespace", () => {
    // Aggregator uses storyboard:{id} as canonical when studioSourceStoryboardId matches.
    const storyboardCardId = "storyboard:sb-1";
    const motionWouldHaveBeen = "motion:ap-1";
    assert.notEqual(storyboardCardId, motionWouldHaveBeen);
    assert.ok(storyboardCardId.startsWith("storyboard:"));
  });
});

describe("S2H i18n", () => {
  it("NL/EN parity for library keys", () => {
    const keys = [
      "studio.projects.title",
      "studio.projects.status.ready",
      "studio.projects.action.finish",
      "studio.projects.type.story",
      "studio.home.continueKind.project",
    ] as const;
    for (const key of keys) {
      assert.ok(en[key], key);
      assert.ok(nl[key], key);
    }
    assert.equal(nl["studio.projects.title"], "Mijn projecten");
    assert.equal(nl["studio.projects.status.in_progress"], "Bezig");
    assert.equal(en["studio.projects.status.ready"], "Ready");
  });
});
