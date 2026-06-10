import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorCommandPlan, planSummaryObjectTypes } from "@/lib/editor-v7-action-plan";
import {
  attachActivePlan,
  canRedoCommandHistory,
  canUndoCommandHistory,
  defaultAssistantState,
  recordAppliedCommand,
  rerunHistoryPrompt,
  undoCommandHistory,
} from "@/lib/editor-v7-command-history";
import { detectEditorCommandIntents } from "@/lib/editor-v7-intent";
import {
  inferObjectRefFromPrompt,
  resolveLayerByObjectRef,
} from "@/lib/editor-v7-object-references";
import { matchEditorSkill, EDITOR_V7_SKILL_DEFINITIONS } from "@/lib/editor-v7-skills";
import { resolveContextualCommandSuggestions } from "@/lib/editor-v7-suggestions";
import { resolveStudioBridgeAction } from "@/lib/editor-v7-studio-bridge";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Globe",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
    layerType: "semantic",
    category: "globe",
    semanticType: "globe",
    ...overrides,
  };
}

function mockDocument(objects: EditorCanvasLayer[]): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_v7",
    name: "V7",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects,
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("Editor Vision V7", () => {
  it("intent detection maps replace globe with football", () => {
    const intents = detectEditorCommandIntents("Replace the globe with a football");
    assert.ok(intents.some((i) => i.actionType === "magic_replace"));
    const replace = intents.find((i) => i.actionType === "magic_replace");
    assert.equal(replace?.params?.target, "globe");
    assert.equal(replace?.params?.replacement, "football");
  });

  it("intent detection maps background remove and motion ready", () => {
    const bg = detectEditorCommandIntents("Remove background");
    assert.ok(bg.some((i) => i.actionType === "background_remove"));
    const motion = detectEditorCommandIntents("Make this motion-ready");
    assert.ok(motion.some((i) => i.actionType === "motion_ready"));
  });

  it("intent detection maps poster and social commands", () => {
    const poster = detectEditorCommandIntents("Turn this into a restaurant poster");
    assert.ok(poster.some((i) => i.actionType === "poster_template"));
    const social = detectEditorCommandIntents("Make this suitable for Instagram");
    assert.ok(social.some((i) => i.actionType === "social_preset"));
  });

  it("action plan creation with object detection steps", () => {
    const bg = mockLayer({
      id: "bg",
      label: "Background",
      layerType: "background",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    });
    const globe = mockLayer();
    const logo = mockLayer({
      id: "logo",
      label: "Logo",
      category: "logo",
      semanticType: "logo",
    });
    const doc = mockDocument([bg, globe, logo]);
    const plan = buildEditorCommandPlan(doc, "Replace the globe with a football");
    assert.ok(plan.steps.some((s) => s.actionType === "magic_replace"));
    assert.ok(plan.steps.some((s) => s.actionType === "detect_object"));
    assert.ok(plan.steps.some((s) => s.actionType === "preserve_object"));
  });

  it("multi-step restaurant poster skill workflow", () => {
    const doc = mockDocument([
      mockLayer({ id: "bg", layerType: "background", label: "Background", bounds: { x: 0, y: 0, width: 1, height: 1 } }),
      mockLayer({ id: "chef", label: "Chef", category: "character", semanticType: "character" }),
    ]);
    const skill = matchEditorSkill("Create a restaurant poster using HomeCheff branding");
    assert.equal(skill?.id, "restaurant_poster");
    const plan = buildEditorCommandPlan(doc, "Create a restaurant poster using HomeCheff branding");
    assert.equal(plan.skillId, "restaurant_poster");
    assert.ok(plan.steps.length >= 4);
    assert.ok(plan.steps.some((s) => s.actionType === "brand_kit"));
    assert.ok(plan.steps.some((s) => s.actionType === "print_export"));
  });

  it("command history undo redo and rerun", () => {
    const doc = mockDocument([mockLayer()]);
    const plan = buildEditorCommandPlan(doc, "Remove background");
    let next = attachActivePlan(doc, plan, true);
    assert.equal(next.assistantState?.activePlan?.prompt, "Remove background");
    next = recordAppliedCommand(next, plan);
    assert.equal(next.assistantState?.history.length, 1);
    assert.ok(canUndoCommandHistory(next));
    const undone = undoCommandHistory(next);
    assert.equal(undone.assistantState?.history[0]?.status, "undone");
    assert.equal(rerunHistoryPrompt(next, next.assistantState!.history[0]!.id), "Remove background");
    assert.equal(canRedoCommandHistory(undone), true);
  });

  it("skill definitions cover all editor skills", () => {
    assert.equal(EDITOR_V7_SKILL_DEFINITIONS.length, 8);
    assert.ok(EDITOR_V7_SKILL_DEFINITIONS.every((s) => s.intents.length > 0));
  });

  it("smart object references resolve globe and jacket", () => {
    const bg = mockLayer({ id: "bg", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 } });
    const globe = mockLayer();
    const chef = mockLayer({
      id: "chef",
      label: "Garden Chef",
      category: "character",
      semanticType: "character",
    });
    const doc = mockDocument([bg, globe, chef]);
    assert.equal(inferObjectRefFromPrompt("Rotate the globe"), "globe");
    assert.equal(resolveLayerByObjectRef(doc, "globe")?.id, "layer_1");
    assert.equal(inferObjectRefFromPrompt("Make the jacket blue"), "jacket");
    assert.equal(resolveLayerByObjectRef(doc, "jacket")?.id, "chef");
  });

  it("contextual suggestions after upload", () => {
    const doc = mockDocument([
      mockLayer({ id: "bg", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 } }),
      mockLayer(),
    ]);
    const suggestions = resolveContextualCommandSuggestions(doc);
    assert.ok(suggestions.length >= 3);
    assert.ok(suggestions.some((s) => s.id === "poster"));
    assert.ok(suggestions.some((s) => s.id === "gif"));
  });

  it("studio bridge maps motion and story commands", () => {
    const motion = resolveStudioBridgeAction("Make this motion-ready");
    assert.equal(motion?.actionType, "motion_ready");
    assert.equal(motion?.workspaceMode, "export");
    const story = resolveStudioBridgeAction("Create a 5-scene story");
    assert.equal(story?.actionType, "studio_story");
    assert.ok(story?.studioPath?.includes("storyboards"));
  });

  it("combined jacket and motion-ready prompt builds multi-step plan", () => {
    const doc = mockDocument([
      mockLayer({ id: "bg", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 } }),
      mockLayer({
        id: "chef",
        label: "Chef",
        category: "character",
        semanticType: "character",
      }),
    ]);
    const plan = buildEditorCommandPlan(
      doc,
      "Give him a modern black chef jacket and make this motion-ready"
    );
    assert.ok(plan.steps.some((s) => s.actionType === "magic_replace"));
    assert.ok(plan.steps.some((s) => s.actionType === "motion_ready"));
  });

  it("assistant state defaults", () => {
    const state = defaultAssistantState();
    assert.deepEqual(state.history, []);
    assert.equal(state.historyCursor, -1);
    assert.equal(planSummaryObjectTypes(mockDocument([mockLayer()])).includes("globe"), true);
  });
});
