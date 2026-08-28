"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PhotoVideoCatalogMusic } from "@/lib/photo-video/audio";
import { PHOTO_VIDEO_DEFAULT_VOLUME } from "@/lib/photo-video/audio";
import type { FreeMusicPublicCatalogTrack } from "@/lib/free-music/types";

type Props = {
  videoDurationSeconds: number;
  locale: string;
  selectedTrackId?: string | null;
  onSelect: (audio: PhotoVideoCatalogMusic) => void;
  labels: {
    search: string;
    category: string;
    all: string;
    play: string;
    pause: string;
    select: string;
    selected: string;
    licence: string;
    empty: string;
    loading: string;
    error: string;
  };
};

export function PhotoVideoFreeMusicBrowser(props: Props) {
  const [tracks, setTracks] = useState<FreeMusicPublicCatalogTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/studio/free-music/catalog", { credentials: "include" });
        if (!res.ok) throw new Error("catalog");
        const data = (await res.json()) as { enabled?: boolean; tracks?: FreeMusicPublicCatalogTrack[] };
        if (cancelled) return;
        setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      } catch {
        if (!cancelled) setError(props.labels.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [props.labels.error]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) if (t.category) set.add(t.category);
    return ["ALL", ...Array.from(set).sort()];
  }, [tracks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [tracks, query, category]);

  async function togglePreview(track: FreeMusicPublicCatalogTrack) {
    if (!track.previewUrl) return;
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const el = new Audio(track.previewUrl);
    el.preload = "none";
    audioRef.current = el;
    setPlayingId(track.id);
    try {
      await el.play();
      el.onended = () => setPlayingId(null);
    } catch {
      setPlayingId(null);
    }
  }

  function selectTrack(track: FreeMusicPublicCatalogTrack) {
    audioRef.current?.pause();
    setPlayingId(null);
    const trackDurationSeconds = Math.max(1, track.durationSeconds || 1);
    const windowSeconds = Math.min(props.videoDurationSeconds, trackDurationSeconds);
    props.onSelect({
      kind: "catalog",
      trackId: track.id,
      startSeconds: 0,
      durationSeconds: windowSeconds,
      trackDurationSeconds,
      volume: PHOTO_VIDEO_DEFAULT_VOLUME,
      title: track.title,
      artist: track.artist,
    });
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-600" data-testid="px4a-free-music-loading">
        {props.labels.loading}
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-red-700" data-testid="px4a-free-music-error">
        {error}
      </p>
    );
  }
  if (tracks.length === 0) {
    return (
      <p className="text-sm text-zinc-600" data-testid="px4a-audio-catalog-empty">
        {props.labels.empty}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="px4a-free-music-browser">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-700">
          {props.labels.search}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900"
            data-testid="px4a-free-music-search"
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-xs font-medium text-zinc-700 sm:w-44">
          {props.labels.category}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900"
            data-testid="px4a-free-music-category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? props.labels.all : c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="max-h-72 space-y-2 overflow-y-auto" role="list">
        {filtered.map((track) => {
          const selected = props.selectedTrackId === track.id;
          return (
            <li
              key={track.id}
              className={`rounded-xl border p-3 ${selected ? "border-[#006D52] bg-[#006D52]/5" : "border-zinc-200 bg-white"}`}
              data-testid={`px4a-free-music-row-${track.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{track.title}</p>
                  <p className="truncate text-xs text-zinc-600">{track.artist}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {track.durationSeconds}s · {track.category ?? "—"} · {props.labels.licence}: {track.licenseDisplay}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-zinc-200 px-3 text-sm"
                    aria-label={playingId === track.id ? props.labels.pause : props.labels.play}
                    onClick={() => void togglePreview(track)}
                    data-testid={`px4a-free-music-preview-${track.id}`}
                  >
                    {playingId === track.id ? props.labels.pause : props.labels.play}
                  </button>
                  <button
                    type="button"
                    className={`min-h-11 rounded-full border px-3 text-sm font-medium ${
                      selected ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200"
                    }`}
                    aria-pressed={selected}
                    onClick={() => selectTrack(track)}
                    data-testid={`px4a-free-music-select-${track.id}`}
                  >
                    {selected ? props.labels.selected : props.labels.select}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
