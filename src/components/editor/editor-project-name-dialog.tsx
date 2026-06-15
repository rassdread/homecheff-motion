"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  open: boolean;
  initialName: string;
  required?: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

export function EditorProjectNameDialog({
  open,
  initialName,
  required = false,
  onCancel,
  onConfirm,
}: Props) {
  const t = useActiveTranslator();
  const [name, setName] = useState(initialName);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full max-w-md p-5 shadow-lg ${studioVisual.cardElevated}`} data-testid="editor-project-name-dialog">
        <h2 className="text-base font-bold text-zinc-900">
          {t("hcProject.nameDialog.title" as never)}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{t("hcProject.nameDialog.body" as never)}</p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("hcProject.nameDialog.label" as never)}
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          autoFocus
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {!required ?
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
            >
              {t("hcProject.nameDialog.later" as never)}
            </button>
          : null}
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim())}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {t("hcProject.nameDialog.save" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
