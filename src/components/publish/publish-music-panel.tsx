"use client";

import { PublishMediaTabButton } from "@/components/publish/publish-media-tab-button";
import { PublishProductionSectionShell } from "@/components/publish/publish-production-section-shell";
import { PublishWizardStableTextarea } from "@/components/publish/publish-wizard-stable-textarea";
import { useActiveTranslator } from "@/i18n/client";
import { buildMusicDisplayLabel } from "@/lib/publish-media-production";
import { musicPanelVisibility, updateMusicMode } from "@/lib/publish-media-panel-state";
import type { PublishMusicConfig, PublishMusicMode } from "@/types/publish-media-production";

const MUSIC_MODES: PublishMusicMode[] = ["none", "generate", "library", "upload"];
const LIBRARY_TRACKS = [
  { id: "cinematic_inspire", label: "Cinematic Inspire" },
  { id: "upbeat_social", label: "Upbeat Social" },
  { id: "ambient_calm", label: "Ambient Calm" },
];

type Props = {
  value: PublishMusicConfig;
  onChange: (next: PublishMusicConfig) => void;
  suggestedMood?: string;
};

export function PublishMusicPanel({ value, onChange, suggestedMood }: Props) {
  const t = useActiveTranslator();
  const visibility = musicPanelVisibility(value);

  const patch = (patchValue: Partial<PublishMusicConfig>) => {
    const next = { ...value, ...patchValue };
    if (next.mode !== "none") {
      next.label = buildMusicDisplayLabel(next) || next.mood;
    }
    onChange(next);
  };

  return (
    <PublishProductionSectionShell
      titleKey="publish.media.music.title"
      summary={buildMusicDisplayLabel(value) || undefined}
      emptyLabelKey={value.mode === "none" ? "publish.media.music.noneSelected" : undefined}
      active={value.mode !== "none"}
      testId="publish-music-panel"
    >
      <div role="tablist" aria-label={t("publish.media.music.title" as never)} className="flex flex-wrap gap-2">
        {MUSIC_MODES.map((mode) => (
          <PublishMediaTabButton
            key={mode}
            active={value.mode === mode}
            testId={`publish-music-mode-${mode}`}
            onClick={() => onChange(updateMusicMode(value, mode, { suggestedMood }))}
          >
            {t(`publish.media.music.mode.${mode}` as never)}
          </PublishMediaTabButton>
        ))}
      </div>

      {visibility.emptyState ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="publish-music-empty-state">
          {t("publish.media.music.emptyAdded" as never)}
        </p>
      : null}

      {visibility.generateControls ?
        <div data-testid="publish-music-generate-controls" className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-600">
            {t("publish.media.music.prompt" as never)}
            <PublishWizardStableTextarea
              value={value.prompt ?? ""}
              rows={2}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder={suggestedMood}
              onCommit={(prompt) => patch({ prompt })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.music.genre" as never)}
              <select value={value.genre} onChange={(e) => patch({ genre: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                <option value="cinematic">Cinematic</option>
                <option value="corporate">Corporate</option>
                <option value="upbeat">Upbeat</option>
                <option value="ambient">Ambient</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.music.mood" as never)}
              <input value={value.mood} onChange={(e) => patch({ mood: e.target.value })} placeholder={suggestedMood} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={value.durationMatch ?? true} onChange={(e) => patch({ durationMatch: e.target.checked })} />
            {t("publish.media.music.durationMatch" as never)}
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={value.instrumental ?? true} onChange={(e) => patch({ instrumental: e.target.checked })} />
            {t("publish.media.music.instrumental" as never)}
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.music.provider" as never)}
            <select value={value.provider ?? "elevenlabs"} onChange={(e) => patch({ provider: e.target.value as PublishMusicConfig["provider"] })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
              <option value="elevenlabs">ElevenLabs Music</option>
              <option value="suno">Suno</option>
              <option value="homecheff">HomeCheff Music Library</option>
            </select>
          </label>
          <button type="button" disabled className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-500" title={t("publish.media.futureAction" as never)}>
            {t("publish.media.music.generateAction" as never)}
          </button>
        </div>
      : null}

      {visibility.libraryPicker ?
        <ul className="space-y-2" data-testid="publish-music-library-picker">
          {LIBRARY_TRACKS.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => patch({ trackId: track.id, label: track.label, mood: track.label })}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  value.trackId === track.id
                    ? "border-[#0067B1] bg-[#0067B1]/10 font-semibold text-[#0067B1]"
                    : "border-zinc-200 text-zinc-700 hover:border-[#0067B1]/30"
                }`}
              >
                {track.label}
              </button>
            </li>
          ))}
        </ul>
      : null}

      {visibility.uploadControls ?
        <div data-testid="publish-music-upload-controls" className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-600">
            {t("publish.media.music.upload" as never)}
            <input
              type="file"
              accept="audio/*"
              className="mt-1 block w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                patch({
                  trackUrl: URL.createObjectURL(file),
                  uploadFileName: file.name,
                  label: file.name,
                });
              }}
            />
          </label>
          {value.trackUrl ?
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-700">{value.uploadFileName}</p>
              <audio controls src={value.trackUrl} className="mt-2 w-full" />
            </div>
          : null}
        </div>
      : null}

      {visibility.sharedControls && value.mode !== "generate" ?
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.music.volume" as never)}: {value.volume}%
            <input type="range" min={0} max={100} value={value.volume} onChange={(e) => patch({ volume: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <input type="checkbox" checked={value.fadeIn} onChange={(e) => patch({ fadeIn: e.target.checked })} />
              {t("publish.media.music.fadeIn" as never)}
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <input type="checkbox" checked={value.fadeOut} onChange={(e) => patch({ fadeOut: e.target.checked })} />
              {t("publish.media.music.fadeOut" as never)}
            </label>
          </div>
        </div>
      : null}

      {visibility.generateControls ?
        <>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.music.intensity" as never)}: {value.intensity}%
            <input type="range" min={0} max={100} value={value.intensity} onChange={(e) => patch({ intensity: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.music.volume" as never)}: {value.volume}%
            <input type="range" min={0} max={100} value={value.volume} onChange={(e) => patch({ volume: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
        </>
      : null}
    </PublishProductionSectionShell>
  );
}
