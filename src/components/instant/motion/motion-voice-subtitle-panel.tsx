"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { patchProjectAudioExportSettings } from "@/lib/motion-voice-export-client";
import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioAudioExportResponse } from "@/types/motion-voice-export";
import type { MotionSubtitleExportMode } from "@/types/motion-voice-export";

type Props = {
  projectId: string;
  audioExport: MotionStudioAudioExportResponse;
  storyboardId: string | null;
  voiceMuxWarning?: string | null;
  onSettingsChange?: (next: MotionStudioAudioExportResponse) => void;
  showRenderControls?: boolean;
};

export function MotionVoiceSubtitlePanel({
  projectId,
  audioExport,
  storyboardId,
  voiceMuxWarning,
  onSettingsChange,
  showRenderControls = false,
}: Props) {
  const t = useActiveTranslator();
  const [settings, setSettings] = useState(audioExport);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(
    async (patch: Partial<Pick<typeof settings, "voiceEnabled" | "subtitlesEnabled" | "subtitleMode">>) => {
      setSaving(true);
      const res = await patchProjectAudioExportSettings(projectId, patch);
      setSaving(false);
      if (res.ok && res.audioExport) {
        const next = { ...settings, ...res.audioExport, hasStudioVoice: settings.hasStudioVoice, hasSubtitleTrack: settings.hasSubtitleTrack, studioStoryboardId: settings.studioStoryboardId };
        setSettings(next);
        onSettingsChange?.(next);
      }
    },
    [projectId, settings, onSettingsChange]
  );

  if (!settings.hasStudioVoice && !settings.hasSubtitleTrack) {
    return null;
  }

  const voiceDownload = animationProjectDownloadUrl(projectId, { variant: "voice_audio" });
  const srtDownload = animationProjectDownloadUrl(projectId, { variant: "subtitles_srt" });
  const withoutVoiceDownload = animationProjectDownloadUrl(projectId, { variant: "without_voice" });

  return (
    <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <h3 className="text-sm font-semibold text-violet-950">{t("motion.voice.panelTitle")}</h3>
      {voiceMuxWarning ?
        <p className="mt-2 text-xs text-amber-800">{voiceMuxWarning}</p>
      : null}

      {settings.hasStudioVoice ?
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-violet-900">{t("motion.voice.available")}</p>
          <ul className="text-xs text-violet-800">
            <li>
              {t("motion.voice.language")}: {settings.voiceLanguage ?? "—"}
            </li>
            <li>
              {t("motion.voice.duration")}:{" "}
              {settings.voiceDurationSeconds != null ?
                `${Math.round(settings.voiceDurationSeconds)}s`
              : "—"}
            </li>
            <li>
              {t("motion.voice.provider")}: {settings.voiceProvider ?? "—"}
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {settings.voiceAudioUrl ?
              <audio controls preload="none" src={settings.voiceAudioUrl} className="max-w-full" />
            : null}
            <a
              href={voiceDownload}
              className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
            >
              {t("motion.voice.download")}
            </a>
            {storyboardId ?
              <Link
                href={`/studio/storyboards/${encodeURIComponent(storyboardId)}`}
                className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
              >
                {t("motion.voice.regenerateInStudio")}
              </Link>
            : null}
          </div>
        </div>
      : null}

      {settings.hasSubtitleTrack && settings.subtitleTrack?.entries?.length ?
        <div className="mt-4">
          <p className="text-xs font-medium text-violet-900">{t("motion.subtitles.timeline")}</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-violet-100 bg-white/80 p-2 text-xs text-violet-900">
            {settings.subtitleTrack.entries.slice(0, 24).map((entry, i) => (
              <li key={`${entry.start}-${i}`}>
                <span className="font-mono text-violet-600">
                  {entry.start.toFixed(1)}s – {entry.end.toFixed(1)}s
                </span>{" "}
                {entry.text}
              </li>
            ))}
          </ul>
          <a
            href={srtDownload}
            className="mt-2 inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            {t("motion.subtitles.downloadSrt")}
          </a>
        </div>
      : null}

      {showRenderControls ?
        <div className="mt-4 space-y-2 border-t border-violet-100 pt-3">
          <p className="text-xs font-semibold text-violet-950">{t("motion.voice.renderSection")}</p>
          <p className="text-xs text-violet-700">{t("motion.voice.ffmpegCostNote")}</p>
          <label className="flex items-center gap-2 text-xs text-violet-900">
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              disabled={saving || !settings.voiceAudioUrl}
              onChange={(e) => void persist({ voiceEnabled: e.target.checked })}
            />
            {t("motion.voice.addVoice")}
          </label>
          <label className="flex items-center gap-2 text-xs text-violet-900">
            <input
              type="checkbox"
              checked={settings.subtitlesEnabled}
              disabled={saving}
              onChange={(e) => void persist({ subtitlesEnabled: e.target.checked })}
            />
            {t("motion.voice.addSubtitles")}
          </label>
          <label className="block text-xs text-violet-900">
            {t("motion.voice.subtitleMode")}
            <select
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1"
              value={settings.subtitleMode}
              disabled={saving}
              onChange={(e) =>
                void persist({ subtitleMode: e.target.value as MotionSubtitleExportMode })
              }
            >
              <option value="off">{t("motion.voice.subtitleOff")}</option>
              <option value="burn_in">{t("motion.voice.subtitleBurnIn")}</option>
              <option value="metadata_only">{t("motion.voice.subtitleMetadata")}</option>
            </select>
          </label>
        </div>
      : null}

      {settings.preVoiceFinalVideoUrl || settings.lastMux?.audioMuxed ?
        <div className="mt-3">
          <a
            href={withoutVoiceDownload}
            className="inline-flex text-xs font-medium text-violet-800 underline"
          >
            {t("motion.voice.downloadWithoutVoice")}
          </a>
        </div>
      : null}
    </section>
  );
}
