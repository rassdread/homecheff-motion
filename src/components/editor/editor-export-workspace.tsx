"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { createPrintExportRecord } from "@/lib/editor-instruction-print-export";
import {
  EDITOR_EXPORT_TARGETS,
  evaluateExportReadiness,
  resolveExportSourceUrl,
} from "@/lib/editor-export-workflow";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorExportWorkspace({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const [selectedId, setSelectedId] = useState(EDITOR_EXPORT_TARGETS[0]!.id);
  const approved = activeApprovedVariant(document);
  const sourceUrl = resolveExportSourceUrl(document);
  const target = EDITOR_EXPORT_TARGETS.find((e) => e.id === selectedId) ?? EDITOR_EXPORT_TARGETS[0]!;
  const quality = useMemo(
    () => evaluateExportReadiness(document, target),
    [document, target]
  );

  const handleExport = () => {
    if (!approved?.resultUrl && !document.backgroundUrl) {
      return;
    }
    const record = createPrintExportRecord({
      variantId: approved?.id ?? "original",
      preset: target.printPreset ?? "a4",
      sourceWidthPx: quality.widthPx,
      sourceHeightPx: quality.heightPx,
      format: "png",
    });
    const variants = document.instructionVariants ?? [];
    const nextVariants = variants.map((v) =>
      v.id === approved?.id ?
        { ...v, printExports: [...(v.printExports ?? []), record] }
      : v
    );
    onDocumentChange({
      ...document,
      instructionVariants: nextVariants,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-base font-bold text-zinc-900">
          {t("editor.workflow.export.title" as never)}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t("editor.workflow.export.lead" as never)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EDITOR_EXPORT_TARGETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              selectedId === item.id ?
                "bg-[#0067B1] text-white"
              : "border border-zinc-300 bg-white text-zinc-800"
            }`}
          >
            {t(item.labelKey as never)}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <p>
          {t("editor.workflow.export.source" as never)}:{" "}
          {approved ? t("editor.workflow.export.approvedVariant" as never) : t("editor.workflow.export.original" as never)}
        </p>
        <p className="mt-1">
          {t("editor.workflow.export.qualityScore" as never)}: {quality.qualityScore}
        </p>
        <p className="mt-1">
          {quality.widthPx}×{quality.heightPx}px · {quality.dpi} DPI
        </p>
        {quality.warnings.map((key) => (
          <p key={key} className="mt-1 text-amber-800">
            {t(key as never)}
          </p>
        ))}
      </div>

      <img
        src={sourceUrl}
        alt=""
        className="max-h-48 rounded-lg border border-zinc-200 object-contain"
      />

      <button
        type="button"
        onClick={handleExport}
        className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white"
      >
        {t("editor.workflow.export.prepare" as never)}
      </button>
    </div>
  );
}
