"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { StudioVoiceLibraryAdminAuditPanel } from "@/components/studio/studio-voice-library-admin-audit-panel";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildVoiceAccentCoverageReport,
  buildVoiceLibraryStats,
  voiceCategoryBadgeLabelKey,
  VOICE_DISCOVERY_ACCENT_IDS,
} from "@/lib/studio-voice-accent-coverage";
import {
  filterVoiceLibrary,
  type VoiceLibraryFilters,
} from "@/lib/studio-voice-accent-model";
import {
  isVoiceAccentMetadataMissing,
  isVoiceLanguageMetadataMissing,
} from "@/lib/studio-voice-library-catalog";
import { StudioMyVoicesSection } from "@/components/studio/studio-my-voices-section";
import {
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import {
  isClonedVoiceProfileRef,
  parseVoiceProfileRef,
  safeFormatLibraryVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import { VOICE_PERSONA_GROUP_LABEL_KEYS } from "@/lib/studio-voice-persona-presets";
import type { VoiceLibraryPayload } from "@/lib/studio-voice-library-client";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

export type VoiceLibraryTab = "presets" | "persona" | "my_voice";

const BROWSE_PAGE_SIZE = 24;

type Props = {
  activeTab: VoiceLibraryTab;
  voiceEnabled: boolean;
  selectedProfile: string;
  onSelectProfile: (profile: string, meta?: { voiceName?: string; personaLabelKey?: string }) => void;
  characterId?: string | null;
  characterName?: string;
  language?: string;
  canModify?: boolean;
  isAdmin?: boolean;
};

function VoiceLibraryStatsBanner({
  payload,
  filteredCount,
  visibleCount,
}: {
  payload: VoiceLibraryPayload;
  filteredCount: number;
  visibleCount: number;
}) {
  const t = useActiveTranslator();
  const stats =
    payload.stats ??
    buildVoiceLibraryStats({
      catalog: payload.catalog,
      filterOptions: payload.filterOptions,
      personaPresets: payload.personaPresets,
    });

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-4">
      <h3 className="text-sm font-bold text-violet-950">{t("studio.voiceLibrary.title")}</h3>
      <p className="mt-2 text-sm text-violet-900">
        {t("studio.voiceLibrary.stats.summary", {
          voices: stats.totalVoices,
          accents: stats.accentCount,
          languages: stats.languageCount,
          personas: stats.personaCount,
        })}
      </p>
      <p className="mt-1 text-xs text-violet-700">
        {t("studio.voiceLibrary.stats.available", { count: stats.totalVoices })}
      </p>
      <p className="mt-1 text-xs font-medium text-violet-800">
        {visibleCount >= filteredCount
          ? t("studio.voiceLibrary.stats.allVisible", { count: filteredCount })
          : t("studio.voiceLibrary.stats.visible", {
              visible: visibleCount,
              filtered: filteredCount,
            })}
      </p>
      <p className="mt-1 text-[11px] text-violet-600">
        {t("studio.voiceLibrary.stats.source", { source: stats.catalogSource })}
      </p>
    </div>
  );
}

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
  const missingLanguage = isVoiceLanguageMetadataMissing(voice);
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
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-violet-950">{voice.name}</p>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase text-violet-800">
              {t(voiceCategoryBadgeLabelKey(voice.category) as never)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-violet-800">
            {metaParts.length > 0 ? metaParts.join(" · ") : voice.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {missingAccent ?
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                {t("studio.voiceLibrary.badge.accentUnknown")}
              </span>
            : null}
            {missingLanguage ?
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                {t("studio.voiceLibrary.badge.languageUnknown")}
              </span>
            : null}
          </div>
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

function AccentDiscoverySection({
  payload,
  filters,
  setFilters,
}: {
  payload: VoiceLibraryPayload;
  filters: VoiceLibraryFilters;
  setFilters: Dispatch<SetStateAction<VoiceLibraryFilters>>;
}) {
  const t = useActiveTranslator();
  const coverage =
    payload.accentCoverage ??
    buildVoiceAccentCoverageReport({
      catalog: payload.catalog,
      personaPresets: payload.personaPresets,
      accentIds: VOICE_DISCOVERY_ACCENT_IDS,
    });

  return (
    <section className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
        {t("studio.voiceLibrary.discoverByAccent")}
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {coverage.map((row) => {
          const active = filters.accentId === row.accentId;
          return (
            <button
              key={row.accentId}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  accentId: active ? undefined : row.accentId,
                }))
              }
              className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "border-violet-500 bg-violet-600 text-white"
                  : row.voiceCount === 0
                  ? "border-violet-100 bg-violet-50/50 text-violet-500"
                  : "border-violet-200 bg-white text-violet-900 hover:bg-violet-50"
              }`}
            >
              {t(row.labelKey as never)} ({row.voiceCount})
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VoiceLibraryBrowsePanel({
  payload,
  filters,
  setFilters,
  selectedVoiceId,
  onSelectProfile,
  isAdmin,
}: {
  payload: VoiceLibraryPayload;
  filters: VoiceLibraryFilters;
  setFilters: Dispatch<SetStateAction<VoiceLibraryFilters>>;
  selectedVoiceId: string | null;
  onSelectProfile: Props["onSelectProfile"];
  isAdmin?: boolean;
}) {
  const t = useActiveTranslator();
  const filterKey = JSON.stringify(filters);

  const allFiltered = useMemo(
    () => filterVoiceLibrary(payload.catalog, filters),
    [payload.catalog, filters]
  );

  const [paging, setPaging] = useState({ filterKey, limit: BROWSE_PAGE_SIZE });
  const effectiveLimit = paging.filterKey === filterKey ? paging.limit : BROWSE_PAGE_SIZE;
  const visibleVoices = allFiltered.slice(0, effectiveLimit);
  const canLoadMore = effectiveLimit < allFiltered.length;

  return (
    <section>
      <VoiceLibraryStatsBanner
        payload={payload}
        filteredCount={allFiltered.length}
        visibleCount={visibleVoices.length}
      />

      <div className="mt-4 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
        <p className="text-sm font-semibold text-violet-950">{t("studio.voiceLibrary.discoverCta")}</p>
        <p className="mt-1 text-xs text-violet-800">{t("studio.voiceLibrary.accentSearchCta")}</p>
      </div>

      <AccentDiscoverySection payload={payload} filters={filters} setFilters={setFilters} />

      <p className="mt-4 text-xs text-violet-800">{t("studio.voiceLibrary.subtitle")}</p>

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
        {visibleVoices.map((voice) => (
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

      {canLoadMore ?
        <button
          type="button"
          onClick={() =>
            setPaging({ filterKey, limit: effectiveLimit + BROWSE_PAGE_SIZE })
          }
          className="mt-3 min-h-[44px] w-full rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50"
        >
          {t("studio.voiceLibrary.loadMore", {
            remaining: allFiltered.length - effectiveLimit,
          })}
        </button>
      : null}

      {allFiltered.length === 0 ?
        <p className="mt-3 text-xs text-violet-700">{t("studio.voiceLibrary.empty")}</p>
      : null}

      {isAdmin ?
        <StudioVoiceLibraryAdminAuditPanel />
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
  isAdmin = false,
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
        isAdmin={isAdmin}
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
                    <div
                      key={preset.id}
                      className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm ${
                        !canSelect
                          ? "border-amber-200 bg-amber-50/80 text-amber-950"
                          : selected
                          ? "border-violet-400 bg-violet-50 font-semibold text-violet-950"
                          : "border-violet-100 bg-white text-violet-900"
                      }`}
                    >
                      <span className="block font-semibold">{t(preset.labelKey as never)}</span>
                      {canSelect ?
                        <>
                          <span className="mt-0.5 block text-xs text-violet-700">
                            {preset.voiceName}
                          </span>
                          {preset.matchedAccentLabelKey ?
                            <span className="mt-0.5 block text-[11px] text-violet-600">
                              {t("studio.voicePersona.matchedAccent", {
                                accent: t(preset.matchedAccentLabelKey as never),
                              })}
                            </span>
                          : null}
                          {preset.matchingReason ?
                            <span className="mt-0.5 block text-[10px] text-violet-500">
                              {t("studio.voicePersona.matchingReason", {
                                reason: preset.matchingReason,
                              })}
                            </span>
                          : null}
                          <button
                            type="button"
                            onClick={() => {
                              const profileRef = safeFormatLibraryVoiceProfileRef(preset.voiceId);
                              if (!profileRef) {
                                return;
                              }
                              onSelectProfile(profileRef, {
                                voiceName: preset.voiceName,
                                personaLabelKey: preset.labelKey,
                              });
                            }}
                            className="mt-2 min-h-[36px] rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-50"
                          >
                            {selected
                              ? t("studio.voiceLibrary.selected")
                              : t("studio.voiceLibrary.select")}
                          </button>
                        </>
                      : <>
                          <span className="mt-0.5 block text-xs text-amber-800">
                            {t((preset.unavailableReasonKey ?? "studio.voicePersona.unavailable.noMatch") as never)}
                          </span>
                          {preset.unavailableSuggestionKey ?
                            <span className="mt-1 block text-[11px] text-amber-700">
                              {t(preset.unavailableSuggestionKey as never)}
                            </span>
                          : null}
                        </>
                      }
                    </div>
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
