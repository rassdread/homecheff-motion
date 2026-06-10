"use client";

import { useActiveTranslator } from "@/i18n/client";
import { defaultHomeCheffBrandKit, insertBrandKitItemOnCanvas } from "@/lib/editor-v6-brand-kit";
import type { EditorBrandKitItem, EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorBrandKitPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const items = defaultHomeCheffBrandKit();

  const handleInsert = (item: EditorBrandKitItem) => {
    onDocumentChange(insertBrandKitItemOnCanvas(document, item));
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{t("editor.v6.brandKit.title" as never)}</p>
      <p className="mt-1 text-xs text-zinc-600">{t("editor.v6.brandKit.lead" as never)}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleInsert(item)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2 text-left hover:border-[#006D52]/40 hover:bg-[#006D52]/5"
          >
            {item.kind === "color" || item.kind === "gradient" ?
              <span
                className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200"
                style={{ background: item.value }}
              />
            : item.previewUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-xs">Aa</span>}
            <span className="text-sm font-medium text-slate-900">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
