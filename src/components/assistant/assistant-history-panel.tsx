"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildAssistantReusePrompt,
  listAssistantHistory,
} from "@/lib/assistant-history";

export function AssistantHistoryPanel({ collapsedDefault = true }: { collapsedDefault?: boolean }) {
  const t = useActiveTranslator();
  const pathname = usePathname();
  const { activeProjectId, sendMessage } = useHomeCheffAssistant();
  const [open, setOpen] = useState(!collapsedDefault);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((value) => value + 1);
    window.addEventListener("hc-assistant-history-updated", handler);
    return () => window.removeEventListener("hc-assistant-history-updated", handler);
  }, []);

  const items = useMemo(() => {
    const projectScoped =
      pathname.startsWith("/projects") && activeProjectId ? activeProjectId : null;
    return listAssistantHistory(projectScoped).slice(0, 5);
  }, [pathname, activeProjectId, tick]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-zinc-100 px-4 py-2" data-testid="growth-sidebar-history">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((value) => !value)}
        data-testid="studio-copilot-history-toggle"
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("studioCopilot.history.title" as never)}
        </h3>
        <span className="text-[10px] text-zinc-400">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-left"
          >
            <p className="text-xs font-semibold text-zinc-900">{item.assistantSummary}</p>
            <p className="mt-1 text-[10px] text-zinc-500">
              {t(`assistant.history.status.${item.status}` as never)}
              {item.projectTitle ? ` · ${item.projectTitle}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-700"
                onClick={() => sendMessage(buildAssistantReusePrompt(item))}
              >
                {t("assistant.history.reuse" as never)}
              </button>
              {item.route ? (
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-700"
                  onClick={() => {
                    window.location.assign(item.route!);
                  }}
                >
                  {t("assistant.history.resume" as never)}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        </div>
      ) : null}
    </section>
  );
}
