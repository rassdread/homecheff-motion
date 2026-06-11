"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { editorProjectHasUnsavedVisualChanges } from "@/lib/editor-project-model";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  saving?: boolean;
  onSave: () => void;
  onClose: () => void;
  onProjects: () => void;
};

export function EditorProjectTopBar({
  document,
  saving = false,
  onSave,
  onClose,
  onProjects,
}: Props) {
  const t = useActiveTranslator();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const approved = activeApprovedVariant(document);
  const unsaved = editorProjectHasUnsavedVisualChanges(document);
  const lastSaved = document.updatedAt ?
    new Date(document.updatedAt).toLocaleString()
  : t("editor.project.topBar.notSaved" as never);

  const requestClose = () => {
    if (unsaved) {
      setShowCloseDialog(true);
      return;
    }
    onClose();
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${studioVisual.editorSurface}`}>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-zinc-900">{document.name}</h1>
        <p className="text-xs text-zinc-500">
          {t("editor.project.topBar.lastSaved" as never)}: {lastSaved}
        </p>
        <p className="text-xs text-zinc-500">
          {t("editor.project.topBar.status" as never)}:{" "}
          {document.status === "draft_saved" ?
            t("editor.project.topBar.statusSaved" as never)
          : t("editor.project.topBar.statusDraft" as never)}
          {" · "}
          {t("editor.project.topBar.activeVariant" as never)}:{" "}
          {approved ?
            t("editor.project.topBar.variantApproved" as never)
          : t("editor.project.topBar.variantOriginal" as never)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className={`min-h-9 px-4 py-1.5 text-xs disabled:opacity-50 ${studioVisual.btnGradientPrimary}`}
        >
          {saving ?
            t("editor.project.topBar.saving" as never)
          : t("editor.project.topBar.save" as never)}
        </button>
        <button
          type="button"
          onClick={onProjects}
          className={`min-h-9 px-4 py-1.5 text-xs ${studioVisual.btnOutline} !text-zinc-800 !border-zinc-300 !bg-white/90`}
        >
          {t("editor.project.topBar.projects" as never)}
        </button>
        <button
          type="button"
          onClick={requestClose}
          className={`min-h-9 px-4 py-1.5 text-xs ${studioVisual.btnOutline} !text-zinc-800 !border-zinc-300 !bg-white/90`}
        >
          {t("editor.project.topBar.close" as never)}
        </button>
      </div>

      {showCloseDialog ?
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`w-full max-w-md p-5 shadow-lg ${studioVisual.cardElevated}`}>
            <h2 className="text-base font-bold text-zinc-900">
              {t("editor.project.close.title" as never)}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t("editor.project.close.unsavedMessage" as never)}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseDialog(false)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
              >
                {t("editor.project.close.cancel" as never)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseDialog(false);
                  onClose();
                }}
                className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800"
              >
                {t("editor.project.close.discard" as never)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseDialog(false);
                  onSave();
                  onClose();
                }}
                className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white"
              >
                {t("editor.project.close.saveDraft" as never)}
              </button>
            </div>
          </div>
        </div>
      : null}
    </div>
  );
}
