import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { hasValidPremiumAnalysis, writeCachedFusionAnalysisProfile } from "@/lib/editor-fusion-analysis-cache";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import {
  fusionWizardRenderActionKey,
  fusionWorkflowUsesWizardFirst,
  FUSION_WIZARD_PROGRESS_STEP_KEYS,
} from "@/lib/editor-fusion-wizard-flow";
import { buildFusionWizardCreditPreview } from "@/lib/editor-fusion-wizard-credits";
import {
  createReferenceIntakeState,
  referenceIntakeReady,
} from "@/lib/editor-reference-role-intake";
import { FUSION_INTELLIGENCE_WORKFLOWS } from "@/lib/editor-fusion-workflow-credits";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";
import { resolveFusionWizardRenderCredits } from "@/server/editor/editor-fusion-render-service";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";

const __dirname = dirname(fileURLToPath(import.meta.url));
const referenceRoleFlowSrc = readFileSync(
  join(__dirname, "../components/editor/editor-reference-role-flow.tsx"),
  "utf8"
);
const advancedSettingsSrc = readFileSync(
  join(__dirname, "../components/editor/editor-fusion-wizard-advanced-settings.tsx"),
  "utf8"
);
const summaryPanelSrc = readFileSync(
  join(__dirname, "../components/editor/editor-fusion-wizard-summary-panel.tsx"),
  "utf8"
);
const resultPanelSrc = readFileSync(
  join(__dirname, "../components/editor/editor-fusion-wizard-result-panel.tsx"),
  "utf8"
);

function mockCachedPremiumDoc(name: string) {
  const base = createEditorDocumentFromUpload({
    name,
    backgroundUrl: `https://example.com/${name}.jpg`,
  });
  const profile = buildReferenceAnalysisProfile({
    document: base,
    referenceId: `ref_${name}`,
    role: "character",
    roleId: "character_a",
    name,
    premiumCached: true,
  });
  return writeCachedFusionAnalysisProfile(
    {
      ...base,
      visionV6Meta: {
        ...base.visionV6Meta,
        illustrationAnalysis: true,
        rtdetrCount: 1,
        visionPartCount: 1,
        mergedLayerCount: 1,
        openAiPartsUsed: true,
        layerSources: [],
        analysisTier: "premium",
        premiumAnalysisCompletedAt: new Date().toISOString(),
      },
    },
    profile
  );
}

test("all fusion intelligence workflows use wizard-first flow", () => {
  for (const intent of FUSION_INTELLIGENCE_WORKFLOWS) {
    assert.equal(fusionWorkflowUsesWizardFirst(intent), true, intent);
  }
});

test("fusion wizard render action keys exist for scoped workflows", () => {
  assert.match(fusionWizardRenderActionKey("character_fusion"), /renderAction/);
  assert.match(fusionWizardRenderActionKey("future_child"), /futureChild/);
  assert.match(fusionWizardRenderActionKey("product_branding"), /productBranding/);
});

test("fusion wizard defines five progress steps", () => {
  assert.equal(FUSION_WIZARD_PROGRESS_STEP_KEYS.length, 5);
});

test("EditorReferenceRoleFlow does not open editor on fusion summary", () => {
  assert.match(referenceRoleFlowSrc, /wizardFirstMode/);
  assert.match(referenceRoleFlowSrc, /fusionWizardBasicOnly: wizardFirstMode/);
  assert.match(referenceRoleFlowSrc, /fusion_summary/);
  assert.match(referenceRoleFlowSrc, /runFusionWizardRenderPipeline/);
  assert.match(referenceRoleFlowSrc, /if \(step === "fusion_summary"\)/);
  assert.match(referenceRoleFlowSrc, /void runFusionWizardRender\(\)/);
});

test("fusion summary continue triggers render, not editor open", () => {
  const goNextBlock =
    referenceRoleFlowSrc.match(
      /if \(step === "fusion_summary"\) \{[\s\S]*?return;\s*\}/
    )?.[0] ?? "";
  assert.match(goNextBlock, /runFusionWizardRender/);
  assert.doesNotMatch(goNextBlock, /onComplete/);
});

test("fusion wizard upload does not trigger premium intelligence during upload", () => {
  assert.match(
    referenceRoleFlowSrc,
    /useFusionIntelligence: config\.workflow === "combine" && !wizardFirstMode/
  );
  assert.doesNotMatch(
    referenceRoleFlowSrc,
    /useFusionIntelligence: config\.workflow === "combine",\s*$/
  );
});

test("EditorReferenceRoleFlow keeps upload in wizard until optional editor open", () => {
  assert.match(referenceRoleFlowSrc, /EditorFusionWizardSummaryPanel/);
  assert.match(summaryPanelSrc, /data-testid="fusion-wizard-summary"/);
  assert.match(referenceRoleFlowSrc, /EditorFusionWizardResultPanel/);
  assert.match(resultPanelSrc, /data-testid="fusion-wizard-result"/);
  assert.match(referenceRoleFlowSrc, /onOpenEditor=\{\(\) => \{/);
});

test("Fusion maken starts render pipeline from summary step", () => {
  assert.match(referenceRoleFlowSrc, /if \(step === "fusion_summary"\)/);
  assert.match(referenceRoleFlowSrc, /void runFusionWizardRender\(\)/);
  assert.match(referenceRoleFlowSrc, /runFusionWizardRenderPipeline/);
});

test("advanced settings panel is collapsed by default", () => {
  assert.match(advancedSettingsSrc, /useState\(false\)/);
  assert.match(advancedSettingsSrc, /data-collapsed=\{open \? "false" : "true"\}/);
});

test("open in editor appears only on result panel", () => {
  assert.match(resultPanelSrc, /data-testid="fusion-wizard-open-editor"/);
  const summaryBlock =
    referenceRoleFlowSrc.match(
      /step === "fusion_summary"[\s\S]*?step === "fusion_rendering"/
    )?.[0] ?? "";
  assert.doesNotMatch(summaryBlock, /openEditor|onComplete/);
});

test("buildFusionWizardCreditPreview reuses cached premium analysis", () => {
  const config = workflowReferenceConfigForIntent("character_fusion");
  const state = createReferenceIntakeState({ config });
  const slot = state.slots.find((s) => s.roleId === "character_a")!;
  const cachedDoc = mockCachedPremiumDoc("a");
  slot.instances.push({
    instanceId: "inst_a",
    document: cachedDoc,
    analysis: { status: "done", premiumAnalysisCached: true },
    metadata: {},
  });
  const slotB = state.slots.find((s) => s.roleId === "character_b")!;
  slotB.instances.push({
    instanceId: "inst_b",
    document: createEditorDocumentFromUpload({
      name: "b",
      backgroundUrl: "https://example.com/b.jpg",
    }),
    analysis: { status: "done" },
    metadata: {},
  });

  assert.equal(referenceIntakeReady(state), true);
  const preview = buildFusionWizardCreditPreview({ intake: state });
  assert.ok(preview);
  assert.ok(preview.photos.some((line) => line.cached && line.credits === 0));
  assert.ok(preview.photos.some((line) => !line.cached && line.credits === 5));
  assert.equal(preview.renderCredits, 25);
  assert.equal(preview.totalCredits, preview.analysisCredits + preview.renderCredits);
});

test("resolveFusionWizardRenderCredits totals analysis and render", () => {
  const payload = {
    blueprint: {
      id: "bp_1",
      workflowType: "character_fusion" as const,
      createdAt: new Date().toISOString(),
      references: [],
      traitAssignments: {},
      renderInstructions: [],
      preservationRules: [],
      styleNotes: [],
    },
    styleDNA: [],
    referenceAnalysis: [
      {
        referenceId: "a",
        assetId: "asset_a",
        imageUrl: "https://example.com/a.jpg",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [],
        clothing: [],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 1,
        premiumCached: true,
      },
      {
        referenceId: "b",
        assetId: "asset_b",
        imageUrl: "https://example.com/b.jpg",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [{ id: "p1", label: "face", category: "face" }],
        clothing: [],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 1,
        premiumCached: false,
      },
    ],
    renderInstructions: [],
    references: [],
    logoAssets: [],
    primaryImageUrl: "https://example.com/base.jpg",
  } satisfies FusionRenderPayload;

  const credits = resolveFusionWizardRenderCredits({
    workflowType: "character_fusion",
    sessionId: "sess_1",
    imageUrl: "https://example.com/base.jpg",
    prompt: "test",
    fusionRenderPayload: payload,
  });

  assert.equal(credits.renderCredits, 25);
  assert.equal(credits.analysisCredits, 5);
  assert.equal(credits.totalCredits, 30);
});

test("fusion render API route uses credit gate before provider execute", () => {
  const routeSrc = readFileSync(
    join(__dirname, "../app/api/editor/fusion/render/route.ts"),
    "utf8"
  );
  assert.match(routeSrc, /withStudioCreditGate/);
  assert.match(routeSrc, /executeFusionWizardRender/);
  assert.match(routeSrc, /POST/);
});

test("hasValidPremiumAnalysis detects cached documents in credit preview", () => {
  const doc = mockCachedPremiumDoc("cached");
  assert.equal(hasValidPremiumAnalysis(doc), true);
});
