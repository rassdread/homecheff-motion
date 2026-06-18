"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantExecutionPreview } from "@/types/assistant-v4";

type Props = {
  preview: AssistantExecutionPreview;
  locale: "nl" | "en";
  onExecute: (preview: AssistantExecutionPreview) => void;
  onAdjust: () => void;
  onCancel: () => void;
  onBuyCredits?: () => void;
  onUpgrade?: () => void;
  onCheaperAlternative?: (route: string) => void;
};

export function AssistantExecutionPreviewCard({
  preview,
  locale,
  onExecute,
  onAdjust,
  onCancel,
  onBuyCredits,
  onUpgrade,
  onCheaperAlternative,
}: Props) {
  const t = useActiveTranslator();
  const toolName = locale === "en" ? preview.toolDisplayNameEn : preview.toolDisplayNameNl;
  const changeSummary = locale === "en" ? preview.changeSummaryEn : preview.changeSummaryNl;
  const resultSummary = locale === "en" ? preview.resultSummaryEn : preview.resultSummaryNl;
  const riskWarning = locale === "en" ? preview.riskWarningEn : preview.riskWarningNl;

  if (preview.status === "blocked") {
    return (
      <div
        className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-zinc-700"
        data-testid="assistant-v4-execution-preview"
      >
        <p className="font-semibold text-zinc-900">{preview.resultSummaryNl}</p>
        <button
          type="button"
          className="mt-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
          onClick={onCancel}
        >
          {t("assistant.v4.preview.gotIt" as never)}
        </button>
      </div>
    );
  }

  return (
    <div
      className="mt-3 space-y-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-zinc-700"
      data-testid="assistant-v4-execution-preview"
    >
      <p className="font-semibold text-zinc-900">{t("assistant.v4.preview.title" as never)}</p>
      <ul className="space-y-1">
        <li>
          <span className="font-medium">{t("assistant.v4.preview.tool" as never)}:</span> {toolName}
        </li>
        <li>
          <span className="font-medium">{t("assistant.v4.preview.goal" as never)}:</span> {preview.goal}
        </li>
        <li>
          <span className="font-medium">{t("assistant.v4.preview.change" as never)}:</span> {changeSummary}
        </li>
        {preview.preserveItems.length > 0 ? (
          <li>
            <span className="font-medium">{t("assistant.v4.preview.preserve" as never)}:</span>{" "}
            {preview.preserveItems.join(", ")}
          </li>
        ) : null}
        <li>
          <span className="font-medium">{t("assistant.v4.preview.cost" as never)}:</span> ±
          {preview.estimatedCredits} {t("assistant.v4.preview.credits" as never)}
          {!preview.sufficientCredits ? (
            <span className="ml-1 text-amber-700">
              ({t("assistant.v4.preview.insufficient" as never, {
                available: preview.availableCredits,
              } as never)}
              )
            </span>
          ) : null}
        </li>
        <li>
          <span className="font-medium">{t("assistant.v4.preview.result" as never)}:</span> {resultSummary}
        </li>
        {riskWarning ? (
          <li className="text-amber-800">
            <span className="font-medium">{t("assistant.v4.preview.risk" as never)}:</span> {riskWarning}
          </li>
        ) : null}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        {preview.sufficientCredits && preview.requiresConfirmation ? (
          <button
            type="button"
            className={`${studioVisual.btnGradientPrimary} px-3 py-1.5 text-xs`}
            data-testid="assistant-v4-execute"
            onClick={() => onExecute(preview)}
          >
            {t("assistant.v4.preview.execute" as never)}
          </button>
        ) : null}
        {!preview.sufficientCredits ? (
          <>
            <button
              type="button"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
              onClick={() => (onBuyCredits ? onBuyCredits() : window.location.assign("/pricing"))}
            >
              {t("assistant.v4.preview.buyCredits" as never)}
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
              onClick={() => (onUpgrade ? onUpgrade() : window.location.assign("/pricing"))}
            >
              {t("assistant.v4.preview.upgrade" as never)}
            </button>
            {preview.cheaperAlternativeToolId ? (
              <button
                type="button"
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                onClick={() =>
                  onCheaperAlternative
                    ? onCheaperAlternative(preview.route)
                    : undefined
                }
              >
                {t("assistant.v4.preview.cheaper" as never)}
              </button>
            ) : null}
          </>
        ) : preview.requiresConfirmation ? (
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
            onClick={onAdjust}
          >
            {t("assistant.v4.preview.adjust" as never)}
          </button>
        ) : (
          <button
            type="button"
            className={`${studioVisual.btnGradientPrimary} px-3 py-1.5 text-xs`}
            onClick={() => onExecute(preview)}
          >
            {t("assistant.v4.preview.openWorkflow" as never)}
          </button>
        )}
        <button
          type="button"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
          onClick={onCancel}
        >
          {t("assistant.v4.preview.cancel" as never)}
        </button>
      </div>
    </div>
  );
}
