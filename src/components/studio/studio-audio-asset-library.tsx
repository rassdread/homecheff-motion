"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  listStudioAudioAssets,
  searchStudioAudioAssets,
} from "@/lib/studio-audio-asset-library";
import { AUDIO_ASSET_CATEGORIES, type AudioAssetCategory } from "@/types/studio-audio-asset-director";

type TabId = AudioAssetCategory | "all";

export function StudioAudioAssetLibrary() {
  const t = useActiveTranslator();
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState("");

  const assets = useMemo(() => {
    const category = tab === "all" ? undefined : tab;
    return searchStudioAudioAssets({
      category,
      query,
      moodTag: moodFilter || undefined,
    });
  }, [tab, query, moodFilter]);

  const moodOptions = useMemo(() => {
    const moods = new Set<string>();
    for (const asset of listStudioAudioAssets()) {
      for (const mood of asset.moodTags) {
        moods.add(mood);
      }
    }
    return [...moods].sort();
  }, []);

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
      <h3 className="text-sm font-semibold text-amber-950">{t("studio.audioAsset.libraryTitle")}</h3>
      <p className="mt-1 text-xs text-amber-800">{t("studio.audioAsset.libraryHint")}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {(["all", ...AUDIO_ASSET_CATEGORIES] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              tab === id ?
                "bg-amber-700 text-white"
              : "bg-white text-amber-900 ring-1 ring-amber-200"
            }`}
            onClick={() => setTab(id)}
          >
            {id === "all" ?
              t("studio.audioAsset.tab.all")
            : t(`studio.audioAsset.tab.${id}` as never)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-lg border border-amber-200 px-2 py-1.5 text-sm"
          placeholder={t("studio.audioAsset.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-lg border border-amber-200 px-2 py-1.5 text-sm"
          value={moodFilter}
          onChange={(e) => setMoodFilter(e.target.value)}
        >
          <option value="">{t("studio.audioAsset.filterMoodAll")}</option>
          {moodOptions.map((mood) => (
            <option key={mood} value={mood}>
              {mood}
            </option>
          ))}
        </select>
      </div>

      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {assets.map((asset) => (
          <li
            key={asset.id}
            className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-xs text-amber-950"
          >
            <p className="font-medium">
              {asset.name}{" "}
              <span className="font-normal text-amber-700">
                · {t(`studio.audioAsset.tab.${asset.category}` as never)}
              </span>
            </p>
            <p className="mt-0.5 text-amber-800">{asset.description}</p>
            <p className="mt-1 text-amber-700">
              {t("studio.audioAsset.tags")}: {asset.tags.join(", ") || "—"}
            </p>
            <p className="text-amber-700">
              {t("studio.audioAsset.mood")}: {asset.moodTags.join(", ") || "—"} ·{" "}
              {t("studio.audioAsset.energy")}: {asset.energyTags.join(", ") || "—"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
