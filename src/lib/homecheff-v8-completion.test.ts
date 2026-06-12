import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublishAiEverythingProject,
  isPublishAiEverythingProject,
  runPublishAiEverythingPipeline,
} from "@/lib/publish-ai-everything";
import { syncPublishProjectToHc } from "@/lib/publish-hc-sync";
import {
  analyzeAiEverythingIdea,
  buildAiEverythingPipelinePlan,
  checkAiEverythingCredits,
  buildAutoConceptForRequirement,
} from "@/lib/studio-ai-everything-pipeline";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { DEFAULT_BRIEF_V4_SELECTIONS } from "@/types/studio-production-brief-v4";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";

function sampleHcProject() {
  const doc = createEditorDocumentFromUpload({ name: "Campaign", backgroundUrl: "https://cdn.example.com/a.jpg" });
  return buildHomeCheffProjectFromEditorDocument({ document: doc });
}

test("publish AI everything creates pipeline-ready project", () => {
  const draft = createPublishAiEverythingProject({
    name: "Garden promo",
    imageUrl: "https://cdn.example.com/hero.jpg",
    message: "Grow your own herbs at home.",
    durationSeconds: 20,
  });
  assert.equal(isPublishAiEverythingProject(draft), true);
  const piped = runPublishAiEverythingPipeline({ project: draft });
  assert.equal(piped.metadata?.publishAiEverythingComplete, true);
  assert.ok(piped.metadata?.changePlan);
});

test("publish HC sync stores project snapshot", () => {
  const hc = sampleHcProject();
  const project = createPublishAiEverythingProject({
    name: "Test",
    imageUrl: "https://cdn.example.com/a.jpg",
    message: "Hello",
  });
  const synced = syncPublishProjectToHc(hc, project);
  assert.equal(synced.servicePayload.publish?.publishIntent, project.publishIntent);
  assert.equal(synced.servicePayload.publish?.projectSnapshot?.id, project.id);
});

test("studio AI everything plan includes asset requirements", () => {
  const brief = buildProductionBrief({ idea: "Pixar-style HomeCheff Garden promo" });
  assert.ok(brief);
  const selections = { ...DEFAULT_BRIEF_V4_SELECTIONS, aiEverythingMode: true };
  const analysis = analyzeAiEverythingIdea(brief.idea, selections);
  assert.ok(analysis.storyType);
  const plan = buildAiEverythingPipelinePlan({ brief, selections });
  assert.ok(plan.storyPlan.scenes.length >= 1);
  assert.ok(plan.assetRequirements.length >= 1);
  assert.ok(plan.estimatedCredits >= 0);
});

test("studio AI everything credit gate blocks when insufficient", () => {
  const brief = buildProductionBrief({ idea: "Local designer campaign" });
  assert.ok(brief);
  const plan = buildAiEverythingPipelinePlan({
    brief,
    selections: { ...DEFAULT_BRIEF_V4_SELECTIONS, aiEverythingMode: true },
  });
  plan.assetRequirements.push({
    id: "req_extra",
    kind: "character",
    label: "Hero chef",
    sceneIds: ["scene_1"],
    status: "missing",
    estimatedCredits: 5,
  });
  plan.estimatedCredits += 5;
  const gate = checkAiEverythingCredits(plan, 1);
  assert.equal(gate.ok, false);
  assert.match(gate.message, /credits/i);
});

test("auto concept builder covers character requirement", () => {
  const concept = buildAutoConceptForRequirement(
    { id: "req_host", kind: "character", label: "Host", sceneIds: ["scene_1"], status: "missing", estimatedCredits: 2 },
    "Garden chef"
  );
  assert.ok("name" in concept);
});
