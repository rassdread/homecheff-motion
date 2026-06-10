"use client";

import { useActiveTranslator } from "@/i18n/client";
import { composerHasSource, isDualComposerActive } from "@/lib/editor-dual-composer";
import { dropCutoutIntoTarget, type CutoutDragPayload } from "@/lib/editor-imported-layers";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onDragCutout?: (payload: CutoutDragPayload) => void;
};

export function EditorDualComposerPanel({ document, onDocumentChange, onDragCutout }: Props) {
  const t = useActiveTranslator();
  const active = isDualComposerActive(document);
  const composer = document.composerState;

  const handleDropToTarget = () => {
    if (!composer?.sourceImageUrl) {
      return;
    }
    const payload: CutoutDragPayload = {
      label: composer.sourceName ?? "Object",
      sourceImageUrl: composer.sourceImageUrl,
      sourceStorageKey: composer.sourceStorageKey,
      sourceAssetId: composer.sourceAssetId,
      dropPoint: { x: 0.5, y: 0.5 },
    };
    if (onDragCutout) {
      onDragCutout(payload);
    } else {
      onDocumentChange(dropCutoutIntoTarget(document, payload));
    }
  };

  const showPanel = document.workspaceMode === "compose" || active;
  if (!showPanel) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.v5.composer.source" as never)}</p>
        {composerHasSource(document) ?
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={composer!.sourceImageUrl}
              alt=""
              className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-zinc-50"
            />
            <p className="mt-2 text-sm font-medium">{composer!.sourceName}</p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-[#0067B1] px-3 py-2 text-sm font-medium text-white"
              onClick={handleDropToTarget}
            >
              {t("editor.v5.composer.dropToTarget" as never)}
            </button>
          </>
        : <p className="mt-2 text-sm text-zinc-500">{t("editor.v5.composer.noSource" as never)}</p>}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.v5.composer.target" as never)}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.backgroundUrl}
          alt=""
          className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-zinc-50"
        />
        <p className="mt-2 text-sm text-zinc-600">
          {(document.importedLayers?.length ?? 0) > 0
            ? t("editor.v5.composer.layerCount" as never, {
                count: String(document.importedLayers?.length ?? 0),
              })
            : t("editor.v5.composer.emptyTarget" as never)}
        </p>
      </div>
    </div>
  );
}
