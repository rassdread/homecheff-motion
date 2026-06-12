import assert from "node:assert/strict";
import test from "node:test";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  buildMissingAssetRequirements,
  estimateMissingAssetCredits,
  persistWizardConceptToHc,
} from "@/lib/studio-brief-asset-wizards";
import { enrichCharacterFromWizard } from "@/lib/studio-character-wizard";
import { storeMotionIntentInHc, readMotionIntentFromHc } from "@/lib/motion-hc-intent";
import { storeProductionRouteInHc, storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import { buildStoryPlanFromBrief } from "@/lib/studio-build-story-plan";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";
import { createPhotoStoryProject, createSlideshowProject } from "@/lib/publish-photo-story";
import {
  addTimelineBrandingItem,
  addTimelineMusicItem,
  addTimelineTextItem,
  addTimelineVoiceItem,
  applyTimelineToPublishProject,
  createPublishTimeline,
  deleteTimelineItem,
  duplicateTimelineItem,
  toggleTimelineItemLock,
} from "@/lib/publish-timeline";
import { createPublishProject } from "@/lib/publish-overlay-session";
import { resolveLibraryHref } from "@/lib/editor-semantic-record-merge";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";
import { storePublishIntakeInHc } from "@/lib/publish-intake-hc";

function sampleHcProject() {
  const doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/a.jpg" });
  return buildHomeCheffProjectFromEditorDocument({ document: doc });
}

test("production brief stores selections in HC workflow", () => {
  let project = sampleHcProject();
  project = storeStudioWorkflowInHc(project, {
    phase: "plan",
    idea: "Garden promo",
    briefSelections: DEFAULT_BRIEF_SELECTIONS,
  });
  const wf = project.workflowState.aiWorkflowV2 as { studio?: { idea?: string } };
  assert.equal(wf.studio?.idea, "Garden promo");
});

test("build story creates scenes from brief", () => {
  const brief = buildProductionBrief({
    idea: "Chef opens a new restaurant",
    characters: [],
    locations: [],
    props: [],
    worlds: [],
    projectMemory: null,
  });
  assert.ok(brief);
  const plan = buildStoryPlanFromBrief({ brief: brief!, selections: DEFAULT_BRIEF_SELECTIONS });
  assert.ok(plan.scenes.length >= 1);
  assert.ok(plan.logline.length > 0);
});

test("production route saved in HC", () => {
  let project = sampleHcProject();
  project = storeProductionRouteInHc(project, "asset_first");
  const wf = project.workflowState.aiWorkflowV2 as { studio?: { productionRoute?: string } };
  assert.equal(wf.studio?.productionRoute, "asset_first");
});

test("generate missing assets creates requirements and HC refs", () => {
  const brief = buildProductionBrief({
    idea: "Product launch with hero character",
    characters: [],
    locations: [],
    props: [],
    worlds: [],
    projectMemory: null,
  })!;
  const plan = buildStoryPlanFromBrief({ brief, selections: DEFAULT_BRIEF_SELECTIONS });
  const reqs = buildMissingAssetRequirements({ storyPlan: plan });
  assert.ok(reqs.length > 0);
  assert.ok(estimateMissingAssetCredits(reqs) >= 1);

  let project = sampleHcProject();
  const concept = enrichCharacterFromWizard({
    type: "human",
    presentation: "neutral",
    ageEnergy: "adult",
    style: "cinematic",
    coreTrait: "friendly",
  });
  project = persistWizardConceptToHc(project, "character", concept);
  assert.ok(project.assetReferences.some((r) => r.kind === "character"));
});

test("photo story entry mode creates MP4-ready project", () => {
  const project = createPhotoStoryProject({
    name: "Recipe card",
    imageUrl: "https://cdn.example.com/food.jpg",
    durationSeconds: 5,
  });
  assert.equal(project.workflow, "photo_story");
  assert.equal(project.mediaKind, "image");
  assert.equal(project.metadata?.renderMode, "ken_burns");
});

test("slideshow entry mode creates timeline slides", () => {
  const project = createSlideshowProject({
    name: "Deck",
    imageUrls: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
    durationSeconds: 10,
  });
  assert.equal(project.workflow, "slideshow");
  assert.ok((project.imageUrls ?? []).length === 2);
});

test("timeline text voice music branding items and export apply", () => {
  let project = createPublishProject({ name: "Demo", videoUrl: "https://cdn.example.com/v.mp4", durationSeconds: 12 });
  let tl = createPublishTimeline(project.id, 12);
  tl = addTimelineTextItem(tl, { text: "Hello", playhead: 0 });
  tl = addTimelineVoiceItem(tl, { script: "Welcome", startTime: 0 });
  tl = addTimelineMusicItem(tl, { mood: "upbeat" });
  tl = addTimelineBrandingItem(tl, { label: "Logo end card" });
  assert.equal(tl.items.length, 4);
  project = applyTimelineToPublishProject({ ...project, metadata: { ...project.metadata, publishTimeline: { ...tl, pendingRender: true } } });
  assert.equal(project.metadata?.voiceScript, "Welcome");
  assert.ok(project.overlays.length >= 1);
});

test("timeline delete duplicate lock", () => {
  let tl = addTimelineTextItem(createPublishTimeline("p1", 10), { text: "A", playhead: 0 });
  const id = tl.items[0]!.id;
  tl = duplicateTimelineItem(tl, id);
  assert.equal(tl.items.length, 2);
  tl = toggleTimelineItemLock(tl, id);
  assert.equal(tl.items[0]!.locked, true);
  const copyId = tl.items[1]!.id;
  tl = deleteTimelineItem(tl, copyId);
  assert.equal(tl.items.length, 1);
});

test("no render before final export — pending cleared after apply", () => {
  let project = createPublishProject({ name: "Demo", videoUrl: "https://cdn.example.com/v.mp4", durationSeconds: 8 });
  const tl = addTimelineTextItem(createPublishTimeline(project.id, 8), { text: "CTA", kind: "cta", fullDuration: true });
  assert.equal(tl.pendingRender, true);
  project = applyTimelineToPublishProject({ ...project, metadata: { ...project.metadata, publishTimeline: tl } });
  const applied = project.metadata?.publishTimeline as { pendingRender?: boolean };
  assert.equal(applied.pendingRender, false);
});

test("HC asset ref upsert attaches reference", () => {
  let project = sampleHcProject();
  const ref = createHcAssetReference({
    id: "asset-1",
    kind: "character",
    role: "Hero",
    sourceService: "editor",
    url: "https://cdn.example.com/hero.jpg",
  });
  project = upsertHcAssetReference(project, ref);
  assert.equal(project.assetReferences.length, 1);
  project = upsertHcAssetReference(project, { ...ref, role: "Updated hero" });
  assert.equal(project.assetReferences[0]!.role, "Updated hero");
});

test("motion intent saved in HC workflowState", () => {
  let project = sampleHcProject();
  project = storeMotionIntentInHc(project, "story");
  assert.equal(project.workflowState.motionIntent, "story");
  assert.equal(readMotionIntentFromHc(project), "story");
});

test("library href resolves to studio assets hub", () => {
  assert.match(resolveLibraryHref("character", "abc"), /\/studio\/assets\/creative\/characters\/abc/);
});

test("publish intake stores relationships in HC", () => {
  let project = sampleHcProject();
  project = storePublishIntakeInHc(project, {
    description: "Social promo",
    entryMode: "slideshow",
    files: [
      { id: "img1", name: "a.jpg", url: "https://cdn.example.com/a.jpg", mimeType: "image/jpeg", labels: ["image"] },
      { id: "img2", name: "b.jpg", url: "https://cdn.example.com/b.jpg", mimeType: "image/jpeg", labels: ["image"] },
    ],
  });
  const bundle = project.workflowState.publishIntake as { relationships?: unknown[] };
  assert.ok(bundle.relationships?.length);
});

test("service landings point examples to dedicated routes", () => {
  assert.equal(studioProductLandingConfig("editor").secondaryCtaHref, "/editor/examples");
  assert.equal(studioProductLandingConfig("motion").secondaryCtaHref, "/motion/examples");
  assert.equal(studioProductLandingConfig("publish").secondaryCtaHref, "/publish/examples");
  assert.equal(studioProductLandingConfig("studio").secondaryCtaHref, "/studio/examples");
});
