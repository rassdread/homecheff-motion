import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { approveInstructionVariant } from "@/lib/editor-instruction-approval";
import {
  addCompositionReference,
  analyzeCompositionReference,
  appendCompositionPlanItem,
  buildCompositionPlanItem,
  ensureCompositionPlan,
  getCompositionPlan,
} from "@/lib/editor-composition-plan";
import { buildEditorCompositionPrompt } from "@/lib/editor-composition-prompt-builder";
import { evaluateExportReadiness, resolveExportSourceUrl } from "@/lib/editor-export-workflow";
import { buildEditorHandoffQuery, resolveEditorInstructionHandoff } from "@/lib/editor-instruction-handoff";
import { appendChangePlanItem, buildChangePlanItemFromSelection, listChangePlan } from "@/lib/editor-instruction-change-plan";
import { evaluateMotionReadiness } from "@/lib/editor-motion-workflow";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  originalImageUrlUnchanged,
} from "@/lib/editor-instruction-version";
import {
  detectEditorWorkflowIntent,
  inferIntentFromDirectorPrompt,
  resolveWorkflowStages,
  suggestSmartNextSteps,
} from "@/lib/editor-workflow-orchestration";
import {
  editorProjectHasUnsavedVisualChanges,
  resolveEditorProjectCloseChoice,
} from "@/lib/editor-project-model";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

const WORKFLOW_I18N_KEYS = [
  "editor.workflow.tab.combine",
  "editor.workflow.stage.analyze",
  "editor.combine.generate",
  "editor.project.topBar.save",
  "editor.project.close.saveDraft",
  "editor.workflow.motion.handoff",
  "editor.workflow.export.prepare",
] as const;

describe("editor v2 combine and workflow", () => {
  it("adds and analyzes composition reference", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const ref = analyzeCompositionReference({
      name: "logo.png",
      url: "https://example.com/logo.png",
      type: "logo",
    });
    const next = addCompositionReference(doc, ref);
    const plan = getCompositionPlan(next);
    assert.equal(plan?.references.length, 1);
    assert.equal(plan?.references[0]?.type, "logo");
  });

  it("creates composition plan and combined prompt", () => {
    let doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe.png",
    });
    doc = ensureCompositionPlan(doc);
    const ref = analyzeCompositionReference({
      name: "kitchen.png",
      url: "https://example.com/kitchen.png",
      type: "background",
    });
    doc = addCompositionReference(doc, ref);
    doc = appendCompositionPlanItem(
      doc,
      buildCompositionPlanItem({
        targetRole: "background",
        reference: ref,
        sourceObjectLabel: "Background",
        order: 0,
      })
    );
    const prompt = buildEditorCompositionPrompt({ plan: getCompositionPlan(doc)! });
    assert.match(prompt, /kitchen/i);
    assert.match(prompt, /background/i);
  });

  it("stores combined variant without mutating original", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "combine",
        objectLabel: "Combined",
        category: "other",
        action: "replace",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "combine refs",
      variantType: "combined",
      compositionPlanId: "comp_test",
      referenceIds: ["ref_1"],
    });
    const next = appendInstructionVariant(doc, {
      ...variant,
      status: "completed",
      resultUrl: "https://example.com/combined.png",
    });
    assert.equal(originalImageUrlUnchanged(doc, next), true);
    assert.equal(next.instructionVariants?.[0]?.variantType, "combined");
    assert.deepEqual(next.instructionVariants?.[0]?.referenceIds, ["ref_1"]);
  });

  it("detects workflow intent edit/combine/motion/export", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    assert.equal(inferIntentFromDirectorPrompt("Add logo to apron"), "edit");
    assert.equal(
      inferIntentFromDirectorPrompt("Use the background from image 2 and mascot from image 1"),
      "combine"
    );
    assert.equal(inferIntentFromDirectorPrompt("Prepare Globe Man for animation"), "motion");
    assert.equal(inferIntentFromDirectorPrompt("Create an A3 poster"), "export");
    assert.equal(detectEditorWorkflowIntent(doc, "make this print ready"), "export");
  });

  it("resolves workflow status bar stages", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const stages = resolveWorkflowStages(doc);
    assert.equal(stages.length, 5);
    assert.equal(stages[0]?.stage, "analyze");
    assert.ok(stages.some((s) => s.status === "current"));
  });

  it("suggests smart next steps after variant generation", () => {
    let doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    doc = appendChangePlanItem(
      doc,
      buildChangePlanItemFromSelection(
        {
          objectKey: "obj_apron",
          objectLabel: "Apron",
          category: "clothing",
          action: "change_color",
          color: "red",
          sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
        },
        0
      )
    );
    const steps = suggestSmartNextSteps(doc);
    assert.ok(steps.some((s) => s.id === "generate"));
  });

  it("close flow respects unsaved changes choice", () => {
    assert.equal(resolveEditorProjectCloseChoice(false, "cancel"), "proceed");
    assert.equal(resolveEditorProjectCloseChoice(true, "cancel"), "cancel");
    assert.equal(resolveEditorProjectCloseChoice(true, "discard"), "proceed");
  });

  it("reopen project restores change plan and references", () => {
    let doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const ref = analyzeCompositionReference({
      name: "logo.png",
      url: "https://example.com/logo.png",
      type: "logo",
    });
    doc = addCompositionReference(doc, ref);
    doc = appendChangePlanItem(
      doc,
      buildChangePlanItemFromSelection(
        {
          objectKey: "obj_logo",
          objectLabel: "Logo",
          category: "logo",
          action: "add_logo",
          sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
        },
        0
      )
    );
    const serialized = JSON.parse(JSON.stringify(doc)) as typeof doc;
    assert.equal(listChangePlan(serialized).length, 1);
    assert.equal(getCompositionPlan(serialized)?.references.length, 1);
  });

  it("handoff uses approved active variant for Studio/Motion/Export", () => {
    let doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_a",
        objectLabel: "A",
        category: "other",
        action: "replace",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "test",
    });
    doc = approveInstructionVariant(
      appendInstructionVariant(doc, {
        ...variant,
        status: "completed",
        resultUrl: "https://example.com/v.png",
      }),
      variant.id
    );
    const handoff = resolveEditorInstructionHandoff(doc);
    assert.equal(handoff.usesOriginal, false);
    assert.equal(handoff.activeVariantUrl, "https://example.com/v.png");
    assert.match(buildEditorHandoffQuery(doc), /editorActiveVariant=1/);
    assert.equal(resolveExportSourceUrl(doc), "https://example.com/v.png");
    assert.equal(evaluateMotionReadiness(doc).usesApprovedVariant, true);
  });

  it("export quality check does not mutate variant source", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const before = doc.backgroundUrl;
    const report = evaluateExportReadiness(
      doc,
      { id: "poster", category: "print", labelKey: "editor.workflow.export.target.poster", printPreset: "poster" },
      800,
      600
    );
    assert.ok(report.qualityScore >= 0);
    assert.equal(doc.backgroundUrl, before);
  });

  it("flags unsaved when change plan or composition plan pending", () => {
    let doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    doc.status = "draft_saved";
    assert.equal(editorProjectHasUnsavedVisualChanges(doc), false);
    doc = appendChangePlanItem(
      doc,
      buildChangePlanItemFromSelection(
        {
          objectKey: "obj_a",
          objectLabel: "A",
          category: "other",
          action: "replace",
          sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
        },
        0
      )
    );
    assert.equal(editorProjectHasUnsavedVisualChanges(doc), true);
  });

  it("has NL/EN i18n parity for combine/workflow keys", () => {
    for (const key of WORKFLOW_I18N_KEYS) {
      assert.ok(en[key], `missing en: ${key}`);
      assert.ok(nl[key], `missing nl: ${key}`);
    }
  });
});
