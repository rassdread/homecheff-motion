"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import { fetchUserVoiceLibrary } from "@/lib/studio-user-voice-library-client";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type AssetPickerCategory =
  | "characters"
  | "mascots"
  | "locations"
  | "props"
  | "worlds"
  | "images"
  | "generated"
  | "voice"
  | "music"
  | "sfx";

export type AssetPickerSelection = {
  id: string;
  name: string;
  category: AssetPickerCategory;
  url?: string;
  storageKey?: string;
  audioUrl?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AssetPickerSelection) => void;
  initialCategory?: AssetPickerCategory;
};

const CATEGORIES: AssetPickerCategory[] = [
  "characters",
  "mascots",
  "locations",
  "props",
  "worlds",
  "images",
  "generated",
  "voice",
  "music",
  "sfx",
];

export function HomeCheffAssetPickerModal({ open, onClose, onSelect, initialCategory = "images" }: Props) {
  const t = useActiveTranslator();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AssetPickerSelection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const next: AssetPickerSelection[] = [];
      if (category === "characters") {
        const res = await fetchStudioCharacters();
        if (res.ok) {
          for (const c of res.data.characters.filter((row) => !row.isMascot)) {
            next.push({
              id: c.id,
              name: c.name,
              category: "characters",
              url: c.referenceImageUrl || undefined,
            });
          }
        }
      } else if (category === "mascots") {
        const res = await fetchStudioCharacters();
        if (res.ok) {
          for (const c of res.data.characters.filter((row) => row.isMascot)) {
            next.push({
              id: c.id,
              name: c.name,
              category: "mascots",
              url: c.referenceImageUrl || undefined,
            });
          }
        }
      } else if (category === "locations") {
        const res = await fetchStudioLocations();
        if (res.ok) {
          for (const l of res.data.locations) {
            next.push({
              id: l.id,
              name: l.name,
              category: "locations",
              url: l.referenceImageUrl || undefined,
            });
          }
        }
      } else if (category === "props") {
        const res = await fetchStudioProps();
        if (res.ok) {
          for (const p of res.data.props) {
            next.push({
              id: p.id,
              name: p.name,
              category: "props",
              url: p.referenceImageUrl || undefined,
            });
          }
        }
      } else if (category === "worlds") {
        const res = await fetchStudioWorlds();
        if (res.ok) {
          for (const w of res.data.worlds) {
            next.push({ id: w.id, name: w.name, category: "worlds" });
          }
        }
      } else if (category === "voice") {
        try {
          const lib = await fetchUserVoiceLibrary();
          for (const v of lib.voices.filter((row) => row.status === "completed")) {
            next.push({
              id: v.cloneId,
              name: v.name,
              category: "voice",
              audioUrl: v.previewUrl,
              url: v.previewUrl,
            });
          }
        } catch {
          // empty list
        }
      } else if (category === "music" || category === "sfx") {
        const res = await fetchUserAudioLibraryApi();
        if (res.ok) {
          const kind = category === "music" ? "music" : "sfx";
          for (const a of res.data.assets.filter((row) => row.kind === kind)) {
            next.push({
              id: a.id,
              name: a.name,
              category,
              audioUrl: a.audioUrl,
              storageKey: a.storageKey,
            });
          }
        }
      } else {
        const res = await fetchAssetDerivationSources();
        if (res.ok) {
          for (const s of res.data.sources) {
            next.push({
              id: s.assetId,
              name: s.name,
              category: category === "generated" ? "generated" : "images",
              url: s.referenceImageUrl,
            });
          }
        }
      }
      if (!cancelled) {
        setItems(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      data-testid="homecheff-asset-picker"
      onClick={handleClose}
    >
      <div
        className={`flex max-h-[min(90vh,calc(100dvh-4rem))] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl ${studioVisual.editorSurface}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-bold text-zinc-900">{t("library.picker.title" as never)}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-lg font-bold text-zinc-700 hover:bg-zinc-100"
            aria-label={t("editor.start.closePicker" as never)}
          >
            ×
          </button>
        </header>
        <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-4 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${category === cat ? "bg-[#006D52] text-white" : "bg-zinc-100 text-zinc-700"}`}
            >
              {t(`library.picker.category.${cat}` as never)}
            </button>
          ))}
        </div>
        <div className="border-b border-zinc-100 px-4 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("library.picker.search" as never)}
            className="hc-stable-field w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ?
            <p className="text-sm text-zinc-600">{t("platform.orbit.loading" as never)}</p>
          : filtered.length === 0 ?
            <p className="text-sm text-zinc-600">{t("library.picker.empty" as never)}</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      handleClose();
                    }}
                    className="flex w-full gap-3 rounded-xl border border-zinc-200 p-2 text-left hover:border-[#0067B1]"
                  >
                    {item.url ?
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    : item.audioUrl ?
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-lg">♪</span>
                    : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-xs">—</span>}
                    <span className="text-sm font-medium text-zinc-900">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
