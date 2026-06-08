"use client";

import { useCallback, useMemo, useState } from "react";
import {
  StudioAssetCreationWizard,
  type AssetCreationWizardResult,
} from "@/components/studio/studio-asset-creation-wizard";
import { StudioAssetCreationFlowProgress } from "@/components/studio/studio-asset-creation-flow-progress";
import { useActiveTranslator } from "@/i18n/client";
import {
  readSkipAssetCreationWizard,
  shouldShowAssetCreationWizard,
} from "@/lib/studio-asset-creation-preference";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetCreateEntryPath, StudioAssetKind } from "@/types/studio-asset-creation";

export type AssetCreationPageContext = {
  entryPath: AssetCreateEntryPath | null;
  wizardProposal: AssetCreationWizardResult["proposal"];
  proposalApplied: boolean;
  wizardDraft: AssetWizardDraft | null;
  showWizard: boolean;
  advancedMode: boolean;
  openGuidedCreation: () => void;
};

type Props = {
  kind: StudioAssetKind;
  guidedQueryParam?: boolean;
  hasDecisionPrefill?: boolean;
  onWizardSave: (result: AssetCreationWizardResult) => Promise<void>;
  children: (ctx: AssetCreationPageContext) => React.ReactNode;
};

export function StudioAssetCreationPage({
  kind,
  guidedQueryParam = false,
  hasDecisionPrefill = false,
  onWizardSave,
  children,
}: Props) {
  const t = useActiveTranslator();
  const [forceWizard, setForceWizard] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [entryPath, setEntryPath] = useState<AssetCreateEntryPath | null>(null);
  const [wizardProposal, setWizardProposal] =
    useState<AssetCreationWizardResult["proposal"]>(null);
  const [proposalApplied, setProposalApplied] = useState(false);
  const [wizardDraft, setWizardDraft] = useState<AssetWizardDraft | null>(null);

  const showWizard = useMemo(() => {
    if (advancedMode || hasDecisionPrefill) {
      return false;
    }
    if (forceWizard) {
      return true;
    }
    return shouldShowAssetCreationWizard({
      skipWizardPreference: readSkipAssetCreationWizard(),
      guidedQueryParam,
      hasDecisionPrefill,
    });
  }, [advancedMode, hasDecisionPrefill, forceWizard, guidedQueryParam]);

  const applyWizardResult = useCallback((result: AssetCreationWizardResult) => {
    setEntryPath(result.entryPath);
    setWizardProposal(result.proposal);
    setProposalApplied(result.proposalApplied);
    setWizardDraft(result.draft);
  }, []);

  const handleAdvancedEdit = useCallback(
    (result: AssetCreationWizardResult) => {
      applyWizardResult(result);
      setAdvancedMode(true);
      setForceWizard(false);
    },
    [applyWizardResult]
  );

  const handleWizardSave = useCallback(
    async (result: AssetCreationWizardResult) => {
      applyWizardResult(result);
      await onWizardSave(result);
    },
    [applyWizardResult, onWizardSave]
  );

  const openGuidedCreation = useCallback(() => {
    setForceWizard(true);
    setAdvancedMode(false);
  }, []);

  const handleSkipToClassic = useCallback(() => {
    setAdvancedMode(true);
    setForceWizard(false);
  }, []);

  if (showWizard) {
    return (
      <StudioAssetCreationWizard
        initialKind={kind}
        lockKind
        choiceBasedFlow={guidedQueryParam || forceWizard}
        onAdvancedEdit={handleAdvancedEdit}
        onSave={handleWizardSave}
        onSkipToClassic={handleSkipToClassic}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StudioAssetCreationFlowProgress phase="builder" />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openGuidedCreation}
          className="min-h-[44px] text-sm font-medium text-[#006D52] hover:underline"
        >
          {t("studio.assetCreation.guidedCreation")}
        </button>
      </div>
      {children({
        entryPath,
        wizardProposal,
        proposalApplied,
        wizardDraft,
        showWizard: false,
        advancedMode,
        openGuidedCreation,
      })}
    </div>
  );
}
