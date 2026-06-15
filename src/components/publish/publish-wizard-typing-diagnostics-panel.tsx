"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import {
  getPublishWizardTypingDiagnostics,
  resetPublishWizardTypingDiagnostics,
  subscribePublishWizardTypingDiagnostics,
  type PublishWizardTypingDiagnostics,
} from "@/lib/publish-wizard-typing-diagnostics";

export function PublishWizardTypingDiagnosticsPanel() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAdmin = session.user?.role === "admin";
  const [metrics, setMetrics] = useState<PublishWizardTypingDiagnostics>(() =>
    getPublishWizardTypingDiagnostics()
  );

  useEffect(() => {
    if (!isAdmin) return;
    return subscribePublishWizardTypingDiagnostics(() => {
      setMetrics(getPublishWizardTypingDiagnostics());
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  return (
    <details
      className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/90 p-3 text-xs text-zinc-700"
      data-testid="publish-wizard-typing-diagnostics"
    >
      <summary className="cursor-pointer font-semibold text-zinc-800">
        {t("publish.wizard.typingDiagnostics.title" as never)}
      </summary>
      <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <dt>{t("publish.wizard.typingDiagnostics.typingStarted" as never)}</dt>
          <dd className="font-mono font-semibold">{metrics.typingStarted}</dd>
        </div>
        <div>
          <dt>{t("publish.wizard.typingDiagnostics.autosaveTriggered" as never)}</dt>
          <dd className="font-mono font-semibold">{metrics.autosaveTriggered}</dd>
        </div>
        <div>
          <dt>{t("publish.wizard.typingDiagnostics.rerenderCount" as never)}</dt>
          <dd className="font-mono font-semibold">{metrics.rerenderCount}</dd>
        </div>
        <div>
          <dt>{t("publish.wizard.typingDiagnostics.remountCount" as never)}</dt>
          <dd className="font-mono font-semibold">{metrics.remountCount}</dd>
        </div>
        <div>
          <dt>{t("publish.wizard.typingDiagnostics.scrollDelta" as never)}</dt>
          <dd className="font-mono font-semibold">{metrics.scrollDelta}px</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={resetPublishWizardTypingDiagnostics}
        className="mt-2 rounded-full border border-zinc-300 px-3 py-1 text-[10px] font-semibold text-zinc-600"
      >
        {t("publish.wizard.typingDiagnostics.reset" as never)}
      </button>
    </details>
  );
}
