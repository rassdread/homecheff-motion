"use client";

import { useMemo } from "react";
import { EditorBrandProtectionBanner } from "@/components/editor/editor-brand-protection-banner";
import { EditorFusionWizardAdvancedSettings } from "@/components/editor/editor-fusion-wizard-advanced-settings";
import { FusionIntelligenceAuditPanel } from "@/components/editor/fusion-intelligence-audit-panel";
import { CharacterConsistencyAuditPanel } from "@/components/editor/character-consistency-audit-panel";
import { EditorWizardWorkflowPricingPanel } from "@/components/editor/editor-wizard-workflow-pricing-panel";
import { EditorPlanSummaryPanel } from "@/components/editor/editor-plan-summary-panel";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { getFusionPlan } from "@/lib/editor-fusion-plan";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";

type Props = {
  document: EditorCanvasDocument;
  intake: EditorReferenceIntakeState;
  combineIntent: EditorFusionIntent;
  isAdmin?: boolean;
  customPrompt: string;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onCustomPromptChange: (value: string) => void;
  onEditReferences: () => void;
};

export function EditorFusionWizardSummaryPanel({
  document,
  intake,
  combineIntent,
  isAdmin,
  customPrompt,
  onDocumentChange,
  onCustomPromptChange,
  onEditReferences,
}: Props) {
  const plan = getFusionPlan(document);
  const brandProtection = useMemo(() => {
    if (!plan) {
      return null;
    }
    const logoAssets = plan.references
      .filter((ref) => ref.type === "logo")
      .map((ref) => ({ referenceId: ref.id, url: ref.url, name: ref.name }));
    return buildBrandAssetProtectionLayer({
      workflowType: combineIntent,
      logoAssets,
      generationSettings: plan.generationSettings,
      userPreserveLogoExact: plan.generationSettings.preserveLogoExact !== false,
    });
  }, [document, combineIntent, plan]);

  return (
    <div className="mt-6 space-y-4" data-testid="fusion-wizard-summary">
      <EditorPlanSummaryPanel document={document} onEditReferences={onEditReferences} compact wizardSummary />
      {brandProtection?.active ?
        <EditorBrandProtectionBanner protection={brandProtection} />
      : null}
      <EditorWizardWorkflowPricingPanel intake={intake} combineIntent={combineIntent} isAdmin={isAdmin} />
      <EditorFusionWizardAdvancedSettings
        document={document}
        onDocumentChange={onDocumentChange}
        customPrompt={customPrompt}
        onCustomPromptChange={onCustomPromptChange}
      />
      {isAdmin ?
        <>
          <FusionIntelligenceAuditPanel document={document} />
          <CharacterConsistencyAuditPanel document={document} />
        </>
      : null}
    </div>
  );
}
