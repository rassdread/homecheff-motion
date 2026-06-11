"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { createPrintExportRecord } from "@/lib/editor-instruction-print-export";
import {
  EDITOR_AI_ENHANCEMENTS,
  EDITOR_EXPORT_TARGET_CATEGORIES,
  EDITOR_PRINT_FORMAT_PRESETS,
  EDITOR_UPSCALE_MODES,
  computeMaxSafePrintSize,
  evaluateExportReadiness,
  evaluatePrintReadiness,
  exportTargetsForCategory,
  printFormatLabelKey,
  resolveExportSourceUrl,
  upscaleModeLabelKey,
  type EditorAiEnhancement,
  type EditorExportTargetCategory,
  type EditorUpscaleMode,
} from "@/lib/editor-export-workflow";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorInstructionPrintPreset } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

const DEFAULT_SOURCE_W = 1200;
const DEFAULT_SOURCE_H = 900;

export function EditorExportWorkspace({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const [category, setCategory] = useState<EditorExportTargetCategory>("print");
  const [selectedId, setSelectedId] = useState("a4");
  const [printFormat, setPrintFormat] = useState<EditorInstructionPrintPreset>("a4");
  const [upscaleMode, setUpscaleMode] = useState<EditorUpscaleMode>("safe");
  const [enhancements, setEnhancements] = useState<EditorAiEnhancement[]>(["upscale"]);

  const approved = activeApprovedVariant(document);
  const sourceUrl = resolveExportSourceUrl(document);
  const categoryTargets = exportTargetsForCategory(category);
  const target = categoryTargets.find((e) => e.id === selectedId) ?? categoryTargets[0]!;

  const printReadiness = useMemo(
    () =>
      evaluatePrintReadiness({
        preset: printFormat,
        sourceWidthPx: DEFAULT_SOURCE_W,
        sourceHeightPx: DEFAULT_SOURCE_H,
      }),
    [printFormat]
  );

  const quality = useMemo(
    () => evaluateExportReadiness(document, target, DEFAULT_SOURCE_W, DEFAULT_SOURCE_H),
    [document, selectedId, category]
  );

  const maxSafePrint = useMemo(
    () => computeMaxSafePrintSize(DEFAULT_SOURCE_W, DEFAULT_SOURCE_H),
    []
  );

  const toggleEnhancement = (id: EditorAiEnhancement) => {
    setEnhancements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (!approved?.resultUrl && !document.backgroundUrl) {
      return;
    }
    const record = createPrintExportRecord({
      variantId: approved?.id ?? "original",
      preset: printFormat,
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
    <div className={`space-y-5 p-4 ${studioVisual.editorSurface}`} data-testid="editor-export-workspace">
      <div>
        <h2 className="text-base font-bold text-zinc-900">
          {t("editor.v3.export.title" as never)}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("editor.v3.export.lead" as never)}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.v3.export.targetCategory" as never)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EDITOR_EXPORT_TARGET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              data-export-category={cat}
              onClick={() => {
                setCategory(cat);
                const first = exportTargetsForCategory(cat)[0];
                if (first) {
                  setSelectedId(first.id);
                }
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === cat ?
                  "bg-[#0067B1] text-white"
                : "border border-zinc-300 bg-white text-zinc-800"
              }`}
            >
              {t(`editor.v3.export.category.${cat}` as never)}
            </button>
          ))}
        </div>
      </div>

      {category !== "print" ?
        <div className="flex flex-wrap gap-2">
          {categoryTargets.map((item) => (
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
      : null}

      {category === "print" ?
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("editor.v3.export.printFormat" as never)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDITOR_PRINT_FORMAT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  data-print-format={preset}
                  onClick={() => setPrintFormat(preset)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    printFormat === preset ?
                      "bg-[#0067B1] text-white"
                    : "border border-zinc-300 bg-white text-zinc-800"
                  }`}
                >
                  {t(printFormatLabelKey(preset) as never)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
            data-testid="print-readiness-panel"
          >
            <p className="font-semibold">{t("editor.v3.export.printReadiness" as never)}</p>
            <p className="mt-1">
              {t("editor.workflow.export.qualityScore" as never)}: {printReadiness.printSuitabilityScore}
            </p>
            <p className="mt-1">
              {t("editor.v3.export.resolution" as never)}: {printReadiness.widthPx}×{printReadiness.heightPx}px ·{" "}
              {printReadiness.dpi} DPI
            </p>
            <p className="mt-1">
              {t("editor.v3.export.logoQuality" as never)}: {printReadiness.logoQualityScore}
            </p>
            <p className="mt-1">
              {t("editor.v3.export.textReadability" as never)}: {printReadiness.textReadabilityScore}
            </p>
            {printReadiness.warnings.map((key) => (
              <p key={key} className="mt-1 text-amber-800">
                {t(key as never)}
              </p>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("editor.v3.export.upscaleMode" as never)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDITOR_UPSCALE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-upscale-mode={mode}
                  onClick={() => setUpscaleMode(mode)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs ${
                    upscaleMode === mode ?
                      "border-[#0067B1] bg-[#0067B1]/5"
                    : "border-zinc-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold text-zinc-900">
                    {t(upscaleModeLabelKey(mode) as never)}
                  </span>
                  <span className="mt-0.5 block text-zinc-600">
                    {t(`${upscaleModeLabelKey(mode)}Hint` as never)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            data-testid="max-safe-print-size"
          >
            <p className="font-semibold">{t("editor.v3.export.maxSafePrintSize" as never)}</p>
            <p className="mt-1">
              {t("editor.v3.export.withoutUpscale" as never)}:{" "}
              {t(printFormatLabelKey(maxSafePrint.withoutUpscale) as never)}
            </p>
            <p className="mt-1">
              {t("editor.v3.export.withSafeUpscale" as never)}:{" "}
              {t(printFormatLabelKey(maxSafePrint.withSafeUpscale) as never)}
            </p>
            <p className="mt-1">
              {t("editor.v3.export.withPremiumUpscale" as never)}:{" "}
              {t(printFormatLabelKey(maxSafePrint.withPremiumUpscale) as never)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("editor.v3.export.aiEnhancements" as never)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDITOR_AI_ENHANCEMENTS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-enhancement={id}
                  onClick={() => toggleEnhancement(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    enhancements.includes(id) ?
                      "bg-emerald-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800"
                  }`}
                >
                  {t(`editor.v3.export.enhancement.${id}` as never)}
                </button>
              ))}
            </div>
          </div>
        </>
      : null}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <p>
          {t("editor.workflow.export.source" as never)}:{" "}
          {approved ? t("editor.workflow.export.approvedVariant" as never) : t("editor.workflow.export.original" as never)}
        </p>
        <p className="mt-1">
          {t("editor.workflow.export.qualityScore" as never)}: {quality.qualityScore}
        </p>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
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
