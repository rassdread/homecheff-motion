import assert from "node:assert/strict";
import test from "node:test";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { assetPickerSelectionToDerivationSource } from "@/lib/editor-canvas-session";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { readHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import { buildPublishAiProposal } from "@/lib/publish-ai-assistant";
import { proposalToChangePlan } from "@/lib/publish-change-plan-apply";
import { createPosterProject, isPosterProject } from "@/lib/publish-poster";
import { createPhotoStoryProject, createSlideshowProject } from "@/lib/publish-photo-story";
import {
  buildPhotoStorySceneBlocks,
  buildSlideshowSceneBlocks,
  isPhotoStoryDuration,
  readPhotoStoryMessage,
} from "@/lib/publish-story-proposal";
import {
  buildSummaryPromptForBriefAsset,
  persistGeneratedBriefAssetToHc,
  type GeneratedBriefAsset,
} from "@/lib/studio-brief-asset-generation";
import { enrichCharacterFromWizard } from "@/lib/studio-character-wizard";
import { storePublishIntakeInHc } from "@/lib/publish-intake-hc";

function sampleHcProject() {
  const doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/a.jpg" });
  return buildHomeCheffProjectFromEditorDocument({ document: doc });
}

test("photo story scene blocks from message and duration", () => {
  const scenes = buildPhotoStorySceneBlocks({
    message: "Welcome. Discover local creators. Join the community. Shop today.",
    durationSeconds: 30,
  });
  assert.ok(scenes.length >= 4);
  assert.equal(scenes[0]!.index, 1);
  assert.equal(scenes[scenes.length - 1]!.endTime, 30);
  assert.ok(scenes.every((s) => s.overlayText.length > 0));
});

test("photo story duration choices", () => {
  assert.equal(isPhotoStoryDuration(10), true);
  assert.equal(isPhotoStoryDuration(5), false);
});

test("create photo story project stores message metadata", () => {
  const project = createPhotoStoryProject({
    name: "Launch",
    imageUrl: "https://cdn.example.com/hero.jpg",
    durationSeconds: 20,
    photoStoryMessage: "Our story in one image.",
  });
  assert.equal(readPhotoStoryMessage(project), "Our story in one image.");
  assert.equal(project.durationSeconds, 20);
});

test("slideshow scene blocks match image count", () => {
  const scenes = buildSlideshowSceneBlocks({ imageCount: 3, durationSeconds: 12 });
  assert.equal(scenes.length, 3);
});

test("publish AI proposal includes scene blocks for photo story", () => {
  const project = createPhotoStoryProject({
    name: "Cafe",
    imageUrl: "https://cdn.example.com/cafe.jpg",
    durationSeconds: 30,
    photoStoryMessage: "Fresh coffee every morning.",
  });
  const proposal = buildPublishAiProposal({ project });
  assert.ok(proposal.scenes.length >= 4);
  assert.ok(proposal.voiceOverScript.includes("Fresh") || proposal.voiceOverScript.length > 0);
});

test("proposal change plan uses scene timing", () => {
  const project = createPhotoStoryProject({
    name: "Test",
    imageUrl: "https://cdn.example.com/a.jpg",
    durationSeconds: 30,
    photoStoryMessage: "One. Two. Three. Four.",
  });
  const proposal = buildPublishAiProposal({ project });
  const plan = proposalToChangePlan(project.id, proposal, { overlays: true, title: true, cta: true, subtitles: true });
  const timed = plan.segments.find((s) => s.startTime > 0 || s.endTime < 999);
  assert.ok(timed);
});

test("poster project workflow", () => {
  const project = createPosterProject({
    name: "Event",
    blankCanvas: true,
    intake: { title: "Summer Fest", cta: "Join us" },
  });
  assert.equal(isPosterProject(project), true);
  assert.equal(project.metadata?.blankCanvas, true);
});

test("brief asset prompt builder for character", () => {
  const concept = enrichCharacterFromWizard({
    type: "human",
    presentation: "brand",
    ageEnergy: "adult",
    style: "realistic",
    coreTrait: "friendly",
  });
  const { summaryPrompt } = buildSummaryPromptForBriefAsset("character", concept);
  assert.match(summaryPrompt, /human lead/);
});

test("persist generated brief asset to HC workflow", () => {
  let project = sampleHcProject();
  const asset: GeneratedBriefAsset = {
    id: "brief_char_1",
    kind: "character",
    name: "Hero",
    thumbnailUrl: "https://cdn.example.com/thumb.png",
    referenceImageUrl: "https://cdn.example.com/ref.png",
    referenceStorageKey: "studio/ref.png",
    provider: "test",
    generatedPrompt: "Hero chef",
    estimatedCredits: 2,
    createdAt: new Date().toISOString(),
    origin: "brief_wizard",
    projectId: project.id,
  };
  project = persistGeneratedBriefAssetToHc(project, asset);
  const root = readHcWorkflowV2(project);
  const stored = (root.generatedBriefAssets as Record<string, GeneratedBriefAsset>)[asset.id];
  assert.equal(stored?.name, "Hero");
  assert.ok(project.assetReferences.some((r) => r.id === asset.id));
});

test("asset picker maps to editor derivation source", () => {
  const source = assetPickerSelectionToDerivationSource({
    id: "char_1",
    name: "Mascot",
    category: "characters",
    url: "https://cdn.example.com/m.png",
    storageKey: "chars/m.png",
  });
  assert.equal(source.kind, "character");
  assert.equal(source.referenceImageUrl, "https://cdn.example.com/m.png");
});

test("HC publish intake preserves entry mode", () => {
  let project = sampleHcProject();
  project = storePublishIntakeInHc(project, {
    entryMode: "photo_story",
    description: "Launch story",
    files: [{ id: "f1", name: "hero.jpg", url: "https://cdn.example.com/h.jpg", mimeType: "image/jpeg", labels: ["image"] }],
  });
  const bundle = project.workflowState.publishIntake as { entryMode?: string };
  assert.equal(bundle.entryMode, "photo_story");
});

test("slideshow project creates timeline slides", () => {
  const project = createSlideshowProject({
    name: "Trip",
    imageUrls: ["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"],
  });
  const timeline = project.metadata?.publishTimeline;
  assert.ok(timeline);
  assert.ok(timeline.items.filter((i) => i.kind === "slide").length >= 2);
});

test("HC asset ref upsert for cross-service continuity", () => {
  let project = sampleHcProject();
  const ref = createHcAssetReference({
    id: "asset_studio_1",
    url: "https://cdn.example.com/studio.png",
    kind: "character",
    role: "Hero",
    sourceService: "studio",
  });
  project = upsertHcAssetReference(project, ref);
  assert.ok(project.assetReferences.find((r) => r.id === "asset_studio_1"));
});
