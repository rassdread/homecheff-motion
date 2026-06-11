"use client";

import { useActiveTranslator } from "@/i18n/client";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  imageUrl: string;
  selectedObject: EditorInstructionObjectV2 | null;
};

export function EditorInstructionPreviewHighlight({
  document,
  imageUrl,
  selectedObject,
}: Props) {
  const t = useActiveTranslator();
  const bounds = selectedObject
    ? resolveInstructionObjectBounds(selectedObject, document)
    : null;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-full w-full object-contain" />
      {bounds && selectedObject ?
        <>
          <div
            className="pointer-events-none absolute rounded-lg border-2 border-[#0067B1]/80 bg-[#0067B1]/15"
            style={{
              left: `${bounds.x * 100}%`,
              top: `${bounds.y * 100}%`,
              width: `${bounds.width * 100}%`,
              height: `${bounds.height * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute z-10 flex max-w-[80%] flex-wrap items-center gap-1"
            style={{
              left: `${bounds.x * 100}%`,
              top: `${Math.max(0, bounds.y * 100 - 5)}%`,
            }}
          >
            <span className="rounded-md bg-[#0067B1] px-2 py-0.5 text-[11px] font-semibold text-white shadow">
              {selectedObject.label}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium shadow ${
                bounds.exact ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
              }`}
            >
              {bounds.exact
                ? t("editor.instructionStudio.v2.highlight.exact" as never)
                : t("editor.instructionStudio.v2.highlight.estimated" as never)}
            </span>
          </div>
        </>
      : null}
    </div>
  );
}
