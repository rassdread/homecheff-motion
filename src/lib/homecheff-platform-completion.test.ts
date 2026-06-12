import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareHcProjectForMotion,
  prepareHcProjectForPublish,
  resolveHcProjectServiceReadiness,
} from "@/lib/homecheff-project-prepare";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  pickBestSafeZone,
  resolvePublishOrientation,
  resolveSafeZonesForOrientation,
  scoreSafeZones,
} from "@/lib/publish-safe-zone-v2";
import { applyTextRewrite, planHasPendingChanges, upsertPublishSegmentPlan } from "@/lib/publish-change-plan";
import {
  buildMotionPromptForRoute,
  estimateProductionRouteCredits,
  routeRequiresAssetPlan,
} from "@/lib/studio-production-route";
import { readHcWorkflowV2, storeProductionRouteInHc, storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import { createPublishProject } from "@/lib/publish-overlay-session";
import { buildStudioStorylineFromIdea, rewriteStudioStoryline } from "@/lib/studio-story-generator";
import { buildPublishAiProposal } from "@/lib/publish-ai-assistant";
import { analyzePublishVideoFrames } from "@/lib/publish-video-analysis";
import { proposalToChangePlan } from "@/lib/publish-change-plan-apply";
import { buildStudioProjectInventory } from "@/lib/studio-project-inventory";
import { buildStoryPlanFromBrief } from "@/lib/studio-build-story-plan";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";

function sampleHcProject() {
  const doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/a.jpg" });
  return buildHomeCheffProjectFromEditorDocument({ document: doc });
}

test("prepareHcProjectForMotion creates motion state when missing", () => {
  const project = sampleHcProject();
  assert.equal(resolveHcProjectServiceReadiness(project, "motion").ready, false);
  const result = prepareHcProjectForMotion(project);
  assert.equal(result.prepared, true);
  assert.ok(result.project.servicePayload.motion);
});

test("prepareHcProjectForPublish creates publish state when missing", () => {
  const project = sampleHcProject();
  const result = prepareHcProjectForPublish(project, { publishIntent: "social_post" });
  assert.equal(result.prepared, true);
  assert.equal(result.project.servicePayload.publish?.publishIntent, "social_post");
});

test("portrait safe zones use 8 orientation-aware regions", () => {
  const zones = resolveSafeZonesForOrientation("portrait");
  assert.equal(zones.length, 8);
  assert.ok(zones.includes("middle_upper_left"));
});

test("landscape safe zones use 8 expanded regions", () => {
  const zones = resolveSafeZonesForOrientation("landscape");
  assert.equal(zones.length, 8);
  assert.ok(zones.includes("top_center_left"));
});

test("safe zone scoring picks unoccupied zone", () => {
  const heatmap = scoreSafeZones({
    orientation: "portrait",
    occupiedZones: ["top_left"],
  });
  const best = pickBestSafeZone(heatmap);
  assert.notEqual(best.zone, "top_left");
  assert.equal(best.needsManual, false);
});

test("publish change plan defers render until final", () => {
  let plan = { projectId: "p1", segments: [], pendingRender: false, lastEditedAt: "" };
  plan = upsertPublishSegmentPlan(plan, {
    id: "s1",
    startTime: 0,
    endTime: 2,
    originalText: "Hello world",
    proposedText: "Hello",
    acceptedText: "Hello",
  });
  assert.equal(planHasPendingChanges(plan), true);
});

test("publish text rewrite shorten reduces length", () => {
  const out = applyTextRewrite("One two three four five six", "shorten");
  assert.ok(out.split(" ").length <= 4);
});

test("studio storyline generates script scenes from idea", () => {
  const story = buildStudioStorylineFromIdea("Future self cooking challenge");
  assert.ok(story.scenes.length >= 2);
  assert.ok(story.logline.toLowerCase().includes("future self"));
  const shorter = rewriteStudioStoryline(story, "shorter");
  assert.ok(shorter.scenes.length <= story.scenes.length);
});

test("resolvePublishOrientation detects portrait", () => {
  assert.equal(resolvePublishOrientation(9 / 16), "portrait");
  assert.equal(resolvePublishOrientation(16 / 9), "landscape");
});

test("publish AI assistant builds proposal without rendering", () => {
  const project = createPublishProject({ name: "Summer drop", videoUrl: "https://cdn.example.com/v.mp4", source: "upload" });
  const proposal = buildPublishAiProposal({ project });
  assert.equal(proposal.title, "Summer drop");
  assert.ok(proposal.overlayTexts.length >= 1);
  assert.ok(proposal.socialCaptions.length >= 1);
});

test("publish change plan defers render from AI acceptance", () => {
  const project = createPublishProject({ name: "Test", videoUrl: "https://cdn.example.com/v.mp4", source: "upload" });
  const proposal = buildPublishAiProposal({ project });
  const plan = proposalToChangePlan(project.id, proposal, { title: true, overlays: true, subtitles: true, voice: false, music: false, branding: true, captions: true, cta: true });
  assert.equal(plan.pendingRender, true);
  assert.ok(plan.segments.some((s) => s.id === "prop_title" || s.id === "scene_1"));
});

test("publish video analysis recommends safe zones", () => {
  const result = analyzePublishVideoFrames({ durationSec: 6, aspectRatio: 9 / 16, hasExistingText: true });
  assert.ok(result.sampledFrames >= 1);
  assert.ok(result.recommendations.length >= 1);
});

test("studio inventory lists missing assets for empty project", () => {
  const inv = buildStudioProjectInventory(null);
  assert.ok(inv.missing.includes("characters"));
  assert.ok(inv.suggestions.length >= 1);
});

test("hc workflow v2 stores studio state in project", () => {
  const project = sampleHcProject();
  const next = storeStudioWorkflowInHc(project, { phase: "collect", idea: "Garden campaign" });
  const wf = readHcWorkflowV2(next);
  assert.equal(wf.studio?.idea, "Garden campaign");
});

test("production route prompt-only skips asset plan requirement", () => {
  assert.equal(routeRequiresAssetPlan("prompt_only"), false);
  assert.equal(routeRequiresAssetPlan("asset_first"), true);
});

test("production route credit estimate differs per route", () => {
  const plan = buildStoryPlanFromBrief({
    brief: buildProductionBrief({ idea: "Chef promo" })!,
    selections: DEFAULT_BRIEF_SELECTIONS,
  });
  const fast = estimateProductionRouteCredits("prompt_only", plan);
  const controlled = estimateProductionRouteCredits("asset_first", plan);
  assert.ok(controlled.totalCredits > fast.totalCredits);
});

test("prompt-only builds motion prompt without locked assets", () => {
  const plan = buildStoryPlanFromBrief({
    brief: buildProductionBrief({ idea: "Garden" })!,
    selections: DEFAULT_BRIEF_SELECTIONS,
  });
  const prompt = buildMotionPromptForRoute({ route: "prompt_only", idea: "Garden", storyPlan: plan });
  assert.ok(prompt.includes("invent"));
});

test("asset-first motion prompt locks assets", () => {
  const plan = buildStoryPlanFromBrief({
    brief: buildProductionBrief({ idea: "Brand" })!,
    selections: DEFAULT_BRIEF_SELECTIONS,
  });
  const prompt = buildMotionPromptForRoute({
    route: "asset_first",
    idea: "Brand",
    storyPlan: plan,
    lockedAssets: ["Hero"],
  });
  assert.ok(prompt.includes("fixed assets"));
});

test("production route stored in HC workflow", () => {
  const project = sampleHcProject();
  const next = storeProductionRouteInHc(project, "mixed");
  assert.equal(readHcWorkflowV2(next).studio?.productionRoute, "mixed");
});
