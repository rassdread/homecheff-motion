"use client";

import { useActiveTranslator } from "@/i18n/client";
import { categoryLabelKey } from "@/lib/editor-instruction-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";

type Props = {
  objects: EditorInstructionObjectV2[];
  selectedObjectId: string | null;
  expandedObjectId: string | null;
  onSelect: (object: EditorInstructionObjectV2) => void;
  onToggleExpand: (objectId: string) => void;
  lowConfidence?: boolean;
};

export function EditorInstructionObjectList({
  objects,
  selectedObjectId,
  expandedObjectId,
  onSelect,
  onToggleExpand,
  lowConfidence,
}: Props) {
  const t = useActiveTranslator();

  return (
    <section className={`p-3 ${studioVisual.editorSurface}`} data-testid="instruction-object-list">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
        {t("editor.instructionStudio.v2.workspace.detectedObjects" as never)}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {objects.map((obj) => {
          const selected = obj.id === selectedObjectId;
          const expanded = obj.id === expandedObjectId;
          return (
            <li key={obj.id}>
              <button
                type="button"
                data-testid={`object-card-${obj.id}`}
                data-selected={selected ? "true" : "false"}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                  selected
                    ? "border-[#006D52]/45 bg-[#006D52]/8 shadow-[0_0_12px_rgba(0,109,82,0.12)]"
                    : "border-zinc-200/90 bg-white/80 hover:border-[#0067B1]/25 hover:bg-white"
                }`}
                onClick={() => {
                  onSelect(obj);
                  onToggleExpand(obj.id);
                }}
              >
                <span
                  className="mt-0.5 shrink-0 text-xs text-zinc-500"
                  aria-hidden
                >
                  {expanded ? "▼" : "▶"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">{obj.label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    {t(categoryLabelKey(obj.category) as never)}
                    {obj.confidence < 0.6
                      ? ` · ${t("editor.instructionStudio.v2.highlight.estimated" as never)}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {lowConfidence ?
        <p className="mt-2 text-[11px] text-amber-800">
          {t("editor.instructionStudio.v2.objectFeed.lowConfidenceNotice" as never)}
        </p>
      : null}
    </section>
  );
}
