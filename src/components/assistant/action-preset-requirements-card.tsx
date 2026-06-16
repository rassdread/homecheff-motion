"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { AssistantExecutionConfirmationCard } from "@/components/assistant/assistant-execution-confirmation-card";
import { AssistantExecutionActivityPanel } from "@/components/assistant/assistant-execution-activity-panel";
import {
  buildExecutionPlanForPrefill,
  runAssistantExecutionPlan,
} from "@/lib/assistant-execution-runner";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { AssistantExecutionPlan } from "@/types/assistant-tool-execution";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

type Props = {
  prefill: AssistantPrefillPackage;
  activeProject?: { id: string; title?: string } | null;
  libraryRecords?: LibraryConsistencyRecord[];
  onPrefillUpdated?: (pkg: AssistantPrefillPackage) => void;
  onOpenWizard?: (pkg: AssistantPrefillPackage) => void;
};

type ViewState = "requirements" | "confirm" | "executing" | "complete";

export function ActionPresetRequirementsCard({
  prefill,
  activeProject,
  libraryRecords = [],
  onPrefillUpdated,
  onOpenWizard,
}: Props) {
  const t = useActiveTranslator();
  const analysis = prefill.requirementAnalysis;
  const [view, setView] = useState<ViewState>(
    prefill.executionPlan?.status === "completed" ? "complete" : "requirements"
  );
  const [plan, setPlan] = useState<AssistantExecutionPlan | null>(prefill.executionPlan ?? null);
  const [currentPrefill, setCurrentPrefill] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPreparableSteps = useMemo(() => {
    const missing = analysis?.missingAssets.length ?? 0;
    const motionReady = Boolean(analysis?.requirementResult.motionReadyIssue);
    return missing > 0 || motionReady;
  }, [analysis]);

  const handlePrepareClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const built = await buildExecutionPlanForPrefill({
        pkg: currentPrefill,
        activeProject,
      });
      if (!built) {
        setError(t("assistant.execution.error.planFailed" as never));
        return;
      }
      setPlan(built);
      setView("confirm");
    } finally {
      setLoading(false);
    }
  }, [activeProject, currentPrefill, t]);

  const handleConfirm = useCallback(async () => {
    if (!plan) {
      return;
    }
    setError(null);
    setLoading(true);
    setView("executing");
    try {
      const outcome = await runAssistantExecutionPlan({
        pkg: currentPrefill,
        plan: { ...plan, status: "running", confirmedAt: new Date().toISOString() },
        libraryRecords,
        projectId: activeProject?.id ?? currentPrefill.projectId ?? null,
      });
      if (!outcome) {
        setError(t("assistant.execution.error.runFailed" as never));
        setView("confirm");
        return;
      }
      setPlan(outcome.plan);
      setCurrentPrefill(outcome.pkg);
      onPrefillUpdated?.(outcome.pkg);
      setView("complete");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, currentPrefill, libraryRecords, onPrefillUpdated, plan, t]);

  if (!analysis) {
    return null;
  }

  const { requirementResult, resolutionPlan } = analysis;

  return (
    <div
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-800"
      data-testid="action-preset-requirements-card"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          {t("assistant.requirements.card.title" as never)}
        </p>
        <p className="mt-1 font-semibold text-zinc-900">{requirementResult.presetTitle}</p>
        <p className="mt-1 text-zinc-600">{t("assistant.requirements.card.subtitle" as never)}</p>
      </div>

      {view === "requirements" ? (
        <>
          {analysis.assistantRecommendations.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2">
              {analysis.assistantRecommendations.map((key) => (
                <li key={key} className="text-emerald-950">
                  {t(key as never)}
                </li>
              ))}
            </ul>
          ) : null}

          {requirementResult.availableAssets.length > 0 ? (
            <div>
              <p className="font-semibold text-zinc-900">
                {t("assistant.requirements.card.available" as never)}
              </p>
              <ul className="mt-1 space-y-1">
                {requirementResult.availableAssets.map((asset) => (
                  <li key={`${asset.requirementId}-${asset.assetId}`} className="flex gap-2">
                    <span aria-hidden>✓</span>
                    <span>
                      {t(`assistant.requirements.${asset.requirementId}` as never, {
                        defaultValue: asset.assetName,
                      })}
                      {": "}
                      {asset.assetName}
                      {asset.fromProject ? (
                        <span className="ml-1 text-emerald-700">
                          ({t("assistant.requirements.card.fromProject" as never)})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {requirementResult.missingAssets.length > 0 ? (
            <div>
              <p className="font-semibold text-zinc-900">
                {t("assistant.requirements.card.missing" as never)}
              </p>
              <ul className="mt-1 space-y-2">
                {requirementResult.missingAssets.map((missing) => (
                  <li
                    key={missing.requirementId}
                    className="rounded-lg border border-amber-100 bg-amber-50/70 p-2"
                  >
                    <p className="font-medium text-amber-950">
                      <span aria-hidden>⚠ </span>
                      {t(missing.labelKey as never, { defaultValue: missing.label })}
                    </p>
                    {missing.options.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 pl-4 text-amber-900">
                        {missing.options.map((option) => (
                          <li key={option.id}>• {t(option.labelKey as never)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {requirementResult.motionReadyIssue ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-amber-950"
              data-testid="action-preset-motion-ready-issue"
            >
              <p className="font-semibold">{t("assistant.requirements.motionReady.title" as never)}</p>
              <p className="mt-1">
                {t("assistant.requirements.motionReady.bodyNamed" as never, {
                  name: requirementResult.motionReadyIssue.characterName,
                })}
              </p>
            </div>
          ) : null}

          {resolutionPlan.steps.length > 0 ? (
            <div>
              <p className="font-semibold text-zinc-900">
                {t("assistant.requirements.card.plan" as never)}
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                {resolutionPlan.steps.map((step) => (
                  <li key={step.id}>{t(step.labelKey as never)}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {hasPreparableSteps ? (
            <button
              type="button"
              className={`${studioVisual.btnPrimary} px-3 py-1.5 text-xs`}
              data-testid="assistant-prepare-button"
              disabled={loading}
              onClick={() => void handlePrepareClick()}
            >
              {loading
                ? t("assistant.execution.confirm.preparing" as never)
                : t("assistant.execution.prepareButton" as never)}
            </button>
          ) : null}
        </>
      ) : null}

      {view === "confirm" && plan ? (
        <AssistantExecutionConfirmationCard
          plan={plan}
          loading={loading}
          onCancel={() => setView("requirements")}
          onConfirm={() => void handleConfirm()}
        />
      ) : null}

      {(view === "executing" || view === "complete") && plan ? (
        <AssistantExecutionActivityPanel
          plan={plan}
          onOpenWizard={
            onOpenWizard && currentPrefill.readiness === "ready_to_open"
              ? () => onOpenWizard(currentPrefill)
              : undefined
          }
        />
      ) : null}

      {error ? <p className="text-amber-800">{error}</p> : null}
    </div>
  );
}
