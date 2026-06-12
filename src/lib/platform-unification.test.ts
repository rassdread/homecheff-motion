import assert from "node:assert/strict";
import test from "node:test";
import {
  nextPublishWizardStep,
  prevPublishWizardStep,
  publishWizardStepComplete,
  PUBLISH_WIZARD_STEPS,
} from "@/lib/publish-wizard-flow";
import { resolveMotionNextBestActions, resolveMotionToPublishHandoffUrl } from "@/lib/motion-next-best-actions";
import { WORKSPACE_SERVICE_LABEL_KEYS } from "@/lib/homecheff-workspace-tokens";

test("publish wizard steps are ordered AI-first", () => {
  assert.equal(PUBLISH_WIZARD_STEPS[0], "upload");
  assert.equal(PUBLISH_WIZARD_STEPS.at(-1), "export");
  assert.equal(nextPublishWizardStep("upload"), "intent");
  assert.equal(prevPublishWizardStep("intent"), "upload");
});

test("publish wizard step completion tracks upload and intent", () => {
  assert.equal(publishWizardStepComplete({ step: "intent", intent: "social_post" }, "intent"), true);
  assert.equal(publishWizardStepComplete({ step: "intent" }, "intent"), false);
  assert.equal(publishWizardStepComplete({ step: "upload", uploadReady: true }, "upload"), true);
});

test("motion post-gen actions prefer HC publish handoff", () => {
  const url = resolveMotionToPublishHandoffUrl({
    projectId: "motion_1",
    videoUrl: "https://cdn.example.com/v.mp4",
    hcProjectId: "hcproj_1",
  });
  assert.match(url, /hcProject=hcproj_1/);
});

test("motion next best actions include publish and studio", () => {
  const actions = resolveMotionNextBestActions({
    projectId: "motion_1",
    videoUrl: "https://cdn.example.com/v.mp4",
    hcProjectId: "hcproj_1",
  });
  assert.ok(actions.find((a) => a.id === "open_publish")?.href?.includes("hcProject"));
  assert.ok(actions.find((a) => a.id === "send_studio_scene"));
});

test("workspace service labels cover all products", () => {
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.editor);
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.motion);
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.publish);
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.studio);
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.library);
  assert.ok(WORKSPACE_SERVICE_LABEL_KEYS.projects);
});
