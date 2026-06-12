"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { PublishTimeline, PublishTimelineItem } from "@/types/publish-timeline";

type Props = {
  timeline: PublishTimeline;
  selectedId?: string | null;
  playhead?: number;
  reviewMode?: boolean;
  onSelect?: (id: string) => void;
  onPatchItem?: (id: string, patch: Partial<PublishTimelineItem>) => void;
  onDeleteItem?: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
};

const TRACK_LABELS = ["Visual", "Text", "Subtitles", "Voice", "Music", "Branding"];
const REVIEW_TRACKS = ["Text", "Voice", "Music", "CTA"] as const;

function reviewTrackForItem(item: PublishTimelineItem): number {
  if (item.kind === "voice") return 1;
  if (item.kind === "music") return 2;
  if (item.kind === "cta") return 3;
  if (item.kind === "text" || item.kind === "title" || item.kind === "subtitle") return 0;
  return -1;
}

export function PublishTimelinePanel({
  timeline,
  selectedId,
  playhead = 0,
  reviewMode = false,
  onSelect,
  onPatchItem,
  onDeleteItem,
  onDuplicateItem,
  onToggleLock,
}: Props) {
  const t = useActiveTranslator();
  const pxPerSec = 48;
  const selected = timeline.items.find((i) => i.id === selectedId);
  const reviewItems = reviewMode
    ? timeline.items.filter((item) => reviewTrackForItem(item) >= 0)
    : timeline.items;

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3" data-testid="publish-timeline-panel">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {reviewMode ? t("publish.timeline.reviewTitle" as never) : t("publish.timeline.title" as never)}
        </p>
        <span className="text-xs text-zinc-500">
          {playhead.toFixed(1)}s / {timeline.durationSeconds}s · {reviewItems.length}{" "}
          {t("publish.timeline.items" as never)}
        </span>
      </div>
      <div className="relative overflow-x-auto">
        <div className="min-w-[480px]" style={{ width: Math.max(timeline.durationSeconds, 1) * pxPerSec }}>
          {(reviewMode ? REVIEW_TRACKS : TRACK_LABELS).map((label, trackIndex) => (
            <div key={label} className="relative mb-1 h-8 border-b border-zinc-200/80">
              <span className="absolute -left-1 top-0 text-[9px] font-medium text-zinc-400">{label}</span>
              {(reviewMode ? reviewItems.filter((item) => reviewTrackForItem(item) === trackIndex) : timeline.items.filter((item) => item.track === trackIndex))
                .map((item) => {
                  const left = item.startTime * pxPerSec;
                  const width = Math.max(24, (item.endTime - item.startTime) * pxPerSec);
                  const active = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => onSelect?.(item.id)}
                      className={`absolute top-1 h-6 overflow-hidden rounded border px-1 text-[10px] font-semibold ${
                        item.locked ? "border-amber-400 bg-amber-50 text-amber-900"
                        : active ? "border-sky-500 bg-sky-100 text-sky-900"
                        : "border-zinc-300 bg-white text-zinc-700"
                      }`}
                      style={{ left, width }}
                    >
                      {item.locked ? "🔒 " : ""}
                      {item.label}
                    </button>
                  );
                })}
            </div>
          ))}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: playhead * pxPerSec }}
          />
        </div>
      </div>
      {selected && onPatchItem ?
        <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-white p-2">
          <p className="text-xs font-semibold text-zinc-700">{selected.label}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1">
              {t("publish.timeline.start" as never)}
              <input
                type="number"
                step={0.1}
                min={0}
                max={timeline.durationSeconds}
                value={selected.startTime}
                disabled={selected.locked}
                onChange={(e) => onPatchItem(selected.id, { startTime: Number(e.target.value) })}
                className="w-16 rounded border px-1"
              />
            </label>
            <label className="flex items-center gap-1">
              {t("publish.timeline.end" as never)}
              <input
                type="number"
                step={0.1}
                min={0}
                max={timeline.durationSeconds}
                value={selected.endTime}
                disabled={selected.locked}
                onChange={(e) => onPatchItem(selected.id, { endTime: Number(e.target.value) })}
                className="w-16 rounded border px-1"
              />
            </label>
            <label className="flex items-center gap-1">
              {t("publish.timeline.duration" as never)}
              <input
                type="number"
                step={0.1}
                min={0.1}
                value={Math.max(0.1, selected.endTime - selected.startTime)}
                disabled={selected.locked}
                onChange={(e) => {
                  const dur = Number(e.target.value);
                  onPatchItem(selected.id, {
                    endTime: Math.min(timeline.durationSeconds, selected.startTime + dur),
                  });
                }}
                className="w-16 rounded border px-1"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {onToggleLock ?
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-[11px] font-semibold"
                onClick={() => onToggleLock(selected.id)}
              >
                {selected.locked ? t("publish.timeline.unlock" as never) : t("publish.timeline.lock" as never)}
              </button>
            : null}
            {onDuplicateItem && !selected.locked ?
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-[11px] font-semibold"
                onClick={() => onDuplicateItem(selected.id)}
              >
                {t("publish.timeline.duplicate" as never)}
              </button>
            : null}
            {onDeleteItem && !selected.locked ?
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                onClick={() => onDeleteItem(selected.id)}
              >
                {t("publish.timeline.delete" as never)}
              </button>
            : null}
          </div>
        </div>
      : null}
    </div>
  );
}
