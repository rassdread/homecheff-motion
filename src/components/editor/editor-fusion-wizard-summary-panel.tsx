"use client";

import { EditorFusionWizardAdvancedSettings } from "@/components/editor/editor-fusion-wizard-advanced-settings";
import { EditorFusionWizardCreditsPanel } from "@/components/editor/editor-fusion-wizard-credits-panel";
import { EditorPlanSummaryPanel } from "@/components/editor/editor-plan-summary-panel";
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
  return (
    <div className="mt-6 space-y-4" data-testid="fusion-wizard-summary">
      <EditorPlanSummaryPanel document={document} onEditReferences={onEditReferences} compact />
      <EditorFusionWizardCreditsPanel intake={intake} combineIntent={combineIntent} isAdmin={isAdmin} />
      <EditorFusionWizardAdvancedSettings
        document={document}
        onDocumentChange={onDocumentChange}
        customPrompt={customPrompt}
        onCustomPromptChange={onCustomPromptChange}
      />
    </div>
  );
}
