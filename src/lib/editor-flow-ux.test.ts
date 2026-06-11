import assert from "node:assert/strict";
import test from "node:test";
import { startScreenPhaseToFlowStep, resolveEditorFlowStepStates } from "@/lib/editor-flow-steps";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import { buildReferenceMetadataPromptLines } from "@/lib/editor-reference-metadata-prompt";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";

test("startScreenPhaseToFlowStep maps reference flow steps", () => {
  assert.equal(startScreenPhaseToFlowStep({ kind: "workflow" }), "workflow");
  assert.equal(
    startScreenPhaseToFlowStep({ kind: "reference_flow", referenceStep: "reference_roles" }),
    "references"
  );
  assert.equal(
    startScreenPhaseToFlowStep({ kind: "reference_flow", referenceStep: "plan_review" }),
    "plan"
  );
});

test("resolveEditorFlowStepStates blocks results without variants", () => {
  const states = resolveEditorFlowStepStates({
    activeStep: "plan",
    hasReferences: true,
    hasResults: false,
  });
  assert.equal(states.results, "blocked");
  assert.equal(states.plan, "active");
});

test("buildFriendlyFileDisplay improves hash filenames", () => {
  const display = buildFriendlyFileDisplay({
    name: "653c16bbb619abc.jpg",
    role: "person",
  });
  assert.match(display.title, /person|Uploaded/i);
  assert.match(display.subtitle, /653c16/);
});

test("buildReferenceMetadataPromptLines includes view and family hints", () => {
  const lines = buildReferenceMetadataPromptLines([
    {
      roleId: "person",
      role: "person",
      instanceId: "a",
      url: "https://example.com/p.jpg",
      name: "person",
      metadata: { role: "person", view: "front" },
    },
    {
      roleId: "mother",
      role: "family",
      instanceId: "b",
      url: "https://example.com/m.jpg",
      name: "mother",
      metadata: { familyType: "mother" },
    },
    {
      roleId: "father",
      role: "family",
      instanceId: "c",
      url: "https://example.com/f.jpg",
      name: "father",
      metadata: { familyType: "father" },
    },
  ]);
  assert.ok(lines.some((line) => /front view/i.test(line)));
  assert.ok(lines.some((line) => /family references/i.test(line)));
});

test("buildEditorFusionPrompt appends reference metadata section", () => {
  const doc = createEditorDocumentFromUpload({
    name: "base",
    backgroundUrl: "https://example.com/base.jpg",
  });
  const plan = createInitialFusionPlan(doc, "how_will_i_look");
  const prompt = buildEditorFusionPrompt({
    plan,
    referenceAssignments: [
      {
        roleId: "person",
        role: "person",
        instanceId: "p1",
        url: "https://example.com/p.jpg",
        name: "person",
        metadata: { view: "front", role: "person" },
      },
    ],
  });
  assert.match(prompt, /REFERENCE METADATA/);
  assert.match(prompt, /front view/i);
});
