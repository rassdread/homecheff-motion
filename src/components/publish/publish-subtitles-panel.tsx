"use client";

import { PublishMediaTabButton } from "@/components/publish/publish-media-tab-button";
import { PublishProductionSectionShell } from "@/components/publish/publish-production-section-shell";
import { useActiveTranslator } from "@/i18n/client";
import { buildSubtitlesDisplayLabel } from "@/lib/publish-media-production";
import { subtitlesPanelVisibility, updateSubtitlesMode } from "@/lib/publish-media-panel-state";
import type { PublishSubtitlesConfig, PublishSubtitlesMode } from "@/types/publish-media-production";

const SUBTITLE_MODES: PublishSubtitlesMode[] = ["none", "automatic", "srt_upload", "translated"];

type Props = {
  value: PublishSubtitlesConfig;
  onChange: (next: PublishSubtitlesConfig) => void;
  onImportSrt?: (file: File) => void;
};

export function PublishSubtitlesPanel({ value, onChange, onImportSrt }: Props) {
  const t = useActiveTranslator();
  const visibility = subtitlesPanelVisibility(value);

  const patch = (patchValue: Partial<PublishSubtitlesConfig>) => {
    const next = { ...value, ...patchValue };
    if (patchValue.mode || patchValue.language) {
      next.label = buildSubtitlesDisplayLabel(next);
    }
    onChange(next);
  };

  return (
    <PublishProductionSectionShell
      titleKey="publish.media.subtitles.title"
      summary={buildSubtitlesDisplayLabel(value) || undefined}
      emptyLabelKey={value.mode === "none" ? "publish.media.subtitles.noneSelected" : undefined}
      active={value.mode !== "none"}
      testId="publish-subtitles-panel"
    >
      <div role="tablist" aria-label={t("publish.media.subtitles.title" as never)} className="flex flex-wrap gap-2">
        {SUBTITLE_MODES.map((mode) => (
          <PublishMediaTabButton
            key={mode}
            active={value.mode === mode}
            testId={`publish-subtitles-mode-${mode}`}
            onClick={() => onChange(updateSubtitlesMode(value, mode))}
          >
            {t(`publish.media.subtitles.mode.${mode}` as never)}
          </PublishMediaTabButton>
        ))}
      </div>

      {visibility.emptyState ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="publish-subtitles-empty-state">
          {t("publish.media.subtitles.emptyAdded" as never)}
        </p>
      : null}

      {visibility.automaticControls ?
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900" data-testid="publish-subtitles-automatic-controls">
          {t("publish.media.subtitles.automaticHint" as never)}
        </p>
      : null}

      {visibility.translatedControls ?
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900" data-testid="publish-subtitles-translated-controls">
          {t("publish.media.subtitles.translatedHint" as never)}
        </p>
      : null}

      {visibility.srtUploadControls ?
        <label className="block text-xs font-semibold text-zinc-600" data-testid="publish-subtitles-srt-controls">
          {t("publish.subtitle.import")}
          <input
            type="file"
            accept=".srt,.vtt,text/plain"
            className="mt-1 block w-full text-xs"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImportSrt) {
                onImportSrt(file);
              }
            }}
          />
        </label>
      : null}

      {visibility.styleControls ?
        <div data-testid="publish-subtitles-style-controls" className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.subtitles.language" as never)}
            <select value={value.language} onChange={(e) => patch({ language: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
              <option value="multilingual">{t("publish.media.subtitles.multilingual" as never)}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.subtitles.position" as never)}
            <select value={value.position} onChange={(e) => patch({ position: e.target.value as PublishSubtitlesConfig["position"] })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
              <option value="top">{t("publish.media.position.top" as never)}</option>
              <option value="middle">{t("publish.media.position.middle" as never)}</option>
              <option value="bottom">{t("publish.media.position.bottom" as never)}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.subtitles.font" as never)}
            <input value={value.font} onChange={(e) => patch({ font: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.subtitles.fontSize" as never)}
            <input type="number" min={12} max={48} value={value.fontSize} onChange={(e) => patch({ fontSize: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-zinc-600 sm:col-span-2">
            {t("publish.media.subtitles.color" as never)}
            <input type="color" value={value.color} onChange={(e) => patch({ color: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-zinc-200" />
          </label>
        </div>
      : null}
    </PublishProductionSectionShell>
  );
}
