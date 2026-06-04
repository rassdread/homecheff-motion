"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  STUDIO_NARRATION_MODES,
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
  normalizeStudioVoiceProfileId,
  profileIdForNarrationMode,
  voiceStyleFromProfile,
} from "@/lib/studio-voice-profiles";
import {
  applyVoiceProfileToneHints,
  buildVoiceScriptBundle,
} from "@/lib/studio-voice-script-builder";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";

type Props = {
  storyboard: StudioStoryboardDetail;
  canModify?: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
};

const VOICE_LANGUAGES = ["en", "nl", "de", "fr"] as const;

export function StudioVoiceDirectorPanel({
  storyboard,
  canModify,
  onStoryboardUpdated,
}: Props) {
  const t = useActiveTranslator();
  const [enabled, setEnabled] = useState(storyboard.voiceEnabled ?? false);
  const [language, setLanguage] = useState(storyboard.voiceLanguage ?? "en");
  const [narrationMode, setNarrationMode] = useState(
    normalizeStudioNarrationMode(storyboard.narrationMode)
  );
  const [voiceProfile, setVoiceProfile] = useState(
    normalizeStudioVoiceProfileId(storyboard.voiceProfile)
  );
  const [generatedScript, setGeneratedScript] = useState(
    storyboard.voiceNarrationScript?.trim() ?? ""
  );
  const [saveBusy, setSaveBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEnabled(storyboard.voiceEnabled ?? false);
      setLanguage(storyboard.voiceLanguage ?? "en");
      setNarrationMode(normalizeStudioNarrationMode(storyboard.narrationMode));
      setVoiceProfile(normalizeStudioVoiceProfileId(storyboard.voiceProfile));
      setGeneratedScript(storyboard.voiceNarrationScript?.trim() ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    storyboard.voiceEnabled,
    storyboard.voiceLanguage,
    storyboard.narrationMode,
    storyboard.voiceProfile,
    storyboard.voiceNarrationScript,
  ]);

  const draftStoryboard = useMemo(
    (): StudioStoryboardDetail => ({
      ...storyboard,
      voiceEnabled: enabled,
      voiceLanguage: language,
      voiceStyle: voiceStyleFromProfile(voiceProfile),
      voiceProfile,
      narrationMode,
      voiceNarrationScript: generatedScript,
    }),
    [storyboard, enabled, language, voiceProfile, narrationMode, generatedScript]
  );

  const report = useMemo(() => analyzeVoiceDirector(draftStoryboard), [draftStoryboard]);

  const handleModeChange = (mode: string) => {
    const normalized = normalizeStudioNarrationMode(mode);
    setNarrationMode(normalized);
    setVoiceProfile(profileIdForNarrationMode(normalized));
  };

  const handleGenerateNarration = useCallback(() => {
    const bundle = applyVoiceProfileToneHints(
      buildVoiceScriptBundle({
        storyboard,
        narrationMode,
        aiDirectorPrompt: storyboard.aiDirectorPrompt,
        language,
      }),
      getVoiceProfilePreset(voiceProfile)
    );
    setGeneratedScript(bundle.fullNarration);
  }, [storyboard, narrationMode, language, voiceProfile]);

  const handleSaveSettings = async () => {
    if (!canModify) {
      return;
    }
    setSaveBusy(true);
    try {
      const res = await updateStudioStoryboardApi(storyboard.id, {
        voiceEnabled: enabled,
        voiceLanguage: language,
        voiceStyle: voiceStyleFromProfile(voiceProfile),
        voiceProfile,
        narrationMode,
        voiceNarrationScript: generatedScript,
      });
      if (res.ok && res.data.storyboard) {
        onStoryboardUpdated?.(res.data.storyboard);
      }
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCopyScript = async () => {
    const text = generatedScript || report.script.fullNarration;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (storyboard.scenes.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{t("studio.voice.title")}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{t("studio.voice.hint")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canModify}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-zinc-300"
          />
          {t("studio.voice.enabled")}
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-zinc-700">
          {t("studio.voice.language")}
          <select
            value={language}
            disabled={!canModify || !enabled}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {VOICE_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t(`studio.voice.lang.${code}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("studio.voice.narrationMode")}
          <select
            value={narrationMode}
            disabled={!canModify || !enabled}
            onChange={(e) => handleModeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {STUDIO_NARRATION_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`studio.voice.mode.${mode}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700 sm:col-span-2">
          {t("studio.voice.preset")}
          <select
            value={voiceProfile}
            disabled={!canModify || !enabled}
            onChange={(e) => setVoiceProfile(normalizeStudioVoiceProfileId(e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {STUDIO_VOICE_PROFILE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(getVoiceProfilePreset(id).labelKey as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {enabled ?
        <>
          <p className="mt-3 text-xs text-zinc-600">
            {t("studio.voice.score", { score: report.voiceScore })} ·{" "}
            {t("studio.voice.duration", { seconds: report.timing.estimatedSeconds })} ·{" "}
            {t("studio.voice.pace", { wpm: report.timing.speakingSpeedWpm })} ·{" "}
            {t("studio.voice.credits", { credits: report.estimatedCredits })}
          </p>

          {report.timing.warnings.length > 0 ?
            <ul className="mt-2 space-y-1">
              {report.timing.warnings.slice(0, 4).map((warning, index) => (
                <li
                  key={`${warning.code}-${index}`}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-950"
                >
                  {t(warning.messageKey as TranslationKey, warning.params)}
                </li>
              ))}
            </ul>
          : null}

          <label className="mt-4 block text-xs font-medium text-zinc-700">
            {t("studio.voice.scriptLabel")}
            <textarea
              value={generatedScript || report.script.fullNarration}
              onChange={(e) => setGeneratedScript(e.target.value)}
              rows={5}
              disabled={!canModify}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateNarration}
              className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
            >
              {generatedScript ?
                t("studio.voice.regenerateNarration")
              : t("studio.voice.generateNarration")}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyScript()}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
            >
              {copied ? t("studio.voice.copied") : t("studio.voice.copyScript")}
            </button>
            {canModify ?
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void handleSaveSettings()}
                className="rounded-full border border-violet-300 px-4 py-2 text-sm font-medium text-violet-900"
              >
                {saveBusy ? t("studio.voice.saving") : t("studio.voice.saveSettings")}
              </button>
            : null}
          </div>
        </>
      : null}
    </div>
  );
}
