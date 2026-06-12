import assert from "node:assert/strict";
import test from "node:test";
import {
  createAudioWithImageProject,
  createVoiceMessageProject,
  isVoiceMessageProject,
} from "@/lib/publish-audio-workflows";
import { publishWizardCanAdvance, publishWizardStepComplete } from "@/lib/publish-wizard-flow";
import {
  autoPrepareHcHandoff,
  buildHcContinuityHandoffUrl,
  resolveHcProjectStage,
  suggestHcProjectNextStep,
} from "@/lib/hc-project-continuity";
import { buildPublishAiProposal } from "@/lib/publish-ai-assistant";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { revokeObjectUrlSafe } from "@/lib/blob-object-url-lifecycle";
import { DEFAULT_BRIEF_V4_SELECTIONS } from "@/types/studio-production-brief-v4";
import { buildStudioStorylineFromIdea } from "@/lib/studio-story-generator";
import { prepareHcProjectForPublish, resolveHcProjectServiceReadiness } from "@/lib/homecheff-project-prepare";

function sampleHcProject() {
  const doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/a.jpg" });
  return buildHomeCheffProjectFromEditorDocument({ document: doc });
}

test("publish wizard gating requires step completion", () => {
  const state = { step: "intent" as const, uploadReady: true };
  assert.equal(publishWizardStepComplete(state, "upload"), true);
  assert.equal(publishWizardStepComplete(state, "intent"), false);
  assert.equal(publishWizardCanAdvance({ ...state, intent: "Social promo" }, "intent"), true);
});

test("voice message project workflow", () => {
  const project = createVoiceMessageProject({
    name: "Hello",
    audioUrl: "https://cdn.example.com/voice.mp3",
    message: "Welcome to our community",
    voiceInputMode: "generate",
  });
  assert.equal(isVoiceMessageProject(project), true);
  const proposal = buildPublishAiProposal({ project });
  assert.ok(proposal.scenes.length >= 1);
});

test("audio with image project workflow", () => {
  const project = createAudioWithImageProject({
    name: "Podcast clip",
    audioUrl: "https://cdn.example.com/a.mp3",
    imageUrl: "https://cdn.example.com/cover.jpg",
    message: "Episode 1",
  });
  assert.equal(project.workflow, "audio_with_image");
});

test("HC continuity suggests motion after editor", () => {
  const project = sampleHcProject();
  const next = suggestHcProjectNextStep(project);
  assert.equal(next?.targetService, "motion");
});

test("HC continuity handoff url uses prepare when service missing", () => {
  const project = sampleHcProject();
  assert.equal(resolveHcProjectServiceReadiness(project, "motion").ready, false);
  const url = buildHcContinuityHandoffUrl(project, "motion");
  assert.match(url, /prepare=motion/);
});

test("auto prepare publish on handoff", () => {
  const project = sampleHcProject();
  const next = autoPrepareHcHandoff(project, "publish", { publishIntent: "photo_story" });
  assert.equal(resolveHcProjectServiceReadiness(next, "publish").ready, true);
});

test("brief v4 selections default", () => {
  assert.equal(DEFAULT_BRIEF_V4_SELECTIONS.aiEverythingMode, false);
  assert.ok(DEFAULT_BRIEF_V4_SELECTIONS.visualStyles.includes("cinematic"));
});

test("story generator uses v4 context", () => {
  const story = buildStudioStorylineFromIdea("Garden opening", {
    emotions: ["joy"],
    visualStyles: ["pixar"],
    audience: ["youth"],
  });
  assert.match(story.logline, /pixar/i);
});

test("blob url revoke is safe for non-blob", () => {
  assert.doesNotThrow(() => revokeObjectUrlSafe("https://example.com/a.png"));
});

test("HC project stage resolves from services", () => {
  let project = sampleHcProject();
  assert.equal(resolveHcProjectStage(project), "plan");
  project = prepareHcProjectForPublish(project).project;
  assert.equal(resolveHcProjectStage(project), "complete");
});
