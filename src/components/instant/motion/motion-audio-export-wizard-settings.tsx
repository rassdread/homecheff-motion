"use client";

import { useMemo, useState } from "react";
import { buildMotionStudioAudioExportFromHandoff } from "@/lib/motion-voice-export";
import { useActiveTranslator } from "@/i18n/client";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { MotionStudioAudioExportJson, MotionSubtitleExportMode } from "@/types/motion-voice-export";

type Props = {
  storedHandoff: Record<string, unknown> | null | undefined;
  value: MotionStudioAudioExportJson | null;
  onChange: (next: MotionStudioAudioExportJson | null) => void;
};

export function MotionAudioExportWizardSettings({ storedHandoff, value, onChange }: Props) {
  const t = useActiveTranslator();
  const defaults = useMemo(() => {
    if (!storedHandoff) {
      return null;
    }
    const payload = storedHandoff as unknown as MotionHandoffPayload;
    if (!payload.voiceMetadata && !payload.subtitleTrack) {
      return null;
    }
    return buildMotionStudioAudioExportFromHandoff(payload);
  }, [storedHandoff]);

  const [settings, setSettings] = useState<MotionStudioAudioExportJson | null>(value ?? defaults);

  if (!defaults) {
    return null;
  }

  const current = settings ?? defaults;

  const update = (patch: Partial<MotionStudioAudioExportJson>) => {
    const next = { ...current, ...patch };
    setSettings(next);
    onChange(next);
  };

  return (
    <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
      <p className="text-xs font-semibold text-violet-950">{t("motion.voice.renderSection")}</p>
      <p className="mt-1 text-xs text-violet-700">{t("motion.voice.ffmpegCostNote")}</p>
      <label className="mt-2 flex items-center gap-2 text-xs text-violet-900">
        <input
          type="checkbox"
          checked={current.voiceEnabled}
          disabled={!current.voiceAudioUrl}
          onChange={(e) => update({ voiceEnabled: e.target.checked })}
        />
        {t("motion.voice.addVoice")}
      </label>
      <label className="mt-1 flex items-center gap-2 text-xs text-violet-900">
        <input
          type="checkbox"
          checked={current.subtitlesEnabled}
          onChange={(e) => update({ subtitlesEnabled: e.target.checked })}
        />
        {t("motion.voice.addSubtitles")}
      </label>
      <label className="mt-2 block text-xs text-violet-900">
        {t("motion.voice.subtitleMode")}
        <select
          className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1"
          value={current.subtitleMode}
          onChange={(e) =>
            update({ subtitleMode: e.target.value as MotionSubtitleExportMode })
          }
        >
          <option value="off">{t("motion.voice.subtitleOff")}</option>
          <option value="burn_in">{t("motion.voice.subtitleBurnIn")}</option>
          <option value="metadata_only">{t("motion.voice.subtitleMetadata")}</option>
        </select>
      </label>
    </section>
  );
}
