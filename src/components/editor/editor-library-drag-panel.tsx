"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  dropLibraryAssetOnCanvas,
  filterLibrarySourcesForDrag,
  librarySourceToDragPayload,
} from "@/lib/editor-v6-library-drag";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorLibraryDragPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAssetDerivationSources()
      .then((res) => {
        if (res.ok) {
          setSources(filterLibrarySourcesForDrag(res.data.sources));
        }
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDrop = (source: AssetDerivationSourceListItem) => {
    onDocumentChange(dropLibraryAssetOnCanvas(document, librarySourceToDragPayload(source)));
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{t("editor.v6.library.title" as never)}</p>
      <p className="mt-1 text-xs text-zinc-600">{t("editor.v6.library.lead" as never)}</p>
      {loading ?
        <p className="mt-3 text-sm text-zinc-500">{t("button.loading")}</p>
      : <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sources.slice(0, 12).map((source) => (
            <button
              key={source.assetId ?? source.name}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/x-homecheff-library-asset",
                  JSON.stringify(librarySourceToDragPayload(source))
                );
              }}
              onClick={() => handleDrop(source)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2 text-left hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source.thumbnailUrl || source.referenceImageUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="truncate text-sm font-medium text-slate-900">{source.name}</span>
            </button>
          ))}
        </div>}
    </div>
  );
}
