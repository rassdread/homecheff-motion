"use client";

import { useMemo, useState } from "react";
import { StudioAssetSelectionCard } from "@/components/studio/studio-asset-selection-card";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";

type Props = {
  open: boolean;
  sources: AssetDerivationSourceListItem[];
  roleLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSelect: (source: AssetDerivationSourceListItem) => void;
};

export function StudioAssetLibraryModal({
  open,
  sources,
  roleLabel,
  loading,
  onClose,
  onSelect,
}: Props) {
  const t = useActiveTranslator();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "image">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((source) => {
      if (filter === "image" && !source.referenceImageUrl?.trim()) {
        return false;
      }
      if (!q) {
        return true;
      }
      return source.name.toLowerCase().includes(q);
    });
  }, [filter, query, sources]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      data-testid="studio-asset-library-modal"
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl ${studioVisual.editorSurface}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t("editor.start.libraryPicker" as never)}
            </h2>
            {roleLabel ?
              <p className="text-xs text-zinc-600">{roleLabel}</p>
            : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            {t("editor.start.closePicker" as never)}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-zinc-100 px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("editor.asset.search" as never)}
            className="min-h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "image")}
            className="min-h-10 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900"
          >
            <option value="all">{t("editor.asset.filterAll" as never)}</option>
            <option value="image">{t("editor.asset.filterImages" as never)}</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ?
            <p className="text-sm text-zinc-600">{t("editor.orbit.loading" as never)}</p>
          : filtered.length === 0 ?
            <p className="text-sm text-zinc-600">{t("editor.asset.empty" as never)}</p>
          : <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((source) => (
                <li key={`${source.assetId}-${source.name}`}>
                  <StudioAssetSelectionCard
                    title={source.name}
                    thumbnailUrl={source.thumbnailUrl || source.referenceImageUrl}
                    assetType={source.kind ?? "Image"}
                    originalFilename={source.name}
                    roleCompatibility={roleLabel}
                    onSelect={() => onSelect(source)}
                    selectLabel={t("editor.asset.select" as never)}
                  />
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
    </div>
  );
}
