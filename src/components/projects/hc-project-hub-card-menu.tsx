"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  isArchived?: boolean;
  onRename: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
};

export function HcProjectHubCardMenu({
  isArchived = false,
  onRename,
  onDownload,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const item = (key: string, label: string, action: () => void) => (
    <button
      key={key}
      type="button"
      className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100"
      onClick={() => {
        action();
        setOpen(false);
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} className="relative" data-testid="hc-project-hub-card-menu">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("hcProject.hub.menu.more" as never)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:border-[#0067B1]/30"
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {open ?
        <div
          className={`absolute right-0 z-40 mt-2 w-52 border border-zinc-200/90 p-2 shadow-xl ${studioVisual.editorSurface}`}
        >
          {item("rename", t("hcProject.hub.menu.rename" as never), onRename)}
          {item("download", t("hcProject.hub.menu.download" as never), onDownload)}
          {item("duplicate", t("hcProject.hub.menu.duplicate" as never), onDuplicate)}
          {isArchived ?
            <>
              {item("restore", t("hcProject.hub.menu.restore" as never), onRestore)}
              {item("delete", t("hcProject.hub.menu.deletePermanently" as never), onDelete)}
            </>
          : <>
              {item("archive", t("hcProject.hub.menu.archive" as never), onArchive)}
              {item("delete", t("hcProject.hub.menu.delete" as never), onDelete)}
            </>
          }
        </div>
      : null}
    </div>
  );
}
