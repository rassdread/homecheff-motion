"use client";

import { useActiveTranslator } from "@/i18n/client";
import { auditEditorPlacements, editorPlacementQaSummaryKey } from "@/lib/editor-placement-qa";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorPlacementQaPanel({ document }: Props) {
  const t = useActiveTranslator();
  const qa = auditEditorPlacements(document);

  if (document.placements.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.placement.qa.title")}
      </p>
      <p className="mt-1 text-sm text-zinc-700">{t(editorPlacementQaSummaryKey(qa) as never)}</p>
      <ul className="mt-3 space-y-2">
        {qa.items.map((item) => (
          <li
            key={item.placementId}
            className={`rounded-lg px-3 py-2 text-xs ${
              item.status === "pass"
                ? "bg-emerald-50 text-emerald-900"
                : item.status === "warning"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-900"
            }`}
          >
            <span className="font-semibold">{item.label}</span>
            <span className="mt-0.5 block">{t(item.messageKey as never)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
