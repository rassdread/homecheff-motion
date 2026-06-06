"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";

export type WorkspaceAssetPickerItem = {
  id: string;
  name: string;
  meta?: string;
  thumbUrl?: string;
};

type Props = {
  open: boolean;
  title: string;
  items: WorkspaceAssetPickerItem[];
  linkedIds?: Set<string>;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function StudioWorkspaceAssetPicker({
  open,
  title,
  items,
  linkedIds,
  onClose,
  onSelect,
}: Props) {
  const t = useActiveTranslator();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, query]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("studio.mediaAsset.close")}
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-0 z-[60] max-h-[80vh] overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(80vh,640px)] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            {t("studio.mediaAsset.close")}
          </button>
        </div>
        <div className="border-b border-zinc-100 px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("studio.workspace.assets.searchPlaceholder")}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2 sm:max-h-[420px]">
          {filtered.map((item) => {
            const linked = linkedIds?.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={linked}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60"
                >
                  {item.thumbUrl ?
                    <img
                      src={item.thumbUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-600">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  }
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">{item.name}</span>
                    {item.meta ?
                      <span className="block truncate text-xs text-zinc-500">{item.meta}</span>
                    : null}
                  </span>
                  {linked ?
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#006D52]">
                      {t("studio.workspace.assets.linkedBadge")}
                    </span>
                  : null}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ?
            <li className="px-3 py-8 text-center text-sm text-zinc-500">
              {items.length === 0
                ? t("studio.workspace.assets.libraryEmpty")
                : t("studio.workspace.assets.noSearchResults")}
            </li>
          : null}
        </ul>
      </aside>
    </>
  );
}
