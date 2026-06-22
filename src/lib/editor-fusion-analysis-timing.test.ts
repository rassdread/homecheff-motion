import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import {
  logFusionUploadAnalysis,
  resetFusionAnalysisTimingLogsForTests,
  getLastFusionUploadAnalysisLogForTests,
} from "@/lib/editor-fusion-analysis-timing-log";
import {
  collectFusionReferenceInputsFromIntake,
  estimateFusionWizardPremiumCreditsRequired,
} from "@/lib/editor-fusion-wizard-premium";
import { runBasicFusionReferenceAnalysis } from "@/lib/editor-reference-role-analysis";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { createReferenceIntakeState } from "@/lib/editor-reference-role-intake";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";
import { buildFusionWizardCreditPreview } from "@/lib/editor-fusion-wizard-credits";

const __dirname = dirname(fileURLToPath(import.meta.url));
const referenceRoleFlowSrc = readFileSync(
  join(__dirname, "../components/editor/editor-reference-role-flow.tsx"),
  "utf8"
);
const referenceRoleAnalysisSrc = readFileSync(
  join(__dirname, "editor-reference-role-analysis.ts"),
  "utf8"
);
const wizardRenderSrc = readFileSync(
  join(__dirname, "editor-fusion-wizard-render.ts"),
  "utf8"
);
const wizardPremiumSrc = readFileSync(
  join(__dirname, "editor-fusion-wizard-premium.ts"),
  "utf8"
);

test("fusion wizard upload uses basic-only analysis, not premium intelligence", () => {
  assert.match(referenceRoleFlowSrc, /fusionWizardBasicOnly: wizardFirstMode/);
  assert.match(
    referenceRoleFlowSrc,
    /useFusionIntelligence: config\.workflow === "combine" && !wizardFirstMode/
  );
});

test("runBasicFusionReferenceAnalysis declares basic depth without premium providers", () => {
  const basicBlock =
    referenceRoleAnalysisSrc.match(
      /export async function runBasicFusionReferenceAnalysis[\s\S]*?(?=export async function runLiveReferenceRoleAnalysis)/
    )?.[0] ?? "";
  assert.ok(basicBlock.length > 0);
  assert.match(basicBlock, /analysisDepth: "basic"/);
  assert.match(basicBlock, /styleDnaCalled: false/);
  assert.match(basicBlock, /visionPartsCalled: false/);
  assert.match(basicBlock, /premiumCreditsCalled: false/);
  assert.doesNotMatch(basicBlock, /ensureFusionReferencePremiumAnalysis/);
  assert.doesNotMatch(basicBlock, /startEditorImageAnalysis/);
});

test("fusion wizard render pipeline runs premium analysis on Fusion maken", () => {
  assert.match(wizardRenderSrc, /ensureFusionWizardPremiumAnalyses/);
  assert.match(wizardPremiumSrc, /ensureFusionReferencePremiumAnalysis/);
  const intelligenceSrc = readFileSync(
    join(__dirname, "editor-fusion-intelligence.ts"),
    "utf8"
  );
  assert.match(intelligenceSrc, /startEditorImageAnalysis/);
});

test("upload analysis log records no premium providers", () => {
  resetFusionAnalysisTimingLogsForTests();
  logFusionUploadAnalysis({
    phase: "upload",
    analysisDepth: "basic",
    styleDnaCalled: false,
    visionPartsCalled: false,
    premiumCreditsCalled: false,
    providersUsed: ["rtdetr"],
  });
  const log = getLastFusionUploadAnalysisLogForTests();
  assert.ok(log);
  assert.equal(log!.styleDnaCalled, false);
  assert.equal(log!.visionPartsCalled, false);
  assert.equal(log!.premiumCreditsCalled, false);
});

test("credit preview does not call premium or charge credits", () => {
  assert.doesNotMatch(
    readFileSync(join(__dirname, "editor-fusion-wizard-credits.ts"), "utf8"),
    /authorizePremiumVisionCreditsClient|premium-credits|startEditorImageAnalysis/
  );
  const config = workflowReferenceConfigForIntent("character_fusion");
  const intake = createReferenceIntakeState({ config });
  const slot = intake.slots.find((s) => s.roleId === "character_a")!;
  slot.instances.push({
    instanceId: "inst_a",
    document: createEditorDocumentFromUpload({
      name: "a",
      backgroundUrl: "https://example.com/a.jpg",
    }),
    analysis: { status: "done" },
    metadata: {},
  });
  const preview = buildFusionWizardCreditPreview({ intake });
  assert.ok(preview);
  assert.ok(preview.totalCredits > 0);
});

test("estimateFusionWizardPremiumCreditsRequired counts only uncached refs", () => {
  const config = workflowReferenceConfigForIntent("character_fusion");
  const intake = createReferenceIntakeState({ config });
  const slotA = intake.slots.find((s) => s.roleId === "character_a")!;
  slotA.instances.push({
    instanceId: "inst_a",
    document: createEditorDocumentFromUpload({
      name: "a",
      backgroundUrl: "https://example.com/a.jpg",
    }),
    analysis: { status: "done" },
    metadata: {},
  });
  assert.equal(estimateFusionWizardPremiumCreditsRequired(intake), 5);
});

test("collectFusionReferenceInputsFromIntake deduplicates by session", () => {
  const config = workflowReferenceConfigForIntent("character_fusion");
  const intake = createReferenceIntakeState({ config });
  const doc = createEditorDocumentFromUpload({
    name: "shared",
    backgroundUrl: "https://example.com/shared.jpg",
  });
  for (const slot of intake.slots) {
    if (slot.roleId === "character_a" || slot.roleId === "character_b") {
      slot.instances.push({
        instanceId: `inst_${slot.roleId}`,
        document: doc,
        analysis: { status: "done" },
        metadata: {},
      });
    }
  }
  const refs = collectFusionReferenceInputsFromIntake(intake);
  assert.equal(refs.length, 1);
});

test("render does not start when premium analysis fails", () => {
  assert.match(wizardRenderSrc, /if \(!premiumResult\.ok\)/);
  assert.match(wizardRenderSrc, /if \(!fusionIntelligence\.ready/);
});

test("upload path does not reference style-dna or vision parts routes", () => {
  const basicBlock =
    referenceRoleAnalysisSrc.match(
      /export async function runBasicFusionReferenceAnalysis[\s\S]*?(?=export async function runLiveReferenceRoleAnalysis)/
    )?.[0] ?? "";
  assert.ok(basicBlock.length > 0);
  assert.doesNotMatch(basicBlock, /vision\/style-dna/);
  assert.doesNotMatch(basicBlock, /vision\/parts/);
  assert.doesNotMatch(basicBlock, /vision\/premium-credits/);
  assert.doesNotMatch(basicBlock, /startEditorImageAnalysis/);
});

test("runBasicFusionReferenceAnalysis logs upload phase before bootstrap", async () => {
  resetFusionAnalysisTimingLogsForTests();
  const doc = createEditorDocumentFromUpload({
    name: "test",
    backgroundUrl: "https://example.com/test.jpg",
  });
  await runBasicFusionReferenceAnalysis(doc, {
    id: "character_a",
    role: "character",
    labelKey: "test",
    required: true,
    maxInstances: 1,
  }).catch(() => undefined);

  const log = getLastFusionUploadAnalysisLogForTests();
  assert.ok(log);
  assert.equal(log!.phase, "upload");
  assert.equal(log!.analysisDepth, "basic");
  assert.equal(log!.premiumCreditsCalled, false);
});
