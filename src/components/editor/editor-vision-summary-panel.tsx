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
      className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-3"
      aria-label={t("editor.visionSummary.title" as never)}
    >
      <p className="text-sm font-semibold text-slate-900">
        {t("editor.visionSummary.title" as never)}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {summary.itemKeys.map((key) => (
          <li key={key}>• {t(key as never)}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        {t("editor.visionSummary.actionsTitle" as never)}
      </p>
      <ul className="mt-1 space-y-1 text-sm text-slate-600">
        {summary.actionKeys.map((key) => (
          <li key={key}>• {t(key as never)}</li>
        ))}
      </ul>
      {summary.lowConfidence ?
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("editor.visionSummary.lowConfidence" as never)}
        </p>
      : null}
    </section>
  );
}
