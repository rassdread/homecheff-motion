"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  buildEditorVisionSummary,
  buildEditorVisionSummaryLegacyDebug,
} from "@/lib/editor-vision-summary";
import { localizeVisionPartLabel } from "@/lib/editor-vision-part-display-label";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  showDebug?: boolean;
};

export function EditorVisionSummaryPanel({ document, showDebug = false }: Props) {
  const t = useActiveTranslator();
  const summary = buildEditorVisionSummary(document);
  const legacyDebug = showDebug ? buildEditorVisionSummaryLegacyDebug(document) : null;

  const hasDetected = summary.detectedLabels.length > 0;
  const hasEstimated = summary.estimatedLabels.length > 0;
  const hasContent = hasDetected || hasEstimated;

  return (
    <section
      className="rounded-2xl border border-white/20 bg-[#003d6b]/60 px-5 py-4 text-white shadow-sm backdrop-blur-sm"
      aria-label={t("editor.visionSummary.title" as never)}
      data-testid="editor-vision-summary-panel"
    >
      {hasDetected ?
        <>
          <p className="text-sm font-semibold text-white">
            {t("editor.visionSummary.title" as never)}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/90">
            {summary.detectedLabels.map((label) => (
              <li key={label}>{localizeVisionPartLabel(label, t)}</li>
            ))}
          </ul>
        </>
      : summary.hasTruthSource ?
        <>
          <p className="text-sm font-semibold text-white">
            {t("editor.visionSummary.title" as never)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {t("editor.visionSummary.noDetected" as never)}
          </p>
        </>
      : null}

      {hasEstimated ?
        <>
          <p className={`text-sm font-semibold text-white ${hasDetected ? "mt-4" : ""}`}>
            {t("editor.visionSummary.estimatedTitle" as never)}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/75">
            {summary.estimatedLabels.map((label) => (
              <li key={label}>{localizeVisionPartLabel(label, t)}</li>
            ))}
          </ul>
        </>
      : null}

      {!hasContent && !summary.hasTruthSource ?
        <p className="text-sm leading-relaxed text-white/75">
          {t("editor.visionSummary.pendingAnalysis" as never)}
        </p>
      : null}

      {hasDetected || summary.hasTruthSource ?
        <>
          <p className="mt-4 text-sm font-semibold text-white">
            {t("editor.visionSummary.actionsTitle" as never)}
          </p>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-white/80">
            {summary.actionKeys.map((key) => (
              <li key={key}>{t(key as never)}</li>
            ))}
          </ul>
        </>
      : null}

      {summary.lowConfidence && summary.hasTruthSource ?
        <p className="mt-4 rounded-xl border border-amber-200/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-50">
          {t("editor.visionSummary.lowConfidence" as never)}
        </p>
      : null}

      {legacyDebug ?
        <details className="mt-4 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">
          <summary className="cursor-pointer font-medium text-white/85">
            {t("editor.visionSummary.debugRawLayers" as never)}
          </summary>
          <ul className="mt-2 space-y-1 pl-1">
            {legacyDebug.itemKeys.map((key) => (
              <li key={key}>{t(key as never)}</li>
            ))}
          </ul>
        </details>
      : null}
    </section>
  );
}
