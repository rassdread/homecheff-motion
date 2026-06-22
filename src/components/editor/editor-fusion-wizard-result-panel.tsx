"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  resultUrl: string;
  creditsUsed: number;
  analysisReused: boolean;
  adminFree?: boolean;
  onDownload: () => void;
  onMakeAnother: () => void;
  onOpenEditor?: () => void;
};

export function EditorFusionWizardResultPanel({
  resultUrl,
  creditsUsed,
  analysisReused,
  adminFree,
  onDownload,
  onMakeAnother,
  onOpenEditor,
}: Props) {
  const t = useActiveTranslator();

  return (
    <section
      className={`space-y-4 rounded-2xl border border-zinc-200 p-4 ${studioVisual.editorSurface}`}
      data-testid="fusion-wizard-result"
    >
      <div>
        <h2 className="text-sm font-bold text-zinc-900">{t("editor.fusionWizard.result.title" as never)}</h2>
        <p className="mt-1 text-xs text-zinc-600">{t("editor.fusionWizard.result.lead" as never)}</p>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resultUrl}
        alt=""
        className="max-h-[420px] w-full rounded-xl object-contain bg-zinc-50"
        data-testid="fusion-wizard-result-image"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9a]"
        >
          {t("editor.fusionWizard.result.download" as never)}
        </button>
        <button
          type="button"
          onClick={onMakeAnother}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          {t("editor.fusionWizard.result.makeAnother" as never)}
        </button>
        {onOpenEditor ?
          <button
            type="button"
            onClick={onOpenEditor}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            data-testid="fusion-wizard-open-editor"
          >
            {t("editor.fusionWizard.result.openEditor" as never)}
          </button>
        : null}
      </div>

      <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700">
        {adminFree
          ? t("editor.fusionWizard.result.creditsAdmin" as never)
          : t("editor.fusionWizard.result.creditsUsed" as never, { credits: creditsUsed } as never)}
        {analysisReused ?
          <p className="mt-1">{t("editor.fusionWizard.result.analysisReused" as never)}</p>
        : null}
      </div>
    </section>
  );
}
