"use client";

import { useSyncExternalStore, useState } from "react";
import { AssistantExecutionPreviewCard } from "@/components/assistant/assistant-execution-preview-card";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { DEFAULT_IDENTITY_PRESERVATION_OVERRIDES } from "@/lib/assistant-identity-preservation";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  readIdentityPreservationOverrides,
  subscribeIdentityPreservationOverrides,
  writeIdentityPreservationOverrides,
} from "@/lib/studio-copilot-identity-preservation-storage";
import {
  readStudioCopilotExpertMode,
  subscribeStudioCopilotExpertMode,
  writeStudioCopilotExpertMode,
} from "@/lib/studio-copilot-expert-mode-storage";
import type { IdentityPreservationOverrides } from "@/types/assistant-identity-preservation";
import type { AssistantClarityPresentation } from "@/types/assistant-clarity";
import type { AssistantExecutionPreview } from "@/types/assistant-v4";
import type { CopilotDecisionAction } from "@/types/assistant-clarity";

const IDENTITY_SETTING_KEYS: Array<{
  key: keyof IdentityPreservationOverrides;
  labelKey: `assistant.clarity.identity.${string}`;
}> = [
  { key: "preserveFace", labelKey: "assistant.clarity.identity.face" },
  { key: "preserveEyes", labelKey: "assistant.clarity.identity.eyes" },
  { key: "preserveMouth", labelKey: "assistant.clarity.identity.mouth" },
  { key: "preservePersonality", labelKey: "assistant.clarity.identity.personality" },
  { key: "preserveBodyShape", labelKey: "assistant.clarity.identity.bodyShape" },
  { key: "preserveCoreShape", labelKey: "assistant.clarity.identity.coreSilhouette" },
  { key: "preserveBrandIdentity", labelKey: "assistant.clarity.identity.brandIdentity" },
];

type Props = {
  presentation: AssistantClarityPresentation;
  executionPreview?: AssistantExecutionPreview | null;
  compact?: boolean;
  onExecute: (preview: AssistantExecutionPreview) => void;
  onAdjust: () => void;
  onCancel: () => void;
  onPrompt: (message: string) => void;
  onRoute: (route: string) => void;
};

export function AssistantClarityResponse({
  presentation,
  executionPreview,
  compact = false,
  onExecute,
  onAdjust,
  onCancel,
  onPrompt,
  onRoute,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const { decision } = presentation;
  const [moreOpen, setMoreOpen] = useState(decision.showAllOptions);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const expertOpen = useSyncExternalStore(
    subscribeStudioCopilotExpertMode,
    readStudioCopilotExpertMode,
    () => false
  );
  const identityOverrides = useSyncExternalStore(
    subscribeIdentityPreservationOverrides,
    readIdentityPreservationOverrides,
    () => DEFAULT_IDENTITY_PRESERVATION_OVERRIDES
  );

  const contextHeader = locale === "en" ? decision.contextHeaderEn : decision.contextHeaderNl;
  const recommendation = locale === "en" ? decision.recommendationEn : decision.recommendationNl;
  const warning = locale === "en" ? decision.defaultWarningEn : decision.defaultWarningNl;

  const handleAction = (action: CopilotDecisionAction) => {
    if (action.kind === "more_options") {
      setMoreOpen((v) => !v);
      return;
    }
    if (action.kind === "expert") {
      writeStudioCopilotExpertMode(!expertOpen);
      return;
    }
    if (action.kind === "execute" && executionPreview) {
      onExecute(executionPreview);
      return;
    }
    if (action.kind === "adjust") {
      setAdjustOpen((v) => !v);
      onAdjust();
      return;
    }
    if (action.route) {
      onRoute(action.route);
      return;
    }
    if (action.promptMessage) {
      onPrompt(action.promptMessage);
    }
  };

  const primaryActions = decision.primaryActions.filter((a) => a.kind !== "expert");

  return (
    <div className="mt-2 space-y-2" data-testid="assistant-clarity-response">
      <div
        className={`rounded-lg border border-zinc-200 bg-zinc-50/90 ${compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"} text-zinc-600`}
        data-testid="assistant-clarity-context"
      >
        {contextHeader}
      </div>

      <p className={`font-medium text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
        {recommendation}
      </p>

      {warning ? (
        <p
          className={`rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}
          data-testid="assistant-clarity-warning"
        >
          {warning}
        </p>
      ) : null}

      {executionPreview && executionPreview.status !== "blocked" ? (
        <div
          className={`rounded-lg border border-sky-100 bg-sky-50/60 ${compact ? "p-2 text-[10px]" : "p-2.5 text-xs"} text-zinc-700`}
          data-testid="assistant-clarity-preview"
        >
          <p className="font-semibold text-zinc-900">{t("assistant.v4.preview.title" as never)}</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              {t("assistant.v4.preview.tool" as never)}:{" "}
              {locale === "en" ? executionPreview.toolDisplayNameEn : executionPreview.toolDisplayNameNl}
            </li>
            <li>
              {t("assistant.v4.preview.change" as never)}:{" "}
              {locale === "en" ? executionPreview.changeSummaryEn : executionPreview.changeSummaryNl}
            </li>
            {executionPreview.changedTraitLabels && executionPreview.changedTraitLabels.length > 0 ? (
              <li>
                {t("assistant.v4.preview.changes" as never)}:{" "}
                {executionPreview.changedTraitLabels.join(", ")}
              </li>
            ) : null}
            {executionPreview.preserveItems.length > 0 ? (
              <li>
                {t("assistant.v4.preview.preserve" as never)}: {executionPreview.preserveItems.join(", ")}
              </li>
            ) : null}
            {executionPreview.identityRetentionPercent != null ? (
              <li>
                {t("assistant.v4.preview.identityRetention" as never, {
                  percent: executionPreview.identityRetentionPercent,
                } as never)}
              </li>
            ) : null}
            <li>
              {t("assistant.v4.preview.cost" as never)}: ±{executionPreview.estimatedCredits}{" "}
              {t("assistant.v4.preview.credits" as never)}
            </li>
          </ul>
        </div>
      ) : executionPreview ? (
        <AssistantExecutionPreviewCard
          preview={executionPreview}
          locale={locale}
          compact
          onExecute={onExecute}
          onAdjust={onAdjust}
          onCancel={onCancel}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5" data-testid="assistant-clarity-primary-actions">
        {primaryActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={
              action.kind === "execute" || action.id === "open_workflow"
                ? `${studioVisual.btnGradientPrimary} px-3 py-1.5 text-xs`
                : "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
            }
            onClick={() => handleAction(action)}
          >
            {locale === "en" ? action.labelEn : action.labelNl}
          </button>
        ))}
        {!decision.showAllOptions ? (
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
            data-testid="assistant-clarity-more-options"
            onClick={() => setMoreOpen((v) => !v)}
          >
            {t("assistant.clarity.moreOptions" as never)}
          </button>
        ) : null}
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            expertOpen
              ? "border-violet-300 bg-violet-50 text-violet-900"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
          data-testid="assistant-clarity-expert-mode"
          onClick={() => writeStudioCopilotExpertMode(!expertOpen)}
        >
          {t("assistant.clarity.expertMode" as never)}
        </button>
      </div>

      {moreOpen && decision.secondaryGroups.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-zinc-100 bg-white p-2" data-testid="assistant-clarity-secondary">
          {decision.secondaryGroups.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {locale === "en" ? group.labelEn : group.labelNl}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="rounded-full border border-violet-100 bg-violet-50/80 px-2.5 py-1 text-[10px] text-violet-900"
                    onClick={() => handleAction(action)}
                  >
                    {locale === "en" ? action.labelEn : action.labelNl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {adjustOpen ? (
        <div
          className="space-y-2 rounded-lg border border-zinc-200 bg-white p-2.5"
          data-testid="assistant-clarity-adjust-panel"
        >
          <p className="text-xs font-semibold text-zinc-900">
            {t("assistant.clarity.identity.title" as never)}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {IDENTITY_SETTING_KEYS.map((row) => (
              <label
                key={row.key}
                className="flex items-center gap-2 text-[11px] text-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={identityOverrides[row.key]}
                  onChange={(event) =>
                    writeIdentityPreservationOverrides({
                      ...identityOverrides,
                      [row.key]: event.target.checked,
                    })
                  }
                />
                {t(row.labelKey as never)}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {expertOpen ? (
        <div
          className="space-y-1.5 rounded-lg border border-violet-100 bg-violet-50/40 p-2.5 text-[10px] text-zinc-700"
          data-testid="assistant-clarity-expert-panel"
        >
          <p className="font-semibold text-violet-950">{t("assistant.clarity.expertTitle" as never)}</p>
          {decision.expertDetails.toolMatchSummary ? (
            <p>
              <span className="font-medium">{t("assistant.clarity.toolMatch" as never)}:</span>{" "}
              {decision.expertDetails.toolMatchSummary}
            </p>
          ) : null}
          {decision.expertDetails.selectedParts.length > 0 ? (
            <p>
              <span className="font-medium">{t("assistant.clarity.parts" as never)}:</span>{" "}
              {decision.expertDetails.selectedParts.join(", ")}
            </p>
          ) : null}
          {decision.expertDetails.preserveConstraints.length > 0 ? (
            <p>
              <span className="font-medium">{t("assistant.clarity.preserve" as never)}:</span>{" "}
              {decision.expertDetails.preserveConstraints.join(", ")}
            </p>
          ) : null}
          {decision.expertDetails.readinessDetails ? (
            <p>{decision.expertDetails.readinessDetails}</p>
          ) : null}
          {decision.expertDetails.creditBreakdown ? (
            <p>{decision.expertDetails.creditBreakdown}</p>
          ) : null}
          {decision.expertDetails.consistencyWarnings.map((line) => (
            <p key={line} className="text-amber-800">
              {line}
            </p>
          ))}
          {decision.expertDetails.alternativeTools.length > 0 ? (
            <p>
              <span className="font-medium">{t("assistant.clarity.alternatives" as never)}:</span>{" "}
              {decision.expertDetails.alternativeTools.join(", ")}
            </p>
          ) : null}
          {decision.expertDetails.allInsights.map((line) => (
            <p key={line} className="text-zinc-500">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
