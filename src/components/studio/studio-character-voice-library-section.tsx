"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { useActiveTranslator } from "@/i18n/client";
import {
  filterVoiceLibrary,
  type VoiceLibraryFilters,
} from "@/lib/studio-voice-accent-model";
import { isVoiceAccentMetadataMissing } from "@/lib/studio-voice-library-catalog";
import { StudioMyVoicesSection } from "@/components/studio/studio-my-voices-section";
import {
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import {
  isClonedVoiceProfileRef,
  parseVoiceProfileRef,
  safeFormatClonedVoiceProfileRef,
  safeFormatLibraryVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import { VOICE_PERSONA_GROUP_LABEL_KEYS } from "@/lib/studio-voice-persona-presets";
import type { VoiceLibraryPayload } from "@/lib/studio-voice-library-client";
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
  onSelect,
}: {
  voice: VoiceLibraryEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useActiveTranslator();
  const [previewError, setPreviewError] = useState(false);
  const missingAccent = isVoiceAccentMetadataMissing(voice);
  const metaParts = [voice.accent, voice.gender, voice.age, voice.language.toUpperCase()].filter(
    Boolean
  );
  const canSelect = Boolean(voice.id.trim());

  if (!canSelect) {
    return null;
  }

  return (
    <article
      className={`rounded-lg border p-3 ${selected ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-950">{voice.name}</p>
          <p className="mt-0.5 text-xs text-violet-800">
            {metaParts.length > 0 ? metaParts.join(" · ") : voice.name}
          </p>
          {missingAccent ?
            <p className="mt-1 text-[11px] text-violet-600">
              {t("studio.voiceLibrary.noAccentMetadata")}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={!canSelect}
          className="min-h-[44px] shrink-0 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
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

function VoiceLibraryBrowsePanel({
  payload,
  filters,
  setFilters,
  selectedVoiceId,
  onSelectProfile,
}: {
  payload: VoiceLibraryPayload;
  filters: VoiceLibraryFilters;
  setFilters: Dispatch<SetStateAction<VoiceLibraryFilters>>;
  selectedVoiceId: string | null;
  onSelectProfile: Props["onSelectProfile"];
}) {
  const t = useActiveTranslator();

  if (!payload) {
    return null;
  }

  const filteredVoices = filterVoiceLibrary(payload.catalog, filters).slice(0, 48);

  return (
    <section>
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
        <p className="text-sm font-semibold text-violet-950">{t("studio.voiceLibrary.discoverCta")}</p>
        <p className="mt-1 text-xs text-violet-800">{t("studio.voiceLibrary.accentSearchCta")}</p>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-900">
        {t("studio.voiceLibrary.title")}
      </h3>
      <p className="mt-1 text-xs text-violet-800">{t("studio.voiceLibrary.subtitle")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {payload.filterOptions.accents.length > 0 ?
          <label className="block text-xs font-medium text-violet-900">
            {t("studio.voiceLibrary.filter.accent")}
            <select
              className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
              value={filters.accentId ?? ""}
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
        : <p className="text-xs text-violet-700 sm:col-span-2">
            {t("studio.voiceLibrary.noAccentFilters")}
          </p>}
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.voiceLibrary.filter.gender")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={filters.gender ?? ""}
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
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.voiceLibrary.filter.language")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={filters.language ?? ""}
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
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.voiceLibrary.filter.age")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={filters.age ?? ""}
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

      <label className="mt-3 block text-xs font-medium text-violet-900">
        {t("studio.voiceLibrary.search")}
        <input
          type="search"
          className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
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
            onSelect={() => {
              const ref = safeFormatLibraryVoiceProfileRef(voice.id);
              if (!ref) {
                return;
              }
              onSelectProfile(ref, { voiceName: voice.name });
            }}
          />
        ))}
      </div>
      {filteredVoices.length === 0 ?
        <p className="mt-3 text-xs text-violet-700">{t("studio.voiceLibrary.empty")}</p>
      : null}
    </section>
  );
}

export function StudioCharacterVoiceLibrarySection({
  activeTab,
  voiceEnabled: _voiceEnabled,
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
              onClick={() => onSelectProfile(id)}
              className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm ${
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
    <div className="mt-6 space-y-8">
      <VoiceLibraryBrowsePanel
        payload={payload}
        filters={filters}
        setFilters={setFilters}
        selectedVoiceId={selectedVoiceId}
        onSelectProfile={onSelectProfile}
      />

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
                  const canSelect = preset.available && Boolean(preset.voiceId.trim());
                  const selectedRef = parseVoiceProfileRef(selectedProfile);
                  const selected =
                    canSelect &&
                    selectedRef.kind === "library" &&
                    selectedRef.providerVoiceId === preset.voiceId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => {
                        if (!canSelect) {
                          return;
                        }
                        const profileRef = safeFormatLibraryVoiceProfileRef(preset.voiceId);
                        if (!profileRef) {
                          return;
                        }
                        onSelectProfile(profileRef, {
                          voiceName: preset.voiceName,
                          personaLabelKey: preset.labelKey,
                        });
                      }}
                      className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm ${
                        !canSelect
                          ? "cursor-not-allowed border-violet-100 bg-violet-50/60 text-violet-500"
                          : selected
                          ? "border-violet-400 bg-violet-50 font-semibold text-violet-950"
                          : "border-violet-100 bg-white text-violet-900 hover:bg-violet-50/80"
                      }`}
                    >
                      <span className="block font-semibold">{t(preset.labelKey as never)}</span>
                      {canSelect ?
                        <span className="mt-0.5 block text-xs text-violet-700">
                          {preset.voiceName}
                        </span>
                      : <span className="mt-0.5 block text-xs text-violet-600">
                          {t((preset.unavailableReasonKey ?? "studio.voicePersona.unavailable.noMatch") as never)}
                        </span>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
