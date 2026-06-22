"use client";

import { useActiveTranslator } from "@/i18n/client";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  imageUrl: string;
  selectedObject: EditorInstructionObjectV2 | null;
  onImageLoad?: () => void;
};

export function EditorInstructionPreviewHighlight({
  document,
  imageUrl,
  selectedObject,
  onImageLoad,
}: Props) {
  const t = useActiveTranslator();
  const bounds = selectedObject
    ? resolveInstructionObjectBounds(selectedObject, document)
    : null;

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/15 bg-zinc-900/20 shadow-inner"
      data-testid="instruction-preview-highlight"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-contain"
        onLoad={() => onImageLoad?.()}
      />
      {bounds && selectedObject ?
        <>
          <div
            className="pointer-events-none absolute rounded-md border border-[#006D52]/50"
            style={{
              left: `${bounds.x * 100}%`,
              top: `${bounds.y * 100}%`,
              width: `${bounds.width * 100}%`,
              height: `${bounds.height * 100}%`,
              backgroundColor: "rgba(0, 109, 82, 0.18)",
              boxShadow:
                "inset 0 0 0 2px rgba(255,255,255,0.55), 0 0 0 1px rgba(0,109,82,0.65), 0 0 14px rgba(0,109,82,0.22)",
            }}
          />
          <div
            className="pointer-events-none absolute z-10 flex max-w-[85%] flex-wrap items-center gap-1"
            style={{
              left: `${bounds.x * 100}%`,
              top: `${Math.max(0, bounds.y * 100 - 4)}%`,
            }}
          >
            <span className="rounded-md border border-white/40 bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {selectedObject.label}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                bounds.exact
                  ? "border-emerald-200/60 bg-emerald-950/55 text-emerald-50"
                  : "border-amber-200/60 bg-amber-950/55 text-amber-50"
              }`}
            >
              {bounds.exact
                ? t("editor.instructionStudio.v2.highlight.exactZone" as never)
                : t("editor.instructionStudio.v2.highlight.estimatedZone" as never)}
            </span>
          </div>
        </>
      : null}
    </div>
  );
}
