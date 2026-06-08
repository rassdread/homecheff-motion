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
import type { AssetCreateEntryPath, StudioAssetKind } from "@/types/studio-asset-creation";

export type AssetCreationPageContext = {
  entryPath: AssetCreateEntryPath | null;
  wizardProposal: AssetCreationWizardResult["proposal"];
  proposalApplied: boolean;
  showWizard: boolean;
  openGuidedCreation: () => void;
};

type Props = {
  kind: StudioAssetKind;
  guidedQueryParam?: boolean;
  hasDecisionPrefill?: boolean;
  children: (ctx: AssetCreationPageContext) => React.ReactNode;
};

export function StudioAssetCreationPage({
  kind,
  guidedQueryParam = false,
  hasDecisionPrefill = false,
  children,
}: Props) {
  const t = useActiveTranslator();
  const [forceWizard, setForceWizard] = useState(false);
  const [wizardDone, setWizardDone] = useState(false);
  const [entryPath, setEntryPath] = useState<AssetCreateEntryPath | null>(null);
  const [wizardProposal, setWizardProposal] =
    useState<AssetCreationWizardResult["proposal"]>(null);
  const [proposalApplied, setProposalApplied] = useState(false);

  const showWizard = useMemo(() => {
    if (wizardDone || hasDecisionPrefill) {
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
  }, [wizardDone, hasDecisionPrefill, forceWizard, guidedQueryParam]);

  const handleWizardComplete = useCallback((result: AssetCreationWizardResult) => {
    setEntryPath(result.entryPath);
    setWizardProposal(result.proposal);
    setProposalApplied(result.proposalApplied);
    setWizardDone(true);
    setForceWizard(false);
  }, []);

  const openGuidedCreation = useCallback(() => {
    setForceWizard(true);
    setWizardDone(false);
  }, []);

  if (showWizard) {
    return (
      <StudioAssetCreationWizard
        initialKind={kind}
        lockKind
        onComplete={handleWizardComplete}
        onSkipToClassic={() => {
          setWizardDone(true);
          setForceWizard(false);
        }}
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
          className="text-sm font-medium text-[#006D52] hover:underline"
        >
          {t("studio.assetCreation.guidedCreation")}
        </button>
      </div>
      {children({
        entryPath,
        wizardProposal,
        proposalApplied,
        showWizard: false,
        openGuidedCreation,
      })}
    </div>
  );
}
