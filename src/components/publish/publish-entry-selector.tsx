"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { PublishEntryMode } from "@/lib/publish-photo-story";

const MODES: PublishEntryMode[] = [
  "ai_everything",
  "photo_story",
  "slideshow",
  "social_video",
  "poster",
  "flyer",
  "voice_message",
  "audio_with_image",
];

type Props = {
  value?: PublishEntryMode;
  onSelect: (mode: PublishEntryMode) => void;
};

export function PublishEntrySelector({ value, onSelect }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-3" data-testid="publish-entry-selector">
      <h2 className="text-lg font-bold text-white">{t("publish.entry.title" as never)}</h2>
      <p className="text-sm text-white/70">{t("publish.entry.lead" as never)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className={`rounded-xl border p-4 text-left transition ${
              value === mode ? "border-emerald-400 bg-emerald-500/20" : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="text-sm font-semibold text-white">{t(`publish.entry.${mode}.title` as never)}</p>
            <p className="mt-1 text-xs text-white/65">{t(`publish.entry.${mode}.desc` as never)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
