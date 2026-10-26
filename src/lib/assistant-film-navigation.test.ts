import assert from "node:assert/strict";
import test from "node:test";
import { getAssistantExecutionCreditEstimate, getAssistantExecutionMode } from "@/lib/assistant-tool-execution-mode";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";
import { executeAssistantPlanStep } from "@/server/assistant/assistant-tool-executor";
import type { AssistantExecutionPlan, AssistantExecutionStep } from "@/types/assistant-tool-execution";

function step(actionId: AssistantExecutionStep["actionId"], input: AssistantExecutionStep["input"]): AssistantExecutionStep {
  return {
    id: actionId,
    order: 1,
    actionId,
    labelKey: "assistant.execution.step.film",
    required: true,
    executionMode: getAssistantExecutionMode(actionId),
    estimatedCredits: getAssistantExecutionCreditEstimate(actionId),
    estimatedDurationSec: 0,
    input,
    status: "planned",
    createdAt: "2026-10-26T00:00:00.000Z",
  };
}

function filmPlan(action: AssistantExecutionStep): AssistantExecutionPlan {
  return {
    id: "plan-film",
    prefillId: "prefill-film",
    presetId: "goal_celebration",
    presetTitle: "Film",
    projectId: action.input.projectId,
    status: "planned",
    steps: [action],
    totalEstimatedCredits: 0,
    preparedByAssistant: true,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

test("confirmed director navigation stays inside the creative project", () => {
  const actions = [
    ["open_film_project", "overview"],
    ["open_storyboard", "scenes"],
    ["open_timeline", "timeline"],
    ["inspect_project_media", "media"],
    ["prepare_render", "export"],
  ] as const;
  for (const [actionId, section] of actions) {
    const action = step(actionId, { projectId: "film_1" });
    const waiting = executeAssistantPlanStep({ plan: filmPlan(action), stepId: action.id, confirmed: false });
    assert.equal(waiting.status, "waiting_for_confirmation");
    assert.equal(waiting.providerCalls, 0);
    const done = executeAssistantPlanStep({ plan: filmPlan(action), stepId: action.id, confirmed: true });
    assert.equal(done.status, "completed");
    assert.equal(done.providerCalls, 0);
    assert.equal(done.creditsConsumed, 0);
    assert.equal(done.handoffRoute, `/studio/projects/film_1?section=${section}`);
  }
});

test("confirmed scene and character selection keep their ids", () => {
  const scene = step("select_scene", { projectId: "film_1", sceneId: "scene_9" });
  const sceneResult = executeAssistantPlanStep({ plan: filmPlan(scene), stepId: scene.id, confirmed: true });
  assert.equal(sceneResult.handoffRoute, "/studio/projects/film_1?section=scenes&scene=scene_9");
  const character = step("select_project_character", { projectId: "film_1", characterId: "baker" });
  const characterResult = executeAssistantPlanStep({ plan: filmPlan(character), stepId: character.id, confirmed: true });
  assert.equal(characterResult.handoffRoute, "/studio/projects/film_1?section=characters&character=baker");
});

test("director prepares generation without calling a provider", () => {
  const expectations = [
    ["generate_scene_video", "motion_render", getActionCost("motion_render")?.defaultCreditCost ?? 0],
    ["generate_scene_voice", "voice_generation", getActionCost("voice_generation")?.defaultCreditCost ?? 0],
  ] as const;
  for (const [actionId, actionType, credits] of expectations) {
    const action = step(actionId, { projectId: "film_1", sceneId: "scene_9" });
    const waiting = executeAssistantPlanStep({ plan: filmPlan(action), stepId: action.id, confirmed: false });
    assert.equal(waiting.status, "waiting_for_confirmation");
    assert.equal(waiting.providerCalls, 0);
    const result = executeAssistantPlanStep({ plan: filmPlan(action), stepId: action.id, confirmed: true });
    assert.equal(result.status, "completed");
    assert.equal(result.providerCalls, 0);
    assert.equal(result.creditsConsumed, 0);
    assert.equal(result.step.output?.fusionBootstrap?.executesProvider, false);
    assert.equal(result.step.output?.fusionBootstrap?.actionType, actionType);
    assert.equal(result.step.output?.fusionBootstrap?.estimatedCredits, credits);
    assert.equal(result.handoffRoute, "/studio/projects/film_1?section=scenes&scene=scene_9");
  }
});

test("render preparation does not start a render", () => {
  const action = step("prepare_render", { projectId: "film_1" });
  const result = executeAssistantPlanStep({ plan: filmPlan(action), stepId: action.id, confirmed: true });
  assert.equal(result.step.output?.fusionBootstrap?.executesRender, false);
  assert.equal(result.step.output?.fusionBootstrap?.width, 720);
  assert.equal(result.step.output?.fusionBootstrap?.height, 1280);
  assert.equal(result.providerCalls, 0);
});
