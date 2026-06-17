"use client";

import Link from "next/link";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantExecutionPlan } from "@/types/assistant-tool-execution";

type Props = {
  plan: AssistantExecutionPlan;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  availableCredits?: number;
};

export function AssistantExecutionConfirmationCard({
  plan,
  onConfirm,
  onCancel,
  loading = false,
  availableCredits,
}: Props) {
  const t = useActiveTranslator();
  const actionableSteps = plan.steps.filter((step) => step.actionId !== "open_motion_wizard");
  const insufficient =
    availableCredits != null &&
    plan.totalEstimatedCredits > 0 &&
    availableCredits < plan.totalEstimatedCredits;

  return (
    <div
      className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-zinc-800"
      data-testid="assistant-execution-confirmation-card"
    >
      <div>
        <p className="font-semibold text-zinc-900">
          {t("assistant.execution.confirm.title" as never)}
        </p>
        <p className="mt-1 text-zinc-600">{t("assistant.execution.confirm.subtitle" as never)}</p>
      </div>

      <ul className="space-y-1.5">
        {actionableSteps.map((step) => (
          <li key={step.id} className="flex items-start gap-2">
            <span aria-hidden>•</span>
            <span>
              {t(step.labelKey as never)}
              {step.executionMode === "requires_user_review" ? (
                <span className="ml-1 text-amber-700">
                  ({t("assistant.execution.confirm.reviewNote" as never)})
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-sky-100 bg-white/80 px-2 py-1.5 text-zinc-700">
        <span className="font-medium">{t("assistant.execution.confirm.estimatedCost" as never)}</span>
        {": "}
        {plan.totalEstimatedCredits > 0
          ? t("assistant.execution.confirm.creditsValue" as never, {
              credits: plan.totalEstimatedCredits,
            })
          : t("assistant.execution.confirm.noCredits" as never)}
      </div>

      {insufficient ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-amber-900">
          <p className="font-medium">{t("billing.conversion.insufficientTitle")}</p>
          <div className="mt-2">
            <BillingConversionCta source="assistant_execution" size="sm" />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${studioVisual.btnPrimary} px-3 py-1.5 text-xs`}
          disabled={loading || insufficient}
          data-testid="assistant-execution-confirm-button"
          onClick={onConfirm}
        >
          {loading
            ? t("assistant.execution.confirm.preparing" as never)
            : t("assistant.execution.confirm.prepare" as never)}
        </button>
        <button
          type="button"
          className={`${studioVisual.btnOutline} px-3 py-1.5 text-xs`}
          disabled={loading}
          onClick={onCancel}
        >
          {t("assistant.execution.confirm.cancel" as never)}
        </button>
      </div>
    </div>
  );
}
