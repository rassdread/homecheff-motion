"use client";

import { useCallback, useState } from "react";
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
import type { StudioCharacterDetail } from "@/types/studio-api";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";
import type { StudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

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
  character: StudioCharacterDetail
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

export function StudioCharacterVoiceProfilePanel({
  characterId,
  characterName,
  value,
  onChange,
}: Props) {
  const t = useActiveTranslator();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const runPreview = useCallback(async () => {
    if (!characterId) {
      return;
    }
    setPreviewBusy(true);
    setPreviewError("");
    try {
      const res = await fetch(
        `/api/studio/characters/${encodeURIComponent(characterId)}/voice-preview`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: value.voiceLanguage }),
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
      setPreviewUrl(url);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Preview failed.");
      setPreviewUrl(null);
    } finally {
      setPreviewBusy(false);
    }
  }, [characterId, value.voiceLanguage]);

  return (
    <section className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <h2 className="text-sm font-semibold text-violet-950">{t("studio.characterVoice.title")}</h2>
      <p className="mt-1 text-xs text-violet-800">{t("studio.characterVoice.hint")}</p>

      <label className="mt-3 flex items-center gap-2 text-sm text-violet-900">
        <input
          type="checkbox"
          checked={value.voiceEnabled}
          onChange={(e) => onChange({ ...value, voiceEnabled: e.target.checked })}
        />
        {t("studio.characterVoice.enabled")}
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm text-violet-900">
        <input
          type="checkbox"
          checked={value.voiceLock}
          onChange={(e) => onChange({ ...value, voiceLock: e.target.checked })}
        />
        {t("studio.characterVoice.lock")}
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.characterVoice.provider")}
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            value={value.voiceProvider}
            onChange={(e) => onChange({ ...value, voiceProvider: e.target.value })}
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="mock">Mock</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.characterVoice.language")}
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            value={value.voiceLanguage}
            onChange={(e) => onChange({ ...value, voiceLanguage: e.target.value })}
          >
            <option value="en">EN</option>
            <option value="nl">NL</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="de">DE</option>
            <option value="pt">PT</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-violet-900 sm:col-span-2">
          {t("studio.characterVoice.profile")}
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            value={value.voiceProfile}
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
          {t("studio.characterVoice.gender")}
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            value={value.voiceGender}
            onChange={(e) => onChange({ ...value, voiceGender: e.target.value })}
            placeholder={t("studio.characterVoice.genderPlaceholder")}
          />
        </label>
        <label className="block text-xs font-medium text-violet-900 sm:col-span-2">
          {t("studio.characterVoice.description")}
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            value={value.voiceDescription}
            onChange={(e) => onChange({ ...value, voiceDescription: e.target.value })}
            placeholder={characterName}
          />
        </label>
        <label className="block text-xs font-medium text-violet-900 sm:col-span-2">
          {t("studio.characterVoice.notes")}
          <textarea
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            rows={2}
            value={value.voiceNotes}
            onChange={(e) => onChange({ ...value, voiceNotes: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          {t("studio.characterVoice.languageProfilesTitle")}
        </h3>
        <p className="mt-1 text-xs text-violet-800">{t("studio.characterVoice.languageProfilesHint")}</p>
        <div className="mt-3 space-y-3">
          {VOICE_IDENTITY_LANGUAGES.map((lang) => {
            const row: CharacterVoiceLanguageProfile =
              value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage] ?? {};
            const updateLang = (patch: Partial<CharacterVoiceLanguageProfile>) => {
              onChange({
                ...value,
                voiceProfilesByLanguage: {
                  ...value.voiceProfilesByLanguage,
                  [lang]: { ...row, ...patch },
                },
              });
            };
            return (
              <div
                key={lang}
                className="rounded-xl border border-violet-100 bg-white/70 p-3"
              >
                <p className="text-xs font-semibold text-violet-950">{lang.toUpperCase()}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-violet-900">
                    {t("studio.characterVoice.profile")}
                    <select
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
                      value={row.voiceProfile ?? ""}
                      onChange={(e) =>
                        updateLang({
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
                  <label className="block text-xs text-violet-900">
                    {t("studio.characterVoice.provider")}
                    <select
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
                      value={row.voiceProvider ?? ""}
                      onChange={(e) =>
                        updateLang({ voiceProvider: e.target.value || undefined })
                      }
                    >
                      <option value="">{t("studio.characterVoice.languageProfileInherit")}</option>
                      <option value="elevenlabs">ElevenLabs</option>
                      <option value="mock">Mock</option>
                    </select>
                  </label>
                  <label className="block text-xs text-violet-900">
                    {t("studio.characterVoice.gender")}
                    <input
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
                      value={row.voiceGender ?? ""}
                      onChange={(e) => updateLang({ voiceGender: e.target.value || undefined })}
                      placeholder={t("studio.characterVoice.genderPlaceholder")}
                    />
                  </label>
                  <label className="block text-xs text-violet-900 sm:col-span-2">
                    {t("studio.characterVoice.description")}
                    <input
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
                      value={row.voiceDescription ?? ""}
                      onChange={(e) =>
                        updateLang({ voiceDescription: e.target.value || undefined })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {characterId ?
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={previewBusy || !value.voiceEnabled}
            onClick={() => void runPreview()}
            className="rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            {previewBusy ? t("button.loading") : t("studio.characterVoice.preview")}
          </button>
          {previewUrl ?
            <audio controls preload="none" src={previewUrl} className="max-w-full" />
          : null}
          {previewError ?
            <p className="text-xs text-red-700">{previewError}</p>
          : null}
        </div>
      : null}
    </section>
  );
}
