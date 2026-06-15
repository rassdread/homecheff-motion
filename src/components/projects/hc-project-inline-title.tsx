"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  title: string;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onSave: (title: string) => void;
  className?: string;
};

export function HcProjectInlineTitle({
  title,
  editing = false,
  onEditingChange,
  onSave,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(title);
    }
  }, [editing, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancel = () => {
    setDraft(title);
    onEditingChange?.(false);
  };

  const save = () => {
    const next = draft.trim();
    if (!next) {
      return;
    }
    onSave(next);
    onEditingChange?.(false);
  };

  if (editing) {
    return (
      <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className}`} data-testid="hc-project-inline-title-edit">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-[#0067B1]/40 px-3 py-1.5 text-sm font-semibold text-zinc-900"
          aria-label={t("hcProject.card.renameLabel" as never)}
        />
        <button
          type="button"
          className={`${studioVisual.btnGradientPrimary} px-3 py-1.5 text-xs`}
          data-testid="hc-project-inline-title-save"
          onClick={save}
          disabled={!draft.trim()}
        >
          {t("hcProject.card.save" as never)}
        </button>
        <button
          type="button"
          className={`${studioVisual.btnOutline} px-3 py-1.5 text-xs`}
          data-testid="hc-project-inline-title-cancel"
          onClick={cancel}
        >
          {t("hcProject.card.cancel" as never)}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`} data-testid="hc-project-inline-title">
      <h3 className="truncate text-sm font-bold text-zinc-900">{title}</h3>
      <button
        type="button"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-600 hover:border-[#0067B1]/30 hover:text-[#0067B1]"
        aria-label={t("hcProject.card.renameLabel" as never)}
        data-testid="hc-project-inline-title-edit-button"
        onClick={() => onEditingChange?.(true)}
      >
        ✏️
      </button>
    </div>
  );
}
