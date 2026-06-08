"use client";

import { useCallback, useMemo, useState } from "react";
import { StudioAssetCreateEntryChoice } from "@/components/studio/studio-asset-create-entry-choice";
import { StudioAssetCreationFlowProgress } from "@/components/studio/studio-asset-creation-flow-progress";
import { StudioAssetWizardChoiceStep } from "@/components/studio/studio-asset-wizard-choice-step";
import {
  canAdvanceFromEssentials,
  canAdvanceFromInput,
  canAdvanceFromProposal,
  canSaveWizardDraft,
  StudioAssetWizardEssentialsStep,
  StudioAssetWizardInputStep,
  StudioAssetWizardProposalStep,
  StudioAssetWizardReviewStep,
} from "@/components/studio/studio-asset-wizard-steps";
import { StudioAssetDerivationPreviewStep } from "@/components/studio/studio-asset-derivation-preview-step";
import { StudioAssetDerivationSourceStep } from "@/components/studio/studio-asset-derivation-source-step";
import { StudioAssetDerivationTransformStep } from "@/components/studio/studio-asset-derivation-transform-step";
import { StudioWizardReferenceStep } from "@/components/studio/studio-wizard-reference-step";
import { useActiveTranslator } from "@/i18n/client";
import {
  canAdvanceFromChoiceStep,
  canAdvanceFromReferenceStep,
} from "@/lib/studio-asset-wizard-choices";
import {
  canAdvanceFromDerivePreview,
  canAdvanceFromDeriveSource,
  canAdvanceFromDeriveTargetKind,
  canAdvanceFromDeriveTransform,
} from "@/lib/studio-asset-derivation-flow";
import {
  emptyAssetWizardDraft,
  emptyChoiceBasedWizardDraft,
  emptyDerivationWizardDraft,
  type AssetWizardDraft,
} from "@/lib/studio-asset-wizard-draft";
import {
  choiceDefForWizardStep,
  wizardStepSequenceForDraft,
  wizardStepsForChoiceFlow,
  wizardStepsForEntryPath,
} from "@/lib/studio-asset-wizard-flow";
import { writeSkipAssetCreationWizard } from "@/lib/studio-asset-creation-preference";
import type {
  AssetCreateEntryPath,
  AssetCreationWizardStep,
  StudioAssetKind,
} from "@/types/studio-asset-creation";

export type AssetCreationWizardResult = {
  kind: StudioAssetKind;
  entryPath: AssetCreateEntryPath;
  proposalApplied: boolean;
  proposal: AssetWizardDraft["proposal"];
  draft: AssetWizardDraft;
};

type Props = {
  initialKind?: StudioAssetKind;
  lockKind?: boolean;
  choiceBasedFlow?: boolean;
  onAdvancedEdit: (result: AssetCreationWizardResult) => void;
  onSave: (result: AssetCreationWizardResult) => Promise<void>;
  onSkipToClassic: () => void;
};

const KIND_OPTIONS: StudioAssetKind[] = ["character", "prop", "location", "world"];

function initialNavIndex(lockKind: boolean, choiceBasedFlow: boolean): number {
  return 0;
}

export function StudioAssetCreationWizard({
  initialKind = "character",
  lockKind = false,
  choiceBasedFlow = false,
  onAdvancedEdit,
  onSave,
  onSkipToClassic,
}: Props) {
  const t = useActiveTranslator();
  const [kind, setKind] = useState<StudioAssetKind>(initialKind);
  const [navIndex, setNavIndex] = useState(() => initialNavIndex(lockKind, choiceBasedFlow));
  const [draft, setDraft] = useState<AssetWizardDraft | null>(null);
  const [skipWizardRemember, setSkipWizardRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const stepSequence = useMemo(() => {
    if (draft) {
      return wizardStepSequenceForDraft(draft, { includeKind: !lockKind });
    }
    if (choiceBasedFlow && lockKind && !draft) {
      return ["entry"] as AssetCreationWizardStep[];
    }
    if (choiceBasedFlow && lockKind) {
      return wizardStepsForChoiceFlow(kind, { includeKind: false });
    }
    return lockKind ? (["entry"] as AssetCreationWizardStep[]) : (["kind", "entry"] as AssetCreationWizardStep[]);
  }, [draft, lockKind, choiceBasedFlow, kind]);

  const navIndexClamped = Math.min(Math.max(0, navIndex), Math.max(0, stepSequence.length - 1));
  const step = stepSequence[navIndexClamped] ?? "kind";

  const activeDraft = useMemo(() => {
    if (draft) {
      return draft;
    }
    if (step === "kind" || step === "entry") {
      return null;
    }
    return choiceBasedFlow
      ? emptyChoiceBasedWizardDraft(kind)
      : emptyAssetWizardDraft(kind, "design");
  }, [draft, kind, step, choiceBasedFlow]);

  const activeChoiceDef = useMemo(() => {
    if (!activeDraft || step !== "choice") {
      return null;
    }
    return choiceDefForWizardStep(activeDraft.kind, stepSequence, step, navIndexClamped);
  }, [activeDraft, step, stepSequence, navIndexClamped]);

  const updateDraft = useCallback(
    (patch: Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft)) => {
      setDraft((prev) => {
        const base =
          prev ??
          (choiceBasedFlow ? emptyChoiceBasedWizardDraft(kind) : emptyAssetWizardDraft(kind, "design"));
        return typeof patch === "function" ? patch(base) : { ...base, ...patch, kind };
      });
    },
    [kind, choiceBasedFlow]
  );

  const buildResult = useCallback((): AssetCreationWizardResult | null => {
    if (!activeDraft) {
      return null;
    }
    return {
      kind: activeDraft.kind,
      entryPath: activeDraft.entryPath,
      proposalApplied: activeDraft.proposalApplied,
      proposal: activeDraft.proposal,
      draft: activeDraft,
    };
  }, [activeDraft]);

  const handleEntrySelect = useCallback(
    (path: AssetCreateEntryPath) => {
      const nextDraft =
        path === "derive_from_reference"
          ? emptyDerivationWizardDraft(kind)
          : emptyAssetWizardDraft(kind, path);
      setDraft(nextDraft);
      const steps = wizardStepSequenceForDraft(nextDraft, { includeKind: !lockKind });
      const firstStep = steps.indexOf("derive_source");
      setNavIndex(firstStep >= 0 ? firstStep : Math.min(steps.indexOf("entry") + 1, steps.length - 1));
    },
    [kind, lockKind]
  );

  const goNext = useCallback(() => {
    if (navIndexClamped < stepSequence.length - 1) {
      setNavIndex(navIndexClamped + 1);
    }
  }, [navIndexClamped, stepSequence.length]);

  const goBack = useCallback(() => {
    if (navIndexClamped > 0) {
      setNavIndex(navIndexClamped - 1);
    }
  }, [navIndexClamped]);

  const canGoNext = useMemo(() => {
    if (step === "entry" && choiceBasedFlow && !draft) {
      return false;
    }
    if (!activeDraft) {
      return false;
    }
    if (step === "choice" && activeChoiceDef) {
      return canAdvanceFromChoiceStep(activeChoiceDef, activeDraft.choices, activeDraft.customTexts);
    }
    if (step === "derive_source") {
      return canAdvanceFromDeriveSource(activeDraft);
    }
    if (step === "derive_target_kind") {
      return canAdvanceFromDeriveTargetKind(activeDraft);
    }
    if (step === "derive_transform") {
      return canAdvanceFromDeriveTransform(activeDraft);
    }
    if (step === "derive_preview") {
      return canAdvanceFromDerivePreview(activeDraft);
    }
    if (step === "reference") {
      return canAdvanceFromReferenceStep(activeDraft.referenceMode, activeDraft.referenceImageUrl, {
        referenceGenerationStatus: activeDraft.referenceGenerationStatus,
        generatedPreviewUrl: activeDraft.generatedReferencePreviewUrl,
      });
    }
    if (step === "input") {
      return canAdvanceFromInput(activeDraft);
    }
    if (step === "proposal") {
      return canAdvanceFromProposal(activeDraft);
    }
    if (step === "essentials") {
      return canAdvanceFromEssentials(activeDraft);
    }
    return step !== "save";
  }, [activeDraft, step, activeChoiceDef, choiceBasedFlow, draft]);

  const handleAdvanced = useCallback(() => {
    const result = buildResult();
    if (result) {
      onAdvancedEdit(result);
    }
  }, [buildResult, onAdvancedEdit]);

  const handleSave = useCallback(async () => {
    const result = buildResult();
    if (!result) {
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await onSave(result);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("studio.assetCreation.save.failed"));
    } finally {
      setSaving(false);
    }
  }, [buildResult, onSave, t]);

  const handleSkip = useCallback(() => {
    if (skipWizardRemember) {
      writeSkipAssetCreationWizard(true);
    }
    onSkipToClassic();
  }, [skipWizardRemember, onSkipToClassic]);

  const showSummaryBar =
    activeDraft?.choiceBasedFlow && activeDraft.summaryPrompt && step !== "kind" && step !== "entry";

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">{t("studio.assetCreation.wizard.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {choiceBasedFlow
              ? t("studio.assetCreation.wizard.choiceLead")
              : t("studio.assetCreation.wizard.lead")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {step !== "kind" && step !== "entry" ?
            <button
              type="button"
              onClick={handleAdvanced}
              className="min-h-[44px] text-sm font-medium text-[#0067B1] hover:underline"
            >
              {t("studio.assetCreation.wizard.advancedEdit")}
            </button>
          : null}
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[44px] text-sm font-medium text-[#006D52] hover:underline"
          >
            {t("studio.assetCreation.wizard.skipClassic")}
          </button>
        </div>
      </div>

      <StudioAssetCreationFlowProgress
        phase="wizard"
        wizardStep={step}
        stepSequence={stepSequence}
        lockKind={lockKind}
        choiceFlowKind={activeDraft?.choiceBasedFlow ? activeDraft.kind : undefined}
        choiceStepIndex={step === "choice" ? navIndexClamped : undefined}
      />

      {showSummaryBar ?
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <span className="font-semibold text-zinc-900">{t("studio.assetCreation.summary.liveLabel")}: </span>
          {activeDraft?.summaryPrompt}
        </div>
      : null}

      {step === "kind" && !lockKind ?
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.wizard.kindQuestion")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setKind(option);
                  setDraft(null);
                  setNavIndex(choiceBasedFlow && lockKind ? 0 : 1);
                }}
                className="min-h-[56px] rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm font-semibold hover:border-[#0067B1]/40 active:bg-zinc-50"
              >
                {t(`studio.assetCreation.kind.${option}` as never)}
              </button>
            ))}
          </div>
        </div>
      : null}

      {step === "entry" && !choiceBasedFlow ?
        <StudioAssetCreateEntryChoice onSelect={handleEntrySelect} />
      : null}

      {step === "entry" && choiceBasedFlow && !draft ?
        <div className="space-y-4">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.entry.question")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDraft(emptyChoiceBasedWizardDraft(kind));
                setNavIndex(0);
              }}
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-left hover:border-[#0067B1]/40"
            >
              <p className="text-sm font-semibold">{t("studio.assetCreation.entry.designTitle")}</p>
              <p className="mt-2 text-xs text-zinc-600">{t("studio.assetCreation.wizard.choiceLead")}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDerivationWizardDraft(kind));
                setNavIndex(0);
              }}
              className="rounded-2xl border border-[#0067B1]/30 bg-blue-50/40 p-5 text-left hover:border-[#0067B1]/50"
            >
              <p className="text-sm font-semibold">{t("studio.assetCreation.entry.deriveTitle")}</p>
              <p className="mt-2 text-xs text-zinc-600">{t("studio.assetCreation.entry.deriveDescription")}</p>
            </button>
          </div>
        </div>
      : null}

      {activeDraft && step === "derive_source" ?
        <StudioAssetDerivationSourceStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && (step === "derive_target_kind" || step === "derive_transform") ?
        <StudioAssetDerivationTransformStep
          draft={activeDraft}
          step={step}
          onDraftChange={updateDraft}
        />
      : null}

      {activeDraft && step === "derive_preview" ?
        <StudioAssetDerivationPreviewStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && step === "choice" && activeChoiceDef ?
        <StudioAssetWizardChoiceStep
          kind={activeDraft.kind}
          def={activeChoiceDef}
          draft={activeDraft}
          onDraftChange={updateDraft}
        />
      : null}

      {activeDraft && step === "reference" ?
        <StudioWizardReferenceStep
          kind={activeDraft.kind}
          draft={activeDraft}
          onDraftChange={updateDraft}
          onBackToChoices={() => {
            const firstChoiceIdx = stepSequence.indexOf("choice");
            if (firstChoiceIdx >= 0) {
              setNavIndex(firstChoiceIdx);
            }
          }}
        />
      : null}

      {activeDraft && step === "input" ?
        <StudioAssetWizardInputStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && step === "proposal" ?
        <StudioAssetWizardProposalStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && step === "essentials" ?
        <StudioAssetWizardEssentialsStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && step === "readiness" ?
        <StudioAssetWizardReviewStep draft={activeDraft} onDraftChange={updateDraft} />
      : null}

      {activeDraft && step === "save" ?
        <div className="space-y-3">
          <StudioAssetWizardReviewStep draft={activeDraft} onDraftChange={updateDraft} />
          <p className="text-sm text-zinc-700">{t("studio.assetCreation.save.lead")}</p>
          {!canSaveWizardDraft(activeDraft) && activeDraft.referenceMode === "skip" ?
            <p className="text-sm text-amber-700">{t("studio.assetCreation.save.referenceRequired")}</p>
          : null}
          {saveError ?
            <p className="text-sm text-red-700">{saveError}</p>
          : null}
          <button
            type="button"
            disabled={saving || !canSaveWizardDraft(activeDraft)}
            onClick={() => void handleSave()}
            className="min-h-[48px] w-full rounded-full bg-[#0067B1] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {saving ? t("button.loading") : t("studio.assetCreation.save.create")}
          </button>
        </div>
      : null}

      {step !== "kind" && step !== "save" ?
        <div className="flex flex-wrap gap-3 pt-2">
          {navIndexClamped > 0 ?
            <button
              type="button"
              onClick={goBack}
              className="min-h-[48px] flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold sm:flex-none"
            >
              {t("studio.assetCreation.wizard.back")}
            </button>
          : null}
          {step !== "readiness" ?
            <button
              type="button"
              disabled={!canGoNext}
              onClick={goNext}
              className="min-h-[48px] flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none"
            >
              {t("studio.assetCreation.wizard.next")}
            </button>
          : step === "readiness" ?
            <button
              type="button"
              onClick={goNext}
              className="min-h-[48px] flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white sm:flex-none"
            >
              {t("studio.assetCreation.wizard.continueToSave")}
            </button>
          : null}
        </div>
      : null}

      <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={skipWizardRemember}
          onChange={(e) => setSkipWizardRemember(e.target.checked)}
        />
        {t("studio.assetCreation.wizard.rememberSkip")}
      </label>
    </div>
  );
}
