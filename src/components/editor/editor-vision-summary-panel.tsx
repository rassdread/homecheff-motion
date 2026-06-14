"use client";

import { useActiveTranslator } from "@/i18n/client";
import { buildEditorVisionSummary } from "@/lib/editor-vision-summary";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorVisionSummaryPanel({ document }: Props) {
  const t = useActiveTranslator();
  const summary = buildEditorVisionSummary(document);

  return (
    <section
      className="rounded-2xl border border-white/20 bg-[#003d6b]/60 px-5 py-4 text-white shadow-sm backdrop-blur-sm"
      aria-label={t("editor.visionSummary.title" as never)}
    >
      <p className="text-sm font-semibold text-white">
        {t("editor.visionSummary.title" as never)}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/90">
        {summary.itemKeys.map((key) => (
          <li key={key}>{t(key as never)}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-white">
        {t("editor.visionSummary.actionsTitle" as never)}
      </p>
      <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-white/80">
        {summary.actionKeys.map((key) => (
          <li key={key}>{t(key as never)}</li>
        ))}
      </ul>
      {summary.lowConfidence ?
        <p className="mt-4 rounded-xl border border-amber-200/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-50">
          {t("editor.visionSummary.lowConfidence" as never)}
        </p>
      : null}
    </section>
  );
}
