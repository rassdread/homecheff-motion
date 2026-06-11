"use client";

import { useActiveTranslator } from "@/i18n/client";
import { variantApprovalStatus } from "@/lib/editor-instruction-approval";
import { buildInstructionLineageTree } from "@/lib/editor-instruction-lineage";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorInstructionVariant } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  variants: EditorInstructionVariant[];
  previewVariantId: string | null;
  compareVariantIds: string[];
  onPreview: (variantId: string) => void;
  onToggleCompare: (variantId: string) => void;
  onRename: (variantId: string, name: string) => void;
  onDelete: (variantId: string) => void;
  onNote: (variantId: string, note: string) => void;
};

export function EditorInstructionComparisonCenter({
  document,
  variants,
  previewVariantId,
  compareVariantIds,
  onPreview,
  onToggleCompare,
  onRename,
  onDelete,
  onNote,
}: Props) {
  const t = useActiveTranslator();
  const lineage = buildInstructionLineageTree(document);
  const completed = variants.filter((v) => v.status === "completed" && v.resultUrl);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          {t("editor.instructionStudio.v2.comparison.title" as never)}
        </h2>
        <span className="text-xs text-zinc-500">
          {t("editor.instructionStudio.v2.comparison.count" as never, {
            count: String(completed.length),
          })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          className={`rounded-xl border p-2 text-left ${
            !previewVariantId ? "border-[#0067B1] bg-[#0067B1]/5" : "border-zinc-200"
          }`}
          onClick={() => onPreview("")}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.instructionStudio.originalLabel" as never)}
          </p>
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={document.backgroundUrl} alt="" className="h-full w-full object-contain" />
          </div>
        </button>

        {completed.map((variant) => {
          const selected = previewVariantId === variant.id;
          const comparing = compareVariantIds.includes(variant.id);
          return (
            <div
              key={variant.id}
              className={`rounded-xl border p-2 ${
                selected ? "border-[#0067B1] bg-[#0067B1]/5" : "border-zinc-200"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <input
                  className="w-full rounded border border-transparent bg-transparent text-xs font-semibold text-slate-800 hover:border-zinc-200 focus:border-[#0067B1] focus:outline-none"
                  defaultValue={variant.name ?? variant.instruction.objectLabel}
                  onBlur={(e) => onRename(variant.id, e.target.value)}
                />
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600">
                  {t(`editor.instructionStudio.v2.approval.${variantApprovalStatus(variant)}` as never)}
                </span>
              </div>
              <button type="button" className="w-full" onClick={() => onPreview(variant.id)}>
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={variant.resultUrl} alt="" className="h-full w-full object-contain" />
                </div>
              </button>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                    comparing ? "bg-violet-100 text-violet-800" : "bg-zinc-100 text-zinc-700"
                  }`}
                  onClick={() => onToggleCompare(variant.id)}
                >
                  {t("editor.instructionStudio.v2.comparison.compare" as never)}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700"
                  onClick={() => onDelete(variant.id)}
                >
                  {t("editor.instructionStudio.v2.comparison.delete" as never)}
                </button>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600"
                placeholder={t("editor.instructionStudio.v2.comparison.notePlaceholder" as never)}
                defaultValue={variant.userNote ?? ""}
                onBlur={(e) => onNote(variant.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <details className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
          {t("editor.instructionStudio.v2.lineage.title" as never)}
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          <li>• {lineage.label}</li>
          {lineage.children.map((child) => (
            <li key={child.id} className="pl-4">
              └ {child.label}
              {child.children.map((grand) => (
                <div key={grand.id} className="pl-4">
                  └ {grand.label}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
