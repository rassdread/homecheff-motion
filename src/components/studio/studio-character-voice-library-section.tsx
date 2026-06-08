"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useOptionalUserVoiceLibrary } from "@/components/studio/studio-user-voice-library-provider";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildVoiceAccentCoverageReport,
  buildVoiceLibraryStats,
  voiceCategoryBadgeLabelKey,
  VOICE_DISCOVERY_ACCENT_IDS,
} from "@/lib/studio-voice-accent-coverage";
import {
  CANONICAL_ACCENT_DEFINITIONS,
  type VoiceLibraryFilters,
} from "@/lib/studio-voice-accent-model";
import { voiceLanguageLabelKey } from "@/lib/studio-voice-language-labels";
import type { VoiceLibraryPayload } from "@/lib/studio-voice-library-client";
import {
  buildMarketplaceEntries,
  buildVoiceRecommendations,
  computeVoiceCompatibilityScore,
  filterMarketplaceEntries,
  type VoiceMarketplaceContext,
  type VoiceMarketplaceEntry,
  type VoiceRecommendation,
} from "@/lib/studio-voice-marketplace";
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
import type { VoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";

export type VoiceLibraryTab = "presets" | "persona" | "my_voice";

const BROWSE_PAGE_SIZE = 24;

export type VoiceSelectMeta = {
  voiceName?: string;
  personaLabelKey?: string;
  selectionMemory?: VoiceSelectionMemory;
};

type Props = {
  activeTab: VoiceLibraryTab;
  voiceEnabled: boolean;
  selectedProfile: string;
  onSelectProfile: (profile: string, meta?: VoiceSelectMeta) => void;
  characterId?: string | null;
  characterName?: string;
  language?: string;
  canModify?: boolean;
  isAdmin?: boolean;
  marketplaceContext?: VoiceMarketplaceContext;
};

function accentLabelForFilter(accentId: string, t: (key: never) => string): string {
  const def = CANONICAL_ACCENT_DEFINITIONS.find((d) => d.id === accentId);
  return def ? t(def.labelKey as never) : accentId;
}

function VoiceMarketplaceActiveFilters({
  filters,
  setFilters,
  payload,
}: {
  filters: VoiceLibraryFilters;
  setFilters: Dispatch<SetStateAction<VoiceLibraryFilters>>;
  payload: VoiceLibraryPayload;
}) {
  const t = useActiveTranslator();
  const chips: Array<{ key: keyof VoiceLibraryFilters; label: string }> = [];

  if (filters.accentId) {
    chips.push({ key: "accentId", label: accentLabelForFilter(filters.accentId, t) });
  }
  if (filters.language) {
    const langKey = voiceLanguageLabelKey(filters.language);
    chips.push({ key: "language", label: t(langKey as never) });
  }
  if (filters.gender) {
    const gender = payload.filterOptions.genders.find((g) => g.value === filters.gender);
    chips.push({
      key: "gender",
      label: gender ? t(gender.labelKey as never) : filters.gender,
    });
  }
  if (filters.age) {
    const age = payload.filterOptions.ages.find((a) => a.value === filters.age);
    chips.push({
      key: "age",
      label: age ? t(age.labelKey as never) : filters.age,
    });
  }
  if (filters.category) {
    const cat = payload.filterOptions.categories?.find((c) => c.value === filters.category);
    chips.push({
      key: "category",
      label: cat ? t(cat.labelKey as never) : filters.category,
    });
  }
  if (filters.query?.trim()) {
    chips.push({ key: "query", label: `"${filters.query.trim()}"` });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-violet-800">{t("studio.voiceLibrary.activeFilters")}</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, [chip.key]: undefined }))}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100"
        >
          {chip.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setFilters({})}
        className="text-xs font-semibold text-[#0067B1] hover:underline"
      >
        {t("studio.voiceLibrary.resetFilters")}
      </button>
    </div>
  );
}

function VoiceMarketplaceAccentChips({
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
    <div className="mt-4">
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
    </div>
  );
}

function VoiceRecommendationCard({
  recommendation,
  selected,
  onSelect,
}: {
  recommendation: VoiceRecommendation;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useActiveTranslator();
  const { entry, compatibilityScore, starRating } = recommendation;
  const stars = "★".repeat(starRating) + "☆".repeat(5 - starRating);

  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-950">{entry.name}</p>
          <p className="mt-0.5 text-xs text-amber-900" aria-label={t("studio.voiceLibrary.compatibilityScore")}>
            {stars} · {compatibilityScore}%
          </p>
          {entry.accentLabelKey ?
            <p className="mt-0.5 text-xs text-violet-800">
              {t(entry.accentLabelKey as never)}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="min-h-[40px] shrink-0 rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
        >
          {selected ? t("studio.voiceLibrary.selected") : t("studio.voiceLibrary.select")}
        </button>
      </div>
    </article>
  );
}

function VoiceMarketplaceCard({
  entry,
  selected,
  compatibilityScore,
  onSelect,
}: {
  entry: VoiceMarketplaceEntry;
  selected: boolean;
  compatibilityScore?: number;
  onSelect: () => void;
}) {
  const t = useActiveTranslator();
  const [previewError, setPreviewError] = useState(false);

  const accentLabel = entry.accentLabelKey
    ? t(entry.accentLabelKey as never)
    : entry.accent || t("studio.voiceLibrary.badge.accentUnknown" as never);
  const languageLabel = entry.language
    ? t(voiceLanguageLabelKey(entry.language) as never)
    : t("studio.voiceLibrary.badge.languageUnknown" as never);
  const categoryKey =
    entry.isMyVoice
      ? "studio.voiceLibrary.badge.myVoice"
      : voiceCategoryBadgeLabelKey(entry.category);

  return (
    <article
      className={`rounded-lg border p-3 ${selected ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-violet-950">{entry.name}</p>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase text-violet-800">
              {t(categoryKey as never)}
            </span>
            {entry.isMyVoice ?
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                {t("studio.voiceLibrary.badge.myVoice")}
              </span>
            : null}
          </div>
          <p className="mt-1 text-xs text-violet-800">
            {[accentLabel, languageLabel, entry.gender, entry.age].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-violet-500">
            {t("studio.voiceLibrary.providerLabel", { provider: entry.provider })}
          </p>
          {compatibilityScore !== undefined ?
            <p className="mt-1 text-xs font-medium text-violet-700">
              {t("studio.voiceLibrary.compatibilityScoreValue", { score: compatibilityScore })}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="min-h-[44px] shrink-0 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50"
        >
          {selected ? t("studio.voiceLibrary.selected") : t("studio.voiceLibrary.select")}
        </button>
      </div>
      {entry.previewUrl && !previewError ?
        <div className="mt-2">
          <StudioAudioPreviewPlayer
            title={entry.name}
            audioUrl={entry.previewUrl}
            source="voice_library"
            variant="compact"
            className="border-violet-100"
          />
        </div>
      : previewError ?
        <p className="mt-2 text-xs text-red-700">{t("studio.voiceLibrary.previewFailed")}</p>
      : null}
      {entry.previewUrl ?
        <audio
          className="hidden"
          src={entry.previewUrl}
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
  selectedProfile,
  onSelectProfile,
  marketplaceContext,
}: {
  payload: VoiceLibraryPayload;
  filters: VoiceLibraryFilters;
  setFilters: Dispatch<SetStateAction<VoiceLibraryFilters>>;
  selectedProfile: string;
  onSelectProfile: Props["onSelectProfile"];
  marketplaceContext: VoiceMarketplaceContext;
}) {
  const t = useActiveTranslator();
  const userVoiceLibrary = useOptionalUserVoiceLibrary();
  const filterKey = JSON.stringify(filters);

  const clones = userVoiceLibrary?.library?.voices ?? [];

  const recommendations = useMemo(
    () =>
      buildVoiceRecommendations({
        catalog: payload.catalog,
        clones,
        context: marketplaceContext,
        personaPresets: payload.personaPresets,
        limit: 6,
      }),
    [payload.catalog, payload.personaPresets, clones, marketplaceContext]
  );

  const allFiltered = useMemo(() => {
    const entries = buildMarketplaceEntries(payload.catalog, clones);
    return filterMarketplaceEntries(entries, filters);
  }, [payload.catalog, clones, filters]);

  const [paging, setPaging] = useState({ filterKey, limit: BROWSE_PAGE_SIZE });
  const effectiveLimit = paging.filterKey === filterKey ? paging.limit : BROWSE_PAGE_SIZE;
  const visibleEntries = allFiltered.slice(0, effectiveLimit);
  const canLoadMore = effectiveLimit < allFiltered.length;

  const stats =
    payload.stats ??
    buildVoiceLibraryStats({
      catalog: payload.catalog,
      filterOptions: payload.filterOptions,
      personaPresets: payload.personaPresets,
    });

  const handleSelectEntry = (entry: VoiceMarketplaceEntry, personaLabelKey?: string) => {
    const match = computeVoiceCompatibilityScore(entry, marketplaceContext, payload.personaPresets);
    const memory: VoiceSelectionMemory = {
      selectedAt: new Date().toISOString(),
      profileRef: entry.profileRef,
      voiceName: entry.name,
      compatibilityScore: match.score,
      matchedAccentId: entry.accentCanonicalId,
      matchedAccentLabelKey: entry.accentLabelKey,
      personaPresetId: personaLabelKey ? null : match.personaPresetId,
      personaLabelKey: personaLabelKey ?? match.personaLabelKey,
      matchingReasons: match.reasons,
    };
    onSelectProfile(entry.profileRef, {
      voiceName: entry.name,
      personaLabelKey,
      selectionMemory: memory,
    });
  };

  return (
    <section>
      <div className="rounded-xl border border-violet-200 bg-white p-4">
        <h3 className="text-sm font-bold text-violet-950">{t("studio.voiceLibrary.title")}</h3>
        <p className="mt-1 text-xs text-violet-700">
          {t("studio.voiceLibrary.stats.summary", {
            voices: stats.totalVoices,
            accents: stats.accentCount,
            languages: stats.languageCount,
            personas: stats.personaCount,
          })}
        </p>
        {stats.paginationLimited ?
          <p className="mt-1 text-xs text-amber-800">{t("studio.voiceLibrary.catalogLimited")}</p>
        : null}
      </div>

      {recommendations.length > 0 ?
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
            {t("studio.voiceLibrary.recommendations")}
          </h4>
          <p className="mt-1 text-xs text-violet-700">{t("studio.voiceLibrary.recommendationsHint")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {recommendations.map((rec) => (
              <VoiceRecommendationCard
                key={rec.entry.id}
                recommendation={rec}
                selected={selectedProfile === rec.entry.profileRef}
                onSelect={() =>
                  handleSelectEntry(rec.entry, rec.personaLabelKey ?? undefined)
                }
              />
            ))}
          </div>
        </div>
      : null}

      <label className="mt-4 block text-xs font-medium text-violet-900">
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

      <VoiceMarketplaceAccentChips payload={payload} filters={filters} setFilters={setFilters} />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                {t(voiceLanguageLabelKey(language.value) as never)} ({language.voiceCount})
              </option>
            ))}
          </select>
        </label>
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
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.voiceLibrary.filter.category")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={filters.category ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value || undefined }))
            }
          >
            <option value="">{t("studio.voiceLibrary.filter.all")}</option>
            {(payload.filterOptions.categories ?? []).map((category) => (
              <option key={category.value} value={category.value}>
                {t(category.labelKey as never)} ({category.voiceCount})
              </option>
            ))}
            <option value="my_clone">{t("studio.voiceLibrary.badge.myVoice")}</option>
          </select>
        </label>
      </div>

      <VoiceMarketplaceActiveFilters filters={filters} setFilters={setFilters} payload={payload} />

      <p className="mt-4 text-xs font-medium text-violet-800">
        {visibleEntries.length >= allFiltered.length
          ? t("studio.voiceLibrary.stats.allVisible", { count: allFiltered.length })
          : t("studio.voiceLibrary.stats.visible", {
              visible: visibleEntries.length,
              filtered: allFiltered.length,
            })}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visibleEntries.map((entry) => {
          const match = computeVoiceCompatibilityScore(entry, marketplaceContext, payload.personaPresets);
          return (
            <VoiceMarketplaceCard
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              selected={selectedProfile === entry.profileRef}
              compatibilityScore={match.score}
              onSelect={() => handleSelectEntry(entry)}
            />
          );
        })}
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
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("studio.voiceLibrary.emptyWithFilters")}
        </p>
      : null}
    </section>
  );
}

export function StudioCharacterVoiceLibrarySection({
  activeTab,
  voiceEnabled: _voiceEnabled,
  selectedProfile,
  onSelectProfile,
  characterId: _characterId,
  characterName = "",
  language = "en",
  canModify: _canModify = false,
  isAdmin: _isAdmin = false,
  marketplaceContext: marketplaceContextProp,
}: Props) {
  const t = useActiveTranslator();
  const library = useOptionalVoiceLibrary();
  const [filters, setFilters] = useState<VoiceLibraryFilters>({});
  const payload = library?.payload;

  const marketplaceContext: VoiceMarketplaceContext = useMemo(
    () => ({
      characterName,
      language,
      ...marketplaceContextProp,
    }),
    [characterName, language, marketplaceContextProp]
  );

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
          characterId={_characterId}
          characterName={characterName}
          language={language}
          canModify={_canModify}
          onSelectProfile={onSelectProfile}
        />
        <p className="mt-4 text-xs text-violet-700">{t("studio.voiceLibrary.clonesInLibraryHint")}</p>
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
        selectedProfile={selectedProfile}
        onSelectProfile={onSelectProfile}
        marketplaceContext={marketplaceContext}
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
                          {preset.personaScore > 0 ?
                            <span className="mt-0.5 block text-xs text-violet-800">
                              {t("studio.voicePersona.personaScore", { score: preset.personaScore })}
                            </span>
                          : null}
                          {preset.matchedAccentLabelKey ?
                            <span className="mt-0.5 block text-[11px] text-violet-600">
                              {t("studio.voicePersona.matchedAccent", {
                                accent: t(preset.matchedAccentLabelKey as never),
                              })}
                            </span>
                          : null}
                          {preset.matchReasonKeys.length > 0 ?
                            <ul className="mt-1 list-inside list-disc text-[10px] text-violet-600">
                              {preset.matchReasonKeys.map((key) => (
                                <li key={key}>{t(key as never)}</li>
                              ))}
                            </ul>
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
