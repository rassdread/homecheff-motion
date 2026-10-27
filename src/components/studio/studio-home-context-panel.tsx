"use client";

import { useSyncExternalStore } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  getStudioHomeComposerServerSnapshot,
  readStudioHomeComposerContext,
  subscribeStudioHomeComposerContext,
} from "@/lib/studio-home-composer-context";

/** Homepage side panel: the current idea and selections, without a second AI input. */
export function StudioHomeContextPanel() {
  const t = useActiveTranslator();
  const snapshot = useSyncExternalStore(
    subscribeStudioHomeComposerContext,
    readStudioHomeComposerContext,
    getStudioHomeComposerServerSnapshot,
  );

  return (
    <section className="border-b border-zinc-100 px-4 py-4" data-testid="studio-home-context-panel">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("studioCopilot.title" as never)}
      </h3>
      <p className="mt-2 text-sm text-zinc-600">{t("studio.aiHome.prompt.subtitle")}</p>
      {snapshot.prompt.trim() ? (
        <p
          className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          data-testid="studio-home-context-prompt"
        >
          {snapshot.prompt}
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500" data-testid="studio-home-context-empty">
          {t("studioCopilot.context.empty" as never)}
        </p>
      )}
      {snapshot.attachments.length > 0 ? (
        <ul className="mt-3 space-y-1" data-testid="studio-home-context-attachments">
          {snapshot.attachments.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="text-xs text-zinc-700">
              {t(`studio.aiHome.attach.${item.kind}` as never)} · {item.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
