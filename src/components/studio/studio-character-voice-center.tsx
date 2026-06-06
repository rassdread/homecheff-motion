"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
  normalizeStudioVoiceProfileId,
} from "@/lib/studio-voice-profiles";
import type {
  CharacterVoiceLanguageProfile,
  CharacterVoiceProfilesByLanguage,
} from "@/types/studio-character-voice";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { StudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

export const VOICE_CENTER_LANGUAGES = ["nl", "en", "de", "fr", "es"] as const;
export type VoiceCenterLanguage = (typeof VOICE_CENTER_LANGUAGES)[number];

export type CharacterVoiceFormState = {
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceDescription: string;
  voiceNotes: string;
  voiceLock: boolean;
  voiceProfilesByLanguage: CharacterVoiceProfilesByLanguage;
};

export function characterVoiceStateFromDetail(
  character: StudioCharacterListItem
): CharacterVoiceFormState {
  return {
    voiceEnabled: character.voiceEnabled,
    voiceProvider: character.voiceProvider || "elevenlabs",
    voiceProfile: character.voiceProfile || "warm_narrator",
    voiceLanguage: character.voiceLanguage || "en",
    voiceGender: character.voiceGender || "",
    voiceDescription: character.voiceDescription || "",
    voiceNotes: character.voiceNotes || "",
    voiceLock: character.voiceLock,
    voiceProfilesByLanguage: character.voiceProfilesByLanguage ?? {},
  };
}

type Props = {
  characterId: string | null;
  characterName: string;
  value: CharacterVoiceFormState;
  onChange: (next: CharacterVoiceFormState) => void;
};

function resolveLanguageVoice(
  value: CharacterVoiceFormState,
  lang: VoiceCenterLanguage
): {
  profile: string;
  provider: string;
  isOverride: boolean;
} {
  const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage];
  return {
    profile: row?.voiceProfile ?? value.voiceProfile,
    provider: row?.voiceProvider ?? value.voiceProvider,
    isOverride: Boolean(row?.voiceProfile || row?.voiceProvider),
  };
}

export function StudioCharacterVoiceCenter({
  characterId,
  characterName,
  value,
  onChange,
}: Props) {
  const t = useActiveTranslator();
  const [previewByLang, setPreviewByLang] = useState<Partial<Record<VoiceCenterLanguage, string>>>(
    {}
  );
  const [previewBusyLang, setPreviewBusyLang] = useState<VoiceCenterLanguage | null>(null);
  const [previewError, setPreviewError] = useState("");

  const defaultProfileLabel = useMemo(() => {
    const preset = getVoiceProfilePreset(normalizeStudioVoiceProfileId(value.voiceProfile));
    return t(preset.labelKey as never);
  }, [value.voiceProfile, t]);

  const runPreview = useCallback(
    async (lang: VoiceCenterLanguage) => {
      if (!characterId || !value.voiceEnabled) {
        return;
      }
      setPreviewBusyLang(lang);
      setPreviewError("");
      try {
        const res = await fetch(
          `/api/studio/characters/${encodeURIComponent(characterId)}/voice-preview`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: lang }),
          }
        );
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            json && typeof json === "object" && "error" in json
              ? String((json as { error: unknown }).error)
              : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        const url =
          json && typeof json === "object" && "audioUrl" in json
            ? String((json as { audioUrl: unknown }).audioUrl)
            : "";
        if (!url) {
          throw new Error("No preview URL returned.");
        }
        setPreviewByLang((prev) => ({ ...prev, [lang]: url }));
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : "Preview failed.");
      } finally {
        setPreviewBusyLang(null);
      }
    },
    [characterId, value.voiceEnabled]
  );

  const updateLang = (
    lang: VoiceCenterLanguage,
    patch: Partial<CharacterVoiceLanguageProfile>
  ) => {
    const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage] ?? {};
    onChange({
      ...value,
      voiceProfilesByLanguage: {
        ...value.voiceProfilesByLanguage,
        [lang]: { ...row, ...patch },
      },
    });
  };

  return (
    <section className="mt-8 rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/60 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-violet-950">
            {t("studio.voiceCenter.title")}
          </h2>
          <p className="mt-1 text-sm text-violet-800">{t("studio.voiceCenter.subtitle")}</p>
          <p className="mt-2 text-xs text-violet-700/90">{t("studio.voiceCenter.futureRenders")}</p>
        </div>
        {value.voiceLock ?
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">
            {t("studio.voiceCenter.lockedBadge")}
          </span>
        : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-violet-100 bg-white/80 p-4">
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-violet-950">
          <input
            type="checkbox"
            checked={value.voiceEnabled}
            onChange={(e) => onChange({ ...value, voiceEnabled: e.target.checked })}
          />
          {t("studio.characterVoice.enabled")}
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-violet-950">
          <input
            type="checkbox"
            checked={value.voiceLock}
            onChange={(e) => onChange({ ...value, voiceLock: e.target.checked })}
          />
          {t("studio.voiceCenter.lockLabel")}
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.characterVoice.profile")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={value.voiceProfile}
            disabled={!value.voiceEnabled}
            onChange={(e) =>
              onChange({
                ...value,
                voiceProfile: normalizeStudioVoiceProfileId(e.target.value),
              })
            }
          >
            {STUDIO_VOICE_PROFILE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(getVoiceProfilePreset(id).labelKey as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.characterVoice.language")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={value.voiceLanguage}
            disabled={!value.voiceEnabled}
            onChange={(e) => onChange({ ...value, voiceLanguage: e.target.value })}
          >
            {VOICE_CENTER_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <p className="sm:col-span-2 text-xs text-violet-800">
          {t("studio.voiceCenter.defaultActive", { voice: defaultProfileLabel })}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          {t("studio.voiceCenter.perLanguage")}
        </h3>
        {VOICE_CENTER_LANGUAGES.map((lang) => {
          const resolved = resolveLanguageVoice(value, lang);
          const preset = getVoiceProfilePreset(normalizeStudioVoiceProfileId(resolved.profile));
          const activeLabel = t(preset.labelKey as never);
          const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage] ?? {};
          const previewUrl = previewByLang[lang];

          return (
            <article
              key={lang}
              className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-violet-950">{lang.toUpperCase()}</p>
                <div className="flex flex-wrap gap-1.5">
                  {resolved.isOverride ?
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
                      {t("studio.voiceCenter.customForLang")}
                    </span>
                  : null}
                  {value.voiceLock ?
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      {t("studio.voiceCenter.lockedShort")}
                    </span>
                  : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.voiceCenter.activeVoice", { voice: activeLabel })}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block text-xs text-violet-900">
                  {t("studio.characterVoice.profile")}
                  <select
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                    value={row.voiceProfile ?? ""}
                    disabled={!value.voiceEnabled}
                    onChange={(e) =>
                      updateLang(lang, {
                        voiceProfile: e.target.value
                          ? normalizeStudioVoiceProfileId(e.target.value)
                          : undefined,
                      })
                    }
                  >
                    <option value="">{t("studio.characterVoice.languageProfileInherit")}</option>
                    {STUDIO_VOICE_PROFILE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t(getVoiceProfilePreset(id).labelKey as never)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="button"
                    disabled={!characterId || !value.voiceEnabled || previewBusyLang === lang}
                    onClick={() => void runPreview(lang)}
                    className="min-h-[44px] rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                  >
                    {previewBusyLang === lang
                      ? t("button.loading")
                      : t("studio.voiceCenter.preview")}
                  </button>
                </div>
              </div>

              {previewUrl ?
                <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/50 p-2">
                  <p className="text-[10px] font-semibold uppercase text-violet-700">
                    {t("studio.voiceCenter.lastPreview")}
                  </p>
                  <audio controls preload="none" src={previewUrl} className="mt-1 w-full" />
                </div>
              : null}
            </article>
          );
        })}
      </div>

      {previewError ?
        <p className="mt-3 text-xs text-red-700">{previewError}</p>
      : null}

      <label className="mt-4 block text-xs font-medium text-violet-900">
        {t("studio.characterVoice.notes")}
        <textarea
          className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
          rows={2}
          value={value.voiceNotes}
          disabled={!value.voiceEnabled}
          onChange={(e) => onChange({ ...value, voiceNotes: e.target.value })}
          placeholder={characterName}
        />
      </label>
    </section>
  );
}
