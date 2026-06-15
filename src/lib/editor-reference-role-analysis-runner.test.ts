import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  collectQueuedReferenceAnalysisJobs,
  referenceAnalysisProgress,
} from "@/lib/editor-reference-role-analysis-runner";
import { createQueuedReferenceAnalysis } from "@/lib/editor-reference-role-analysis";
import {
  createReferenceIntakeState,
  referenceIntakeReady,
} from "@/lib/editor-reference-role-intake";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";

function mockDoc(name: string) {
  return createEditorDocumentFromUpload({
    name,
    backgroundUrl: `https://example.com/${name}.jpg`,
  });
}

test("referenceIntakeReady does not require analysis completion", () => {
  const config = workflowReferenceConfigForIntent("human_into_mascot");
  const state = createReferenceIntakeState({ config });
  const humanSlot = state.slots.find((s) => s.roleId === "human")!;
  humanSlot.instances.push({
    instanceId: "h1",
    document: mockDoc("human"),
    analysis: createQueuedReferenceAnalysis(),
    metadata: { role: "person" },
  });
  assert.equal(referenceIntakeReady({ ...state, slots: [...state.slots] }), true);
});

test("collectQueuedReferenceAnalysisJobs skips already started instances", () => {
  const config = workflowReferenceConfigForIntent("human_into_mascot");
  const state = createReferenceIntakeState({ config });
  const humanSlot = state.slots.find((s) => s.roleId === "human")!;
  humanSlot.instances.push({
    instanceId: "h1",
    document: mockDoc("human"),
    analysis: createQueuedReferenceAnalysis(),
    metadata: { role: "person" },
  });
  const started = new Set(["h1"]);
  assert.equal(collectQueuedReferenceAnalysisJobs({ ...state, slots: [...state.slots] }, started).length, 0);
  assert.equal(collectQueuedReferenceAnalysisJobs({ ...state, slots: [...state.slots] }, new Set()).length, 1);
});

test("referenceAnalysisProgress counts pending and finished references", () => {
  const config = workflowReferenceConfigForIntent("human_into_mascot");
  const state = createReferenceIntakeState({ config });
  const humanSlot = state.slots.find((s) => s.roleId === "human")!;
  humanSlot.instances.push(
    {
      instanceId: "h1",
      document: mockDoc("human"),
      analysis: { status: "done" },
      metadata: { role: "person" },
    },
    {
      instanceId: "h2",
      document: mockDoc("human-2"),
      analysis: { status: "running" },
      metadata: { role: "person" },
    }
  );
  const progress = referenceAnalysisProgress({ ...state, slots: [...state.slots] });
  assert.equal(progress.total, 2);
  assert.equal(progress.finished, 1);
  assert.equal(progress.pending, 1);
});
