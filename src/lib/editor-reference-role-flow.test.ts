import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  applyReferenceRoleIntake,
  createReferenceIntakeState,
  referenceIntakeCostOptions,
  referenceIntakeReady,
} from "@/lib/editor-reference-role-intake";
import { buildReferenceAnalysisSummary } from "@/lib/editor-reference-role-analysis";
import {
  resolveWorkflowReferenceConfig,
  workflowReferenceConfigForIntent,
} from "@/lib/editor-workflow-reference-config";
import { estimateEditorGenerationCost } from "@/lib/editor-generation-cost";

function mockDoc(name: string) {
  return createEditorDocumentFromUpload({
    name,
    backgroundUrl: `https://example.com/${name}.jpg`,
  });
}

test("workflowReferenceConfigForIntent maps outfit transfer roles", () => {
  const config = workflowReferenceConfigForIntent("outfit_from_reference");
  assert.equal(config.requiredRoles.join(","), "person,clothing_item");
  assert.equal(config.optionalRoles.length, 0);
  assert.equal(config.roles.length, 2);
  const clothing = config.roles.find((r) => r.id === "clothing_item");
  assert.ok(clothing);
  assert.equal(clothing?.maxInstances, 12);
  assert.equal(config.supportsSequences, true);
});

test("workflowReferenceConfigForIntent includes optional mascot style for human_into_mascot", () => {
  const config = workflowReferenceConfigForIntent("human_into_mascot");
  assert.deepEqual(config.requiredRoles, ["human"]);
  assert.deepEqual(config.optionalRoles, ["mascot_style"]);
});

test("workflowReferenceConfigForIntent future self optional parents", () => {
  const config = workflowReferenceConfigForIntent("how_will_i_look");
  assert.equal(config.requiredRoles[0], "current");
  assert.ok(config.optionalRoles.includes("father"));
  assert.ok(config.optionalRoles.includes("mother"));
  assert.ok(config.roles.some((r) => r.id === "family_extra"));
});

test("referenceIntakeReady requires all mandatory roles", () => {
  const config = workflowReferenceConfigForIntent("character_fusion");
  const state = createReferenceIntakeState({ config });
  assert.equal(referenceIntakeReady(state), false);

  const personSlot = state.slots.find((s) => s.roleId === "character_a")!;
  personSlot.instances.push({
    instanceId: "a",
    document: mockDoc("char-a"),
    analysis: { status: "idle" },
    metadata: { role: "character" },
  });
  assert.equal(referenceIntakeReady({ ...state, slots: [...state.slots] }), false);

  const bSlot = state.slots.find((s) => s.roleId === "character_b")!;
  bSlot.instances.push({
    instanceId: "b",
    document: mockDoc("char-b"),
    analysis: { status: "idle" },
    metadata: { role: "character" },
  });
  assert.equal(
    referenceIntakeReady({
      ...state,
      slots: state.slots.map((slot) =>
        slot.roleId === "character_a"
          ? personSlot
          : slot.roleId === "character_b"
            ? bSlot
            : slot
      ),
    }),
    true
  );
});

test("applyReferenceRoleIntake attaches fusion plan and sequence session", () => {
  const config = workflowReferenceConfigForIntent("human_into_mascot");
  const state = createReferenceIntakeState({ config });
  const humanSlot = state.slots.find((s) => s.roleId === "human")!;
  humanSlot.instances.push({
    instanceId: "h1",
    document: mockDoc("human"),
    analysis: { status: "done" },
    metadata: { role: "person" },
  });
  state.output.outputMode = "sequence";
  state.output.stepCount = 4;
  state.motion.enabled = true;
  state.motion.durationSec = 5;

  const doc = applyReferenceRoleIntake({
    ...state,
    slots: state.slots.map((slot) => (slot.roleId === "human" ? humanSlot : slot)),
  });

  assert.equal(doc.instructionStudioState?.fusionPlan?.intent, "human_into_mascot");
  assert.equal(doc.instructionStudioState?.fusionPlan?.generationSettings.outputMode, "sequence");
  assert.equal(doc.instructionStudioState?.transformationSession?.stepCount, 4);
  assert.equal(doc.instructionStudioState?.transformationSession?.motionReady, true);
  assert.equal(doc.instructionStudioState?.referenceIntake?.motionDurationSec, 5);
});

test("referenceIntakeCostOptions counts variations and motion", () => {
  const config = workflowReferenceConfigForIntent("product_family");
  const state = createReferenceIntakeState({ config });
  state.output.outputMode = "variations";
  state.output.variationCount = 6;
  state.motion.enabled = true;
  state.motion.durationSec = 8;

  const options = referenceIntakeCostOptions(state);
  assert.equal(options.outputMode, "variations");
  assert.equal(options.variationCount, 6);
  assert.equal(options.motionDurationSec, 8);

  const cost = estimateEditorGenerationCost("product_family", options);
  assert.equal(cost.generationCount, 6);
  assert.ok(cost.creditCost >= 7);
});

test("resolveWorkflowReferenceConfig for edit mode uses single source role", () => {
  const config = resolveWorkflowReferenceConfig({ workflow: "edit" });
  assert.equal(config.roles.length, 1);
  assert.equal(config.roles[0]?.id, "source");
  assert.equal(config.supportsVariations, false);
});

test("buildReferenceAnalysisSummary detects face and clothing labels", () => {
  const doc = mockDoc("portrait");
  const summary = buildReferenceAnalysisSummary(doc, {
    id: "person",
    role: "person",
    labelKey: "editor.fusion.upload.person",
    required: true,
    maxInstances: 1,
  });
  assert.equal(summary.status, "done");
});
