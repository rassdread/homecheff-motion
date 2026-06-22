"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildFusionWizardCreditPreview } from "@/lib/editor-fusion-wizard-credits";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

type Props = {
  intake: EditorReferenceIntakeState;
  combineIntent: EditorFusionIntent;
  isAdmin?: boolean;
};

export function EditorFusionWizardCreditsPanel({ intake, combineIntent, isAdmin }: Props) {
  const t = useActiveTranslator();
  const preview = useMemo(
    () => buildFusionWizardCreditPreview({ intake, isAdmin }),
    [intake, isAdmin]
  );

  if (!preview) {
    return null;
  }

  return (
    <section
      className={`space-y-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm ${studioVisual.editorSurface}`}
      data-testid="fusion-wizard-credits-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.fusionWizard.credits.title" as never)}
      </p>

      <div className="space-y-1 text-xs text-zinc-700">
        <p className="font-semibold text-zinc-900">{t("editor.fusionWizard.credits.analysis" as never)}</p>
        {preview.photos.map((photo) => (
          <p key={photo.instanceId}>
            {photo.label}:{" "}
            {photo.cached
              ? t("editor.fusionWizard.credits.analysisCached" as never)
              : t("editor.fusionWizard.credits.analysisNeeded" as never, {
                  credits: photo.credits,
                } as never)}
          </p>
        ))}
      </div>

      <div className="space-y-1 text-xs text-zinc-700">
        <p className="font-semibold text-zinc-900">{t("editor.fusionWizard.credits.render" as never)}</p>
        <p>
          {t(combineIntentOption(combineIntent).labelKey as never)} —{" "}
          {preview.adminFree
            ? t("editor.fusionWizard.credits.adminFree" as never)
            : t("editor.fusionWizard.credits.renderAmount" as never, {
                credits: preview.renderCredits,
              } as never)}
        </p>
      </div>

      <p className="border-t border-zinc-100 pt-2 text-sm font-semibold text-zinc-900">
        {preview.adminFree
          ? t("editor.fusionWizard.credits.adminTotal" as never)
          : t("editor.fusionWizard.credits.total" as never, { credits: preview.totalCredits } as never)}
      </p>
    </section>
  );
}
