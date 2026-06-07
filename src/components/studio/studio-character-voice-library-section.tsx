"use client";

import { useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { useActiveTranslator } from "@/i18n/client";
import {
  filterVoiceLibrary,
  type VoiceLibraryFilters,
} from "@/lib/studio-voice-accent-model";
import { StudioMyVoicesSection } from "@/components/studio/studio-my-voices-section";
import {
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import {
  formatLibraryVoiceProfileRef,
  isClonedVoiceProfileRef,
  parseVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import { VOICE_PERSONA_GROUP_LABEL_KEYS } from "@/lib/studio-voice-persona-presets";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

export type VoiceLibraryTab = "presets" | "persona" | "my_voice";

type Props = {
  activeTab: VoiceLibraryTab;
  voiceEnabled: boolean;
  selectedProfile: string;
  onSelectProfile: (profile: string, meta?: { voiceName?: string; personaLabelKey?: string }) => void;
  characterId?: string | null;
  characterName?: string;
  language?: string;
  canModify?: boolean;
};

function VoiceLibraryRow({
  voice,
  selected,
  disabled,
  onSelect,
}: {
  voice: VoiceLibraryEntry;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const t = useActiveTranslator();
  const [previewError, setPreviewError] = useState(false);

  return (
    <article
      className={`rounded-lg border p-3 ${selected ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-950">{voice.name}</p>
          <p className="mt-0.5 text-xs text-violet-800">
            {[voice.accent, voice.gender, voice.age, voice.language.toUpperCase()]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className="min-h-[36px] rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        >
          {selected ? t("studio.voiceLibrary.selected") : t("studio.voiceLibrary.select")}
        </button>
      </div>
      {voice.previewUrl && !previewError ?
        <div className="mt-2">
          <StudioAudioPreviewPlayer
            title={voice.name}
            audioUrl={voice.previewUrl}
            source="voice_library"
            variant="compact"
            className="border-violet-100"
          />
        </div>
      : previewError ?
        <p className="mt-2 text-xs text-red-700">{t("studio.voiceLibrary.previewFailed")}</p>
      : null}
      {voice.previewUrl ?
        <audio
          className="hidden"
          src={voice.previewUrl}
          onError={() => setPreviewError(true)}
          preload="none"
        />
      : null}
    </article>
  );
}

export function StudioCharacterVoiceLibrarySection({
  activeTab,
  voiceEnabled,
  selectedProfile,
  onSelectProfile,
  characterId,
  characterName = "",
  language = "en",
  canModify = false,
}: Props) {
  const t = useActiveTranslator();
  const library = useOptionalVoiceLibrary();
  const [filters, setFilters] = useState<VoiceLibraryFilters>({});
  const payload = library?.payload;

  const filteredVoices = useMemo(() => {
    if (!payload) {
      return [];
    }
    return filterVoiceLibrary(payload.catalog, filters).slice(0, 48);
  }, [payload, filters]);

  const selectedVoiceId = useMemo(() => {
    const ref = parseVoiceProfileRef(selectedProfile);
    return ref.kind === "library" ? ref.providerVoiceId : null;
  }, [selectedProfile]);

  const personaGroups = useMemo(() => {
    if (!payload) {
      return [];
    }
    const groups = new Map<string, typeof payload.personaPresets>();
    for (const preset of payload.personaPresets) {
      const list = groups.get(preset.groupId) ?? [];
      list.push(preset);
      groups.set(preset.groupId, list);
    }
    return [...groups.entries()];
  }, [payload]);

  if (activeTab === "my_voice") {
    return (
      <div className="mt-6">
        <StudioMyVoicesSection
          voiceEnabled={voiceEnabled}
          selectedProfile={selectedProfile}
          characterId={characterId}
          characterName={characterName}
          language={language}
          canModify={canModify}
          onSelectProfile={onSelectProfile}
        />
      </div>
    );
  }

  if (activeTab === "presets") {
    return (
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {STUDIO_VOICE_PROFILE_IDS.map((id) => {
          const selected = selectedProfile === id && !isClonedVoiceProfileRef(selectedProfile);
          return (
            <button
              key={id}
              type="button"
              disabled={!voiceEnabled}
              onClick={() => onSelectProfile(id)}
              className={`rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-50 ${
                selected
                  ? "border-violet-400 bg-violet-50 font-semibold text-violet-950"
                  : "border-violet-100 bg-white text-violet-900 hover:bg-violet-50/80"
              }`}
            >
              {t(getVoiceProfilePreset(id).labelKey as never)}
            </button>
          );
        })}
      </div>
    );
  }

  if (!library) {
    return null;
  }

  if (library.loading) {
    return (
      <p className="mt-4 text-sm text-violet-700">{t("studio.voiceLibrary.loading")}</p>
    );
  }

  if (library.error) {
    return (
      <p className="mt-4 text-sm text-red-700">{library.error}</p>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          {t("studio.voiceLibrary.personaPresets")}
        </h3>
        <p className="mt-1 text-xs text-violet-800">{t("studio.voiceLibrary.personaPresetsHint")}</p>
        <div className="mt-3 space-y-4">
          {personaGroups.map(([groupId, presets]) => (
            <div key={groupId}>
              <p className="text-xs font-semibold text-violet-950">
                {t(VOICE_PERSONA_GROUP_LABEL_KEYS[groupId as keyof typeof VOICE_PERSONA_GROUP_LABEL_KEYS] as never)}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {presets.map((preset) => {
                  const profileRef = formatLibraryVoiceProfileRef(preset.voiceId);
                  const selectedRef = parseVoiceProfileRef(selectedProfile);
                  const selected =
                    selectedProfile === profileRef ||
                    (selectedRef.kind === "library" && selectedRef.providerVoiceId === preset.voiceId);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!voiceEnabled}
                      onClick={() =>
                        onSelectProfile(profileRef, {
                          voiceName: preset.voiceName,
                          personaLabelKey: preset.labelKey,
                        })
                      }
                      className={`rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-50 ${
                        selected
                          ? "border-violet-400 bg-violet-50 font-semibold text-violet-950"
                          : "border-violet-100 bg-white text-violet-900 hover:bg-violet-50/80"
                      }`}
                    >
                      <span className="block font-semibold">{t(preset.labelKey as never)}</span>
                      <span className="mt-0.5 block text-[11px] text-violet-700">
                        {preset.voiceName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          {t("studio.voiceLibrary.title")}
        </h3>
        <p className="mt-1 text-xs text-violet-800">{t("studio.voiceLibrary.subtitle")}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-[11px] font-medium text-violet-900">
            {t("studio.voiceLibrary.filter.accent")}
            <select
              className="mt-1 w-full min-h-[40px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs"
              value={filters.accentId ?? ""}
              disabled={!voiceEnabled}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accentId: e.target.value || undefined }))
              }
            >
              <option value="">{t("studio.voiceLibrary.filter.all")}</option>
              {payload.filterOptions.accents.map((accent) => (
                <option key={accent.id} value={accent.id}>
                  {t(accent.labelKey as never)} ({accent.voiceCount})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-violet-900">
            {t("studio.voiceLibrary.filter.gender")}
            <select
              className="mt-1 w-full min-h-[40px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs"
              value={filters.gender ?? ""}
              disabled={!voiceEnabled}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, gender: e.target.value || undefined }))
              }
            >
              <option value="">{t("studio.voiceLibrary.filter.all")}</option>
              {payload.filterOptions.genders.map((gender) => (
                <option key={gender.value} value={gender.value}>
                  {t(gender.labelKey as never)} ({gender.voiceCount})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-violet-900">
            {t("studio.voiceLibrary.filter.language")}
            <select
              className="mt-1 w-full min-h-[40px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs"
              value={filters.language ?? ""}
              disabled={!voiceEnabled}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, language: e.target.value || undefined }))
              }
            >
              <option value="">{t("studio.voiceLibrary.filter.all")}</option>
              {payload.filterOptions.languages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.value.toUpperCase()} ({language.voiceCount})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-violet-900">
            {t("studio.voiceLibrary.filter.age")}
            <select
              className="mt-1 w-full min-h-[40px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs"
              value={filters.age ?? ""}
              disabled={!voiceEnabled}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, age: e.target.value || undefined }))
              }
            >
              <option value="">{t("studio.voiceLibrary.filter.all")}</option>
              {payload.filterOptions.ages.map((age) => (
                <option key={age.value} value={age.value}>
                  {t(age.labelKey as never)} ({age.voiceCount})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block text-[11px] font-medium text-violet-900">
          {t("studio.voiceLibrary.search")}
          <input
            type="search"
            className="mt-1 w-full min-h-[40px] rounded-lg border border-violet-200 bg-white px-3 py-1 text-xs"
            disabled={!voiceEnabled}
            value={filters.query ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value || undefined }))
            }
            placeholder={t("studio.voiceLibrary.searchPlaceholder")}
          />
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {filteredVoices.map((voice) => (
            <VoiceLibraryRow
              key={voice.id}
              voice={voice}
              selected={selectedVoiceId === voice.id}
              disabled={!voiceEnabled}
              onSelect={() =>
                onSelectProfile(formatLibraryVoiceProfileRef(voice.id), { voiceName: voice.name })
              }
            />
          ))}
        </div>
        {filteredVoices.length === 0 ?
          <p className="mt-3 text-xs text-violet-700">{t("studio.voiceLibrary.empty")}</p>
        : null}
      </section>
    </div>
  );
}
