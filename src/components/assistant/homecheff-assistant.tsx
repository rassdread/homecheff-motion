"use client";

import { useMemo, useState } from "react";
import { MotionBottomSheet } from "@/components/ui/motion-bottom-sheet";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantChatMessage } from "@/lib/assistant-orchestrator";
import { getAssistantAction } from "@/lib/assistant-action-registry";

function AssistantMessageBody({ message }: { message: AssistantChatMessage }) {
  const t = useActiveTranslator();

  if (message.role === "user" && message.messageKey === "assistant.chat.userEcho") {
    return <p className="text-sm text-zinc-800">{String(message.params?.text ?? "")}</p>;
  }

  const text = t(message.messageKey as never, message.params as never);

  return <p className="text-sm leading-relaxed text-zinc-800">{text}</p>;
}

function AssistantPanel({ onClose }: { onClose?: () => void }) {
  const t = useActiveTranslator();
  const {
    messages,
    suggestions,
    sendMessage,
    acceptProposal,
    loadingContext,
    activeProjectId,
    snapshot,
  } = useHomeCheffAssistant();
  const [draft, setDraft] = useState("");

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
    <div className="flex h-full min-h-0 flex-col" data-testid="homecheff-assistant-panel">
      {activeProject ? (
        <div className="mb-3 rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-3 py-2 text-xs text-zinc-700">
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("assistant.empty" as never)}</p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl px-3 py-2 ${
              message.role === "user"
                ? "ml-8 bg-zinc-100"
                : "mr-4 border border-zinc-200 bg-white shadow-sm"
            }`}
            data-testid={`assistant-message-${message.role}`}
          >
            <AssistantMessageBody message={message} />
            {message.proposal ? (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-zinc-700">
                <div>
                  <span className="font-semibold text-zinc-900">
                    {t("assistant.proposal.understood" as never)}
                  </span>
                  <p>{t(message.proposal.understoodKey as never)}</p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {t("assistant.proposal.action" as never)}
                  </span>
                  <p>{getAssistantAction(message.proposal.actionId).id}</p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-900">
                    {t("assistant.proposal.destination" as never)}
                  </span>
                  <p className="break-all font-mono text-[11px]">{message.proposal.route}</p>
                </div>
                <button
                  type="button"
                  className={`${studioVisual.btnGradientPrimary} w-full px-3 py-2 text-xs`}
                  data-testid="assistant-open-wizard"
                  onClick={() => acceptProposal(message.proposal!)}
                >
                  {t("assistant.proposal.openWizard" as never)}
                </button>
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
          </div>
        ))}
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("assistant.suggestions.title" as never)}
          </p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="block w-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-left text-xs text-amber-950 hover:bg-amber-50"
              onClick={() => {
                if (suggestion.actionId) {
                  sendMessage(getAssistantAction(suggestion.actionId).description);
                }
              }}
            >
              {t(suggestion.messageKey as never)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("assistant.input.placeholder" as never)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          data-testid="assistant-input"
          disabled={loadingContext}
        />
        <button
          type="button"
          className={`${studioVisual.btnGradientPrimary} shrink-0 px-4 py-2 text-sm`}
          onClick={submit}
          data-testid="assistant-send"
          disabled={loadingContext || !draft.trim()}
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

export function HomeCheffAssistant() {
  const t = useActiveTranslator();
  const { open, setOpen } = useHomeCheffAssistant();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        className={`fixed bottom-5 right-4 z-40 hidden rounded-full border border-[#006D52]/35 bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(0,103,177,0.65)] lg:inline-flex`}
        data-testid="homecheff-assistant-fab"
        onClick={() => setOpen(!open)}
      >
        {t("assistant.fab" as never)}
      </button>

      <button
        type="button"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#006D52]/35 bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 text-xs font-semibold text-white shadow-lg lg:hidden"
        data-testid="homecheff-assistant-fab-mobile"
        onClick={() => setOpen(true)}
      >
        {t("assistant.fabShort" as never)}
      </button>

      {open ? (
        <aside
          className="fixed bottom-5 right-4 z-40 hidden h-[min(72vh,640px)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl lg:flex"
          data-testid="homecheff-assistant-desktop"
        >
          <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">{t("assistant.title" as never)}</h2>
              <p className="text-xs text-zinc-500">{t("assistant.subtitle" as never)}</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600"
              onClick={() => setOpen(false)}
            >
              {t("assistant.close" as never)}
            </button>
          </header>
          <div className="min-h-0 flex-1 p-4">
            <AssistantPanel />
          </div>
        </aside>
      ) : null}

      <MotionBottomSheet
        open={open}
        title={t("assistant.title" as never)}
        onClose={() => setOpen(false)}
      >
        <AssistantPanel onClose={() => setOpen(false)} />
      </MotionBottomSheet>
    </>
  );
}
