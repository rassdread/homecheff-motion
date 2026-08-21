/**
 * S2G — Unified Finish resolver / adapters / success actions.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  finishToolForAdapter,
  getStudioFinishAdapter,
} from "@/lib/studio-finish-adapters";
import {
  inferFinishOrigin,
  resolveStudioFinishPlan,
  resolveStudioFinishSuccessActions,
} from "@/lib/studio-finish-resolve";
import {
  mapBackendStatusToFinishProgress,
  stageLinkForFinishIssue,
} from "@/types/studio-finish";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";

function readyScene(id: string) {
  return studioSceneDetail({
    id,
    title: "Opening",
    action: "Walks in",
    selectedSceneImageId: "img1",
    sceneImages: [{ id: "img1", url: "https://example.com/a.jpg" } as never],
  });
}

describe("S2G finish modes + adapter resolution", () => {
  it("FREE_LOCAL for quick_video origin", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      intent: {
        origin: "quick_video",
        hasExistingOutput: false,
      },
    });
    assert.equal(plan.mode, "FREE_LOCAL_VIDEO");
    assert.equal(plan.adapterId, "local_quick_video");
    assert.equal(plan.cost.isFree, true);
    assert.equal(plan.cost.estimatedCredits, 0);
    assert.equal(plan.providerCalls, 0);
    assert.equal(getStudioFinishAdapter(plan.adapterId)?.executionSurface, "photo_video_local");
  });

  it("MOTION_VIDEO for advanced story without existing output", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      intent: {
        origin: "advanced_story",
        hasExistingOutput: false,
        motionProjectId: "ap-1",
      },
    });
    assert.equal(plan.mode, "MOTION_VIDEO");
    assert.equal(plan.primaryActionKey, "studio.finish.cta.makeVideo");
    assert.equal(finishToolForAdapter(plan.adapterId), "render");
  });

  it("EXISTING_OUTPUT → Nieuwe versie maken", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      hasCompletedFinal: true,
      intent: {
        origin: "standalone",
        hasExistingOutput: true,
        motionProjectId: "ap-1",
      },
    });
    assert.equal(plan.mode, "EXISTING_OUTPUT");
    assert.equal(plan.primaryActionKey, "studio.finish.cta.newVersion");
    assert.equal(plan.hasExistingOutput, true);
  });

  it("LANGUAGE_EXPORT desired mode", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      hasCompletedFinal: true,
      intent: {
        origin: "advanced_story",
        hasExistingOutput: true,
        desiredMode: "LANGUAGE_EXPORT",
      },
    });
    assert.equal(plan.mode, "LANGUAGE_EXPORT");
    assert.equal(plan.primaryActionKey, "studio.finish.cta.makeLanguage");
  });
});

describe("S2G readiness + blockers", () => {
  it("ready story enables Video maken", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      intent: { origin: "advanced_story", hasExistingOutput: false },
    });
    assert.equal(plan.primaryActionEnabled, true);
    assert.equal(plan.blockingIssues.length, 0);
    assert.ok((plan.output.approximateDurationSeconds ?? 0) >= 1);
  });

  it("missing visual blocks and links to Beeld", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            id: "s1",
            order: 0,
            title: "Opening",
            action: "Walks in",
            selectedSceneImageId: null,
            sceneImages: [],
          }),
        ],
      }),
      intent: { origin: "advanced_story", hasExistingOutput: false },
    });
    assert.equal(plan.primaryActionEnabled, false);
    assert.ok(plan.blockingIssues.some((i) => i.code === "SCENE_MISSING_VISUAL"));
    const link = stageLinkForFinishIssue("visuals");
    assert.equal(link.stage, "visuals");
    assert.equal(link.labelKey, "studio.finish.fix.goVisuals");
  });

  it("voice warning when enabled without script", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        voiceNarrationScript: null,
        scenes: [readyScene("s1")],
      }),
      intent: { origin: "advanced_story", hasExistingOutput: false },
    });
    assert.ok(
      plan.warnings.some((w) => w.code === "VOICE_ENABLED_NO_SCRIPT") ||
        plan.blockingIssues.some((b) => b.code === "VOICE_ENABLED_NO_SCRIPT")
    );
  });
});

describe("S2G success actions", () => {
  it("standalone max 3", () => {
    const actions = resolveStudioFinishSuccessActions({ origin: "standalone" });
    assert.ok(actions.length <= 3);
    assert.equal(actions[0]?.id, "download");
  });

  it("HomeCheff primary use", () => {
    const actions = resolveStudioFinishSuccessActions({
      origin: "homecheff",
      homecheffItemId: "item-1",
    });
    assert.equal(actions[0]?.id, "use_on_homecheff");
    assert.ok(actions.some((a) => a.id === "download"));
  });

  it("Growth return preserved", () => {
    const actions = resolveStudioFinishSuccessActions({
      origin: "growth",
      returnUrl: "https://example.com/growth/leads/1",
    });
    assert.equal(actions[0]?.id, "download");
    assert.equal(actions[1]?.id, "return_growth");
    assert.equal(actions[1]?.href, "https://example.com/growth/leads/1");
  });

  it("inferFinishOrigin", () => {
    assert.equal(inferFinishOrigin({ isQuickVideo: true }), "quick_video");
    assert.equal(inferFinishOrigin({ homecheffItemId: "x" }), "homecheff");
    assert.equal(inferFinishOrigin({ growthLeadId: "g1" }), "growth");
    assert.equal(inferFinishOrigin({}), "advanced_story");
  });
});

describe("S2G progress mapping", () => {
  it("maps without leaking provider names", () => {
    assert.equal(mapBackendStatusToFinishProgress("vidu_running"), "animation");
    assert.equal(mapBackendStatusToFinishProgress("ffmpeg_mux"), "composing");
    assert.equal(mapBackendStatusToFinishProgress("completed"), "done");
    assert.equal(mapBackendStatusToFinishProgress("failed"), "failed");
  });
});

describe("S2G provider call safety on resolve", () => {
  it("plan always reports 0 providerCalls", () => {
    const plan = resolveStudioFinishPlan({
      storyboard: studioStoryboardDetail({ scenes: [readyScene("s1")] }),
      intent: { origin: "advanced_story", hasExistingOutput: false },
      approximateCredits: 24,
    });
    assert.equal(plan.providerCalls, 0);
    assert.equal(plan.cost.estimatedCredits, 24);
  });
});

describe("S2G i18n finish keys", () => {
  it("NL/EN parity for finish surface", () => {
    const keys = [
      "studio.finish.title",
      "studio.finish.cta.makeVideo",
      "studio.finish.cta.newVersion",
      "studio.finish.success.download",
      "studio.finish.issue.SCENE_MISSING_VISUAL",
      "studio.tools.render",
      "studio.tools.export",
    ] as const;
    for (const key of keys) {
      assert.ok(en[key], key);
      assert.ok(nl[key], key);
    }
    assert.equal(nl["studio.finish.title"], "Afronden");
    assert.equal(nl["studio.finish.cta.makeVideo"], "Video maken");
    assert.equal(nl["studio.tools.render"], "Video maken");
    assert.equal(nl["studio.tools.export"], "Downloaden");
    assert.equal(en["studio.tools.render"], "Make video");
    assert.equal(en["studio.tools.export"], "Download");
  });
});
