"use client";

import { useMemo, useRef, useState } from "react";
import { AssistantActivityPanel } from "@/components/assistant/assistant-activity-panel";
import { AssistantClarityResponse } from "@/components/assistant/assistant-clarity-response";
import { AssistantExecutionPreviewCard } from "@/components/assistant/assistant-execution-preview-card";
import { AssistantInterpretationPanel } from "@/components/assistant/assistant-interpretation-panel";
import { ActionPresetRequirementsCard } from "@/components/assistant/action-preset-requirements-card";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantChatMessage } from "@/lib/assistant-orchestrator";
import { getAssistantAction } from "@/lib/assistant-action-registry";

function AssistantMessageBody({ message }: { message: AssistantChatMessage }) {
  const t = useActiveTranslator();

  if (message.role === "user" && message.messageKey === "assistant.chat.userEcho") {
    return <p className="text-sm text-zinc-800">{String(message.params?.text ?? "")}</p>;
  }

  if (message.messageKey === "assistant.reply.producer" && message.params?.text) {
    return <p className="text-sm leading-relaxed text-zinc-800">{String(message.params.text)}</p>;
  }

  if (message.messageKey === "assistant.chat.pricingReply" && message.params?.text) {
    return <p className="text-sm leading-relaxed text-zinc-800">{String(message.params.text)}</p>;
  }

  const text = t(message.messageKey as never, message.params as never);
  return <p className="text-sm leading-relaxed text-zinc-800">{text}</p>;
}

type Props = {
  onClose?: () => void;
  sidebarMode?: boolean;
  placement?: "side" | "wide" | "dock" | "sheet" | "focus";
  compact?: boolean;
};

export function AssistantChatPanel({
  onClose,
  sidebarMode = false,
  placement = "side",
  compact = false,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const {
    messages,
    sendMessage,
    acceptProposal,
    executeV4Preview,
    cancelPrefill,
    loadingContext,
    interpreting,
    activeProjectId,
    snapshot,
    libraryRecords,
    updateProposalPrefill,
  } = useHomeCheffAssistant();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const focusAssistantInput = () => {
    inputRef.current?.focus();
  };

  const activeProject = useMemo(
    () => snapshot.projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, snapshot.projects]
  );

  const submit = () => {
    const value = draft.trim();
    if (!value) {
      return;
    }
    sendMessage(value);
    setDraft("");
  };

  return (
    <div
      className={`flex min-h-0 flex-col ${sidebarMode || placement === "dock" ? "h-full" : "h-full"}`}
      data-testid="homecheff-assistant-panel"
      data-studio-copilot-placement={placement}
    >
      {activeProject && !compact ? (
        <div className="mb-2 shrink-0 rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-3 py-2 text-xs text-zinc-700">
          <span className="font-semibold text-zinc-900">{activeProject.title}</span>
          <span className="mx-2 text-zinc-400">·</span>
          <span>{activeProject.workflowStatus}</span>
          <span className="mx-2 text-zinc-400">·</span>
          <span>
            {t("assistant.context.projectCounts" as never, {
              characters: activeProject.assetStats.characterCount,
              videos: activeProject.assetStats.videoCount,
              fusion: snapshot.library.fusionOutputs.length,
            })}
          </span>
        </div>
      ) : null}

      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 ${compact ? "text-xs" : "space-y-3"}`}>
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {sidebarMode
              ? t("assistant.growth.chatPrompt" as never)
              : t("assistant.empty" as never)}
          </p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl px-3 py-2 ${
              message.role === "user"
                ? `ml-6 bg-zinc-100 ${compact ? "ml-4 py-1.5" : ""}`
                : `mr-2 border border-zinc-200 bg-white shadow-sm ${compact ? "mr-0 py-1.5 shadow-none" : ""}`
            }`}
            data-testid={`assistant-message-${message.role}`}
          >
            {!(
              message.v3Response?.version === 4 && message.v3Response.clarityPresentation
            ) ? (
              <AssistantMessageBody message={message} />
            ) : null}
            {message.proposal ? (
              <div className="mt-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-zinc-700">
                {message.proposal.prefillPackage?.interpretationSummary ? (
                  <AssistantInterpretationPanel
                    prefill={message.proposal.prefillPackage}
                    onAnswer={sendMessage}
                  />
                ) : null}
                {message.proposal.prefillPackage?.requirementAnalysis ? (
                  <ActionPresetRequirementsCard
                    prefill={message.proposal.prefillPackage}
                    activeProject={
                      activeProject ? { id: activeProject.id, title: activeProject.title } : null
                    }
                    libraryRecords={libraryRecords}
                    onPrefillUpdated={(pkg) => updateProposalPrefill(pkg.id, pkg)}
                    onOpenWizard={(pkg) =>
                      acceptProposal({
                        understoodKey: pkg.understoodKey,
                        actionId: message.proposal!.actionId,
                        route: pkg.targetRoute,
                        autoExecute: false,
                        prefillPackage: pkg,
                      })
                    }
                  />
                ) : null}
                {message.proposal.prefillPackage ? (
                  <AssistantActivityPanel steps={message.proposal.prefillPackage.activitySteps} />
                ) : null}
                {!message.proposal.prefillPackage?.interpretationSummary ? (
                  <div>
                    <span className="font-semibold text-zinc-900">
                      {t("assistant.proposal.understood" as never)}
                    </span>
                    <p>{t(message.proposal.understoodKey as never)}</p>
                  </div>
                ) : null}
                {message.proposal.prefillPackage?.missingInputs.length ? (
                  <div>
                    <span className="font-semibold text-zinc-900">
                      {t("assistant.prefill.review.missing" as never)}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {(message.proposal.prefillPackage?.missingInputs ?? []).map(
                        (key: `assistant.prefill.missing.${string}`) => (
                          <li key={key}>• {t(key as never)}</li>
                        )
                      )}
                    </ul>
                  </div>
                ) : null}
                {message.proposal.prefillPackage?.settingLabelKeys.length ? (
                  <div>
                    <span className="font-semibold text-zinc-900">
                      {t("assistant.proposal.review.settings" as never)}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {(message.proposal.prefillPackage?.settingLabelKeys ?? []).map(
                        (key: `assistant.prefill.setting.${string}`) => (
                          <li key={key}>• {t(key as never)}</li>
                        )
                      )}
                    </ul>
                  </div>
                ) : null}
                {message.proposal.prefillPackage?.pendingQuestions[0] &&
                !message.proposal.prefillPackage?.interpretationSummary?.followUpQuestions
                  .length ? (
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {t(message.proposal.prefillPackage.pendingQuestions[0].labelKey as never)}
                    </p>
                    {message.proposal.prefillPackage.pendingQuestions[0].options ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.proposal.prefillPackage.pendingQuestions[0].options.map(
                          (option: {
                            id: string;
                            labelKey: `assistant.prefill.question.${string}`;
                          }) => (
                            <button
                              key={option.id}
                              type="button"
                              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                              onClick={() => sendMessage(option.id)}
                            >
                              {t(option.labelKey as never)}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                        onClick={() => sendMessage("ja")}
                      >
                        {t("assistant.prefill.question.confirmReady" as never)}
                      </button>
                    )}
                  </div>
                ) : null}
                <div>
                  <span className="font-semibold text-zinc-900">
                    {t("assistant.proposal.action" as never)}
                  </span>
                  <p>{getAssistantAction(message.proposal.actionId).description}</p>
                </div>
                {message.proposal.actionId !== "create_video_production" ?
                  <div>
                    <span className="font-semibold text-zinc-900">
                      {t("assistant.proposal.destination" as never)}
                    </span>
                    <p className="break-all font-mono text-[11px]">
                      {message.proposal.prefillPackage?.targetRoute ?? message.proposal.route}
                    </p>
                  </div>
                : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${studioVisual.btnGradientPrimary} flex-1 px-3 py-2 text-xs disabled:opacity-50`}
                    data-testid="assistant-open-wizard"
                    disabled={message.proposal.prefillPackage?.readiness === "waiting_for_answer"}
                    onClick={() => acceptProposal(message.proposal!)}
                  >
                    {message.proposal.actionId === "create_video_production"
                      ? t("studio.orchestrator.createVideo" as never)
                      : t("assistant.proposal.openWizard" as never)}
                  </button>
                  {message.proposal.prefillPackage ? (
                    <>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs"
                        data-testid="assistant-ask-another"
                        onClick={focusAssistantInput}
                      >
                        {t("assistant.prefill.review.askAnother" as never)}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs"
                        onClick={focusAssistantInput}
                      >
                        {t("assistant.prefill.review.adjust" as never)}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs"
                    onClick={cancelPrefill}
                  >
                    {t("assistant.prefill.review.cancel" as never)}
                  </button>
                </div>
              </div>
            ) : null}
            {message.clarifyOptions && message.clarifyOptions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.clarifyOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#0067B1]/30"
                    onClick={() => sendMessage(option.id)}
                  >
                    {t(option.labelKey as never)}
                  </button>
                ))}
              </div>
            ) : null}
            {message.v3Response?.version === 4 && message.v3Response.clarityPresentation ? (
              <AssistantClarityResponse
                presentation={message.v3Response.clarityPresentation}
                executionPreview={message.v3Response.executionPreview}
                compact={compact}
                onExecute={executeV4Preview}
                onAdjust={focusAssistantInput}
                onCancel={cancelPrefill}
                onPrompt={sendMessage}
                onRoute={(route) => window.location.assign(route)}
              />
            ) : null}
            {message.v3Response?.version === 4 &&
            !message.v3Response.clarityPresentation &&
            message.v3Response.executionPreview ? (
              <AssistantExecutionPreviewCard
                preview={message.v3Response.executionPreview}
                locale={locale}
                compact={compact}
                onExecute={executeV4Preview}
                onAdjust={focusAssistantInput}
                onCancel={cancelPrefill}
              />
            ) : null}
            {message.v3Response?.readinessScore && !message.v3Response.clarityPresentation ? (
              <div
                className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-600"
                data-testid="assistant-v4-readiness"
              >
                {t("assistant.v4.preview.readiness" as never, {
                  score: message.v3Response.readinessScore.scorePercent,
                } as never)}
              </div>
            ) : null}
            {message.v3Response?.actionGroups &&
            message.v3Response.actionGroups.length > 0 &&
            !message.v3Response.clarityPresentation ? (
              <div className="mt-3 space-y-3" data-testid="assistant-v3-action-groups">
                {message.v3Response.actionGroups.map((group) => (
                  <div key={group.id}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {group.label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {group.actions.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:border-violet-300"
                          onClick={() => {
                            if (row.route && message.v3Response?.executionPreview) {
                              executeV4Preview({
                                ...message.v3Response.executionPreview,
                                route: row.route,
                              });
                              return;
                            }
                            if (row.route) {
                              window.location.assign(row.route);
                              return;
                            }
                            sendMessage(row.promptMessage);
                          }}
                        >
                          {row.label}
                          {"estimatedCredits" in row && row.estimatedCredits != null && row.estimatedCredits > 0
                            ? ` (±${row.estimatedCredits})`
                            : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {message.producerResponse &&
            (message.producerResponse.options.length > 0 ||
              message.producerResponse.productionPlan ||
              message.producerResponse.costEstimate ||
              message.producerResponse.executionChain) ? (
              <div className="mt-3 space-y-2" data-testid="assistant-producer-options">
                {message.producerResponse.questions.length > 0 ? (
                  <ul className="space-y-1 text-xs text-zinc-600">
                    {message.producerResponse.questions.map((question) => (
                      <li key={question}>• {question}</li>
                    ))}
                  </ul>
                ) : null}
                {message.producerResponse.productionPlan ? (
                  <div
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-2 text-xs text-zinc-700"
                    data-testid="assistant-production-plan"
                  >
                    <p className="font-medium text-zinc-900">{t("assistant.clarity.productionSteps" as never)}</p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                      {message.producerResponse.productionPlan.steps.map((step) => (
                        <li key={step.id}>{step.title}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {message.producerResponse.costEstimate ? (
                  <p
                    className="text-[11px] text-emerald-800"
                    data-testid="assistant-cost-estimate"
                  >
                    {message.producerResponse.costEstimate.summary}
                  </p>
                ) : null}
                {message.producerResponse.executionChain ? (
                  <div
                    className="rounded-lg border border-sky-100 bg-sky-50/60 p-2 text-[11px] text-sky-900"
                    data-testid="assistant-execution-chain"
                  >
                    <p className="font-medium">{message.producerResponse.executionChain.goal}</p>
                    <ul className="mt-1 space-y-0.5">
                      {message.producerResponse.executionChain.steps.map((step) => (
                        <li key={`${step.order}-${step.label}`}>
                          {step.order}. {step.label}
                          {step.assetName ? ` — ${step.assetName}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {message.producerResponse.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {message.producerResponse.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-[#006D52]/40 hover:bg-emerald-50/80"
                        data-testid={`assistant-producer-option-${option.id}`}
                        onClick={() => sendMessage(option.promptMessage)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.producerResponse.requiresLogin ? (
                  <p className="text-[11px] text-amber-700">
                    {t("assistant.producer.loginHint" as never)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div
        className={`mt-auto flex shrink-0 gap-2 border-t border-zinc-100 bg-white pt-2 ${
          compact ? "sticky bottom-0 pb-1" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("studioCopilot.input.placeholder" as never)}
          className={`min-w-0 flex-1 rounded-xl border border-zinc-200 text-zinc-900 ${
            compact ? "px-2.5 py-2 text-xs" : "px-3 py-2 text-sm"
          }`}
          data-testid="assistant-input"
          disabled={loadingContext}
        />
        <button
          type="button"
          className={`${studioVisual.btnGradientPrimary} shrink-0 px-3 py-2 text-sm`}
          onClick={submit}
          data-testid="assistant-send"
          disabled={loadingContext || interpreting || !draft.trim()}
        >
          {t("assistant.input.send" as never)}
        </button>
      </div>

      {onClose ? (
        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 lg:hidden"
          onClick={onClose}
        >
          {t("assistant.close" as never)}
        </button>
      ) : null}
    </div>
  );
}
