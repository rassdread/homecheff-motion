"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { MAX_LAYER_BEATS } from "@/lib/story-text-beats";
import { StoryboardFieldHint } from "@/components/instant/storyboard-field-hint";

type TextBeatsEditorProps = {
  label: string;
  hint?: string;
  beats: string[];
  onChange: (beats: string[]) => void;
  maxBeats?: number;
  uppercase?: boolean;
  placeholder?: string;
  multiline?: boolean;
  addLabel: string;
  duplicateLabel: string;
  removeLabel: string;
  beatLabel: (index: number) => string;
  moveUpLabel: string;
  moveDownLabel: string;
};

export function TextBeatsEditor({
  label,
  hint,
  beats,
  onChange,
  maxBeats = MAX_LAYER_BEATS,
  uppercase = false,
  placeholder,
  multiline = false,
  addLabel,
  duplicateLabel,
  removeLabel,
  beatLabel,
  moveUpLabel,
  moveDownLabel,
}: TextBeatsEditorProps) {
  const rows = beats.length > 0 ? beats : [""];
  const inputClass = uppercase ?
    "mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm uppercase text-zinc-900"
  : "mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900";

  const patchBeat = (index: number, value: string) => {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  };

  const duplicateBeat = (index: number) => {
    if (rows.length >= maxBeats) {
      return;
    }
    const next = [...rows];
    next.splice(index + 1, 0, rows[index] ?? "");
    onChange(next);
  };

  const removeBeat = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  };

  const moveBeat = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) {
      return;
    }
    const next = [...rows];
    const temp = next[index]!;
    next[index] = next[target]!;
    next[target] = temp;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {hint ?
        <StoryboardFieldHint label={label} hint={hint} />
      : <p className="text-xs text-zinc-500">{label}</p>}
      {rows.map((beat, beatIndex) => (
        <div key={`beat-${beatIndex}`} className="flex gap-2">
          <label className="block min-w-0 flex-1 text-xs text-zinc-500">
            {beatLabel(beatIndex + 1)}
            {multiline ?
              <textarea
                value={beat}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => patchBeat(beatIndex, e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder={placeholder}
              />
            : <input
                type="text"
                value={beat}
                onChange={(e: ChangeEvent<HTMLInputElement>) => patchBeat(beatIndex, e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                className={inputClass}
                placeholder={placeholder}
              />
            }
          </label>
          <div className="mt-5 flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => moveBeat(beatIndex, -1)}
              disabled={beatIndex === 0}
              className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
              aria-label={moveUpLabel}
              title={moveUpLabel}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBeat(beatIndex, 1)}
              disabled={beatIndex >= rows.length - 1}
              className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
              aria-label={moveDownLabel}
              title={moveDownLabel}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => duplicateBeat(beatIndex)}
              disabled={rows.length >= maxBeats}
              className="text-xs text-zinc-400 hover:text-emerald-700 disabled:opacity-30"
              aria-label={duplicateLabel}
              title={duplicateLabel}
            >
              ⧉
            </button>
            {rows.length > 1 ?
              <button
                type="button"
                onClick={() => removeBeat(beatIndex)}
                className="text-xs text-zinc-400 hover:text-red-600"
                aria-label={removeLabel}
                title={removeLabel}
              >
                ✕
              </button>
            : null}
          </div>
        </div>
      ))}
      {rows.length < maxBeats ?
        <button
          type="button"
          onClick={() => onChange([...rows, ""])}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {addLabel}
        </button>
      : null}
    </div>
  );
}
