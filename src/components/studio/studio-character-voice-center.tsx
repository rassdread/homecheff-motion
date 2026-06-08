"use client";

import { useCallback, useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";
import {
  requestCharacterVoicePreview,
  resolveDefaultCharacterPreviewText,
} from "@/lib/studio-character-voice-preview-client";
import {
  buildStoryAwareVoicePreviewText,
  computeVoiceCompatibilityScore,
  findMarketplaceEntryByProfileRef,
  type VoiceMarketplaceContext,
  type VoiceMarketplaceEntry,
} from "@/lib/studio-voice-marketplace";
import { voiceLanguageLabelKey } from "@/lib/studio-voice-language-labels";
import { appendVoiceSelectionMemory, parseVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import type { VoiceSelectMeta } from "@/components/studio/studio-character-voice-library-section";
import {
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
  normalizeStudioVoiceProfileId,
} from "@/lib/studio-voice-profiles";
import {
  DEFAULT_VOICE_PROFILE_FALLBACK,
  coerceVoiceProfileForStorage,
  isInvalidProviderVoiceProfileRef,
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  parseVoiceProfileRef,
  safeFormatClonedVoiceProfileRef,
  safeFormatLibraryVoiceProfileRef,
  validateVoiceProfileForSynthesis,
} from "@/lib/studio-voice-profile-ref";
import type { VoiceLibraryPayload } from "@/lib/studio-voice-library-client";
import { useOptionalUserVoiceLibrary } from "@/components/studio/studio-user-voice-library-provider";
import type { UserVoiceLibrary } from "@/types/studio-user-voice-library";
import {
  StudioCharacterVoiceLibrarySection,
  StudioVoicePersonaPresetsPanel,
  StudioVoiceRecommendationsPanel,
  type VoiceLibraryTab,
} from "@/components/studio/studio-character-voice-library-section";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { buildVoiceLibraryStats } from "@/lib/studio-voice-accent-coverage";
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

/** Default source tab — persona/library for discovery (not legacy presets). */
export function defaultVoiceLibraryTab(voiceProfile: string): VoiceLibraryTab {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone") {
    return "my_voice";
  }
  return "persona";
}

type Props = {
  characterId: string | null;
  characterName: string;
  value: CharacterVoiceFormState;
  onChange: (next: CharacterVoiceFormState) => void;
  canModify?: boolean;
  isAdmin?: boolean;
  marketplaceContext?: VoiceMarketplaceContext;
};

function normalizeVoiceProfileSelection(value: string): string {
  if (isInvalidProviderVoiceProfileRef(value)) {
    return DEFAULT_VOICE_PROFILE_FALLBACK;
  }
  const ref = parseVoiceProfileRef(value);
  if (ref.kind === "clone" || ref.kind === "library") {
    return ref.raw;
  }
  return normalizeStudioVoiceProfileId(value);
}

function resolveVoiceDisplayLabel(params: {
  voiceProfile: string;
  voiceDescription: string;
  t: (key: never, p?: Record<string, string>) => string;
  catalogVoiceName?: string;
}): string {
  if (isClonedVoiceProfileRef(params.voiceProfile)) {
    return params.voiceDescription.trim() || params.t("studio.voiceClone.clonedVoice" as never);
  }
  if (isLibraryVoiceProfileRef(params.voiceProfile)) {
    if (params.voiceDescription.trim()) {
      return params.voiceDescription.trim();
    }
    if (params.catalogVoiceName) {
      return params.catalogVoiceName;
    }
    return params.t("studio.voiceLibrary.libraryVoice" as never);
  }
  const preset = getVoiceProfilePreset(params.voiceProfile);
  return params.t(preset.labelKey as never);
}

export function hasLanguageVoiceOverrides(
  profiles: CharacterVoiceProfilesByLanguage
): boolean {
  return Object.values(profiles).some(
    (row) => Boolean(row?.voiceProfile?.trim()) || Boolean(row?.voiceProvider?.trim())
  );
}

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

function CharacterMainVoiceCard({
  voiceProfile,
  voiceDescription,
  voiceProvider,
  voiceEnabled,
  displayLabel,
  marketplaceEntry,
  compatibilityScore,
  catalogPreviewUrl,
  mainPreviewUrl,
  lastPreviewWasDraft,
  previewBusy,
  onPreview,
  t,
}: {
  voiceProfile: string;
  voiceDescription: string;
  voiceProvider: string;
  voiceEnabled: boolean;
  displayLabel: string;
  marketplaceEntry: VoiceMarketplaceEntry | null;
  compatibilityScore: number | null;
  catalogPreviewUrl?: string;
  mainPreviewUrl?: string;
  lastPreviewWasDraft: boolean;
  previewBusy: boolean;
  onPreview: () => void;
  t: (key: TranslationKey, p?: Record<string, string>) => string;
}) {
  const accentLabel = marketplaceEntry?.accentLabelKey
    ? t(marketplaceEntry.accentLabelKey as never)
    : marketplaceEntry?.accent || "—";
  const languageLabel = marketplaceEntry?.language
    ? t(voiceLanguageLabelKey(marketplaceEntry.language) as never)
    : "—";

  return (
    <section className="mt-6 rounded-xl border border-violet-300 bg-violet-50/80 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-violet-950">{t("studio.voiceCenter.mainVoiceTitle")}</h3>
      <p className="mt-1 text-xs text-violet-800">{t("studio.voiceCenter.mainVoiceSubtitle")}</p>

      <div className="mt-4 rounded-lg border border-violet-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-violet-950">{displayLabel}</p>
              <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("studio.voiceCenter.selectedVoiceBadge")}
              </span>
            </div>
            {marketplaceEntry ?
              <>
                <p className="mt-2 text-xs text-violet-800">
                  {[accentLabel, languageLabel, marketplaceEntry.gender, marketplaceEntry.age]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-violet-500">
                  {t("studio.voiceLibrary.providerLabel", { provider: marketplaceEntry.provider })}
                </p>
                {compatibilityScore !== null ?
                  <p className="mt-1 text-xs font-medium text-violet-700">
                    {t("studio.voiceLibrary.compatibilityScoreValue", {
                      score: String(compatibilityScore),
                    })}
                  </p>
                : null}
              </>
            : <p className="mt-2 text-xs text-violet-700">
                {voiceDescription.trim() || voiceProfile}
              </p>
            }
            <p className="mt-1 text-[10px] text-violet-600">
              {t("studio.characterVoice.provider")}: {voiceProvider || "elevenlabs"}
            </p>
          </div>
          <button
            type="button"
            disabled={!voiceEnabled || previewBusy}
            onClick={onPreview}
            className="min-h-[44px] shrink-0 rounded-full border border-violet-400 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            {previewBusy ? t("button.loading") : t("studio.voiceCenter.preview")}
          </button>
        </div>

        {mainPreviewUrl ?
          <div className="mt-3 space-y-1">
            {lastPreviewWasDraft ?
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                {t("studio.voiceCenter.draftPreviewBadge")}
              </p>
            : null}
            <StudioAudioPreviewPlayer
              title={t("studio.voiceCenter.lastPreview")}
              audioUrl={mainPreviewUrl}
              source="voice_character"
              variant="compact"
              className="border-violet-100"
            />
          </div>
        : catalogPreviewUrl ?
          <div className="mt-3">
            <StudioAudioPreviewPlayer
              title={displayLabel}
              audioUrl={catalogPreviewUrl}
              source="voice_library"
              variant="compact"
              className="border-violet-100"
            />
          </div>
        : null}
      </div>
    </section>
  );
}

export type PerLanguageVoiceOverrideOption = {
  value: string;
  label: string;
};

/** Presets + persona/library/clone refs for per-language override selects. */
export function buildPerLanguageVoiceOverrideOptions(params: {
  lang: VoiceCenterLanguage;
  t: (key: never, p?: Record<string, string>) => string;
  payload: VoiceLibraryPayload | null;
  clones: UserVoiceLibrary["voices"] | undefined;
  includeProfile?: string;
  catalogVoiceName?: string;
}): PerLanguageVoiceOverrideOption[] {
  const seen = new Set<string>();
  const options: PerLanguageVoiceOverrideOption[] = [];

  const add = (value: string, label: string) => {
    if (!value || seen.has(value) || isInvalidProviderVoiceProfileRef(value)) {
      return;
    }
    seen.add(value);
    options.push({ value, label });
  };

  for (const id of STUDIO_VOICE_PROFILE_IDS) {
    add(id, params.t(getVoiceProfilePreset(id).labelKey as never));
  }

  if (params.payload) {
    for (const preset of params.payload.personaPresets) {
      if (!preset.available || !preset.voiceId) {
        continue;
      }
      const ref = safeFormatLibraryVoiceProfileRef(preset.voiceId);
      if (!ref) {
        continue;
      }
      add(ref, params.t(preset.labelKey as never));
    }

    for (const voice of params.payload.catalog.voices.filter((v) => v.language === params.lang)) {
      const ref = safeFormatLibraryVoiceProfileRef(voice.id);
      if (ref) {
        add(ref, voice.name);
      }
    }
  }

  if (params.clones) {
    for (const clone of params.clones) {
      const ref = safeFormatClonedVoiceProfileRef(clone.cloneId);
      if (ref) {
        add(ref, clone.name);
      }
    }
  }

  const includeProfile = params.includeProfile?.trim();
  if (includeProfile && !seen.has(includeProfile) && !isInvalidProviderVoiceProfileRef(includeProfile)) {
    add(
      includeProfile,
      resolveVoiceDisplayLabel({
        voiceProfile: includeProfile,
        voiceDescription: "",
        t: params.t,
        catalogVoiceName: params.catalogVoiceName,
      })
    );
  }

  return options;
}

export function StudioCharacterVoiceCenter({
  characterId,
  characterName,
  value,
  onChange,
  canModify = true,
  isAdmin = false,
  marketplaceContext,
}: Props) {
  const t = useActiveTranslator();
  const voiceLibrary = useOptionalVoiceLibrary();
  const userVoiceLibrary = useOptionalUserVoiceLibrary();
  const [voiceLibraryTab, setVoiceLibraryTab] = useState<VoiceLibraryTab>(() =>
    defaultVoiceLibraryTab(value.voiceProfile)
  );
  const [previewByLang, setPreviewByLang] = useState<Partial<Record<VoiceCenterLanguage, string>>>(
    {}
  );
  const [previewBusyLang, setPreviewBusyLang] = useState<VoiceCenterLanguage | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [lastPreviewWasDraft, setLastPreviewWasDraft] = useState(false);
  const defaultPreviewText = useMemo(() => {
    if (marketplaceContext) {
      return buildStoryAwareVoicePreviewText({
        ...marketplaceContext,
        characterName,
        language: value.voiceLanguage,
      });
    }
    return resolveDefaultCharacterPreviewText(characterName, value.voiceLanguage);
  }, [characterName, value.voiceLanguage, marketplaceContext]);
  const [previewText, setPreviewText] = useState("");
  const [previewTextTouched, setPreviewTextTouched] = useState(false);
  const resolvedPreviewText = previewTextTouched ? previewText : defaultPreviewText;
  const [advancedLanguageOpen, setAdvancedLanguageOpen] = useState(false);
  const [useSameVoiceForAllLanguages, setUseSameVoiceForAllLanguages] = useState(
    () => !hasLanguageVoiceOverrides(value.voiceProfilesByLanguage)
  );

  const mainVoiceLang = (value.voiceLanguage as VoiceCenterLanguage) || "en";
  const mainPreviewUrl = previewByLang[mainVoiceLang];
  const mainPreviewBusy = previewBusyLang === mainVoiceLang;

  const voicePayload = voiceLibrary?.payload ?? null;
  const cloneVoices = userVoiceLibrary?.library?.voices;

  const marketplaceEntry = useMemo(() => {
    if (!voicePayload) {
      return null;
    }
    return findMarketplaceEntryByProfileRef(
      value.voiceProfile,
      voicePayload.catalog,
      cloneVoices ?? []
    );
  }, [voicePayload, value.voiceProfile, cloneVoices]);

  const selectionMemory = useMemo(
    () => parseVoiceSelectionMemory(value.voiceNotes),
    [value.voiceNotes]
  );

  const mainCompatibilityScore = useMemo(() => {
    if (!marketplaceEntry || !voicePayload) {
      return selectionMemory?.compatibilityScore ?? null;
    }
    const ctx: VoiceMarketplaceContext = {
      ...marketplaceContext,
      characterName,
      language: value.voiceLanguage,
      gender: value.voiceGender,
    };
    const match = computeVoiceCompatibilityScore(
      marketplaceEntry,
      ctx,
      voicePayload.personaPresets
    );
    return match.score;
  }, [
    marketplaceEntry,
    voicePayload,
    marketplaceContext,
    characterName,
    value.voiceLanguage,
    value.voiceGender,
    selectionMemory,
  ]);

  const libraryAvailabilityLine =
    voiceLibraryTab === "persona" && voiceLibrary?.payload
      ? (() => {
          const stats =
            voiceLibrary.payload.stats ??
            buildVoiceLibraryStats({
              catalog: voiceLibrary.payload.catalog,
              filterOptions: voiceLibrary.payload.filterOptions,
              personaPresets: voiceLibrary.payload.personaPresets,
            });
          return t("studio.voiceCenter.libraryAvailability", {
            voices: stats.totalVoices,
            accents: stats.accentCount,
          });
        })()
      : null;

  const invalidMainVoice = isInvalidProviderVoiceProfileRef(value.voiceProfile);
  const invalidLangOverrides = VOICE_CENTER_LANGUAGES.some((lang) => {
    const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage];
    return row?.voiceProfile ? isInvalidProviderVoiceProfileRef(row.voiceProfile) : false;
  });
  const showInvalidVoiceBanner = invalidMainVoice || invalidLangOverrides;

  const applyDefaultVoiceFallback = useCallback(() => {
    setPreviewError("");
    onChange({
      ...value,
      voiceProfile: DEFAULT_VOICE_PROFILE_FALLBACK,
      voiceProfilesByLanguage: Object.fromEntries(
        Object.entries(value.voiceProfilesByLanguage).map(([lang, row]) => [
          lang,
          row?.voiceProfile && isInvalidProviderVoiceProfileRef(row.voiceProfile)
            ? { ...row, voiceProfile: undefined }
            : row,
        ])
      ) as CharacterVoiceProfilesByLanguage,
    });
  }, [onChange, value]);

  const profileRef = parseVoiceProfileRef(value.voiceProfile);
  const catalogVoiceName =
    profileRef.kind === "library" && voiceLibrary?.payload
      ? voiceLibrary.payload.catalog.voices.find((v) => v.id === profileRef.providerVoiceId)?.name
      : undefined;

  const defaultProfileLabel = useMemo(
    () =>
      resolveVoiceDisplayLabel({
        voiceProfile: value.voiceProfile,
        voiceDescription: value.voiceDescription,
        t,
        catalogVoiceName,
      }),
    [value.voiceProfile, value.voiceDescription, t, catalogVoiceName]
  );

  const handleSelectProfile = useCallback(
    (profile: string, meta?: VoiceSelectMeta) => {
      const validation = validateVoiceProfileForSynthesis(profile);
      if (!validation.ok) {
        setPreviewError(t("studio.voiceLibrary.unavailableVoice" as never));
        return;
      }
      setPreviewError("");
      const voiceNotes =
        meta?.selectionMemory
          ? appendVoiceSelectionMemory(value.voiceNotes, meta.selectionMemory)
          : value.voiceNotes;
      onChange({
        ...value,
        voiceEnabled: true,
        voiceProfile: coerceVoiceProfileForStorage(profile),
        voiceDescription: meta?.personaLabelKey
          ? t(meta.personaLabelKey as never)
          : meta?.voiceName ?? value.voiceDescription,
        voiceNotes,
      });
    },
    [onChange, t, value]
  );

  const runPreview = useCallback(
    async (lang: VoiceCenterLanguage) => {
      const resolved = resolveLanguageVoice(value, lang);
      const validation = validateVoiceProfileForSynthesis(resolved.profile);
      if (!validation.ok) {
        setPreviewError(t("studio.voiceLibrary.unavailableVoice" as never));
        return;
      }
      setPreviewBusyLang(lang);
      setPreviewError("");
      try {
        const result = await requestCharacterVoicePreview({
          characterId,
          characterName,
          voiceProfile: resolved.profile,
          language: lang,
          sampleLine: resolvedPreviewText,
        });
        setPreviewByLang((prev) => ({ ...prev, [lang]: result.audioUrl }));
        setLastPreviewWasDraft(result.isDraft);
      } catch (e) {
        const code =
          e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
        if (code === "VOICE_LIBRARY_ACCESS_DENIED") {
          setPreviewError(t("studio.voiceLibrary.ttsAccessDenied" as never));
        } else {
          setPreviewError(e instanceof Error ? e.message : t("studio.voiceCenter.previewFailed"));
        }
      } finally {
        setPreviewBusyLang(null);
      }
    },
    [characterId, characterName, resolvedPreviewText, t, value]
  );

  const updateLang = (
    lang: VoiceCenterLanguage,
    patch: Partial<CharacterVoiceLanguageProfile>
  ) => {
    const nextProfile = patch.voiceProfile;
    if (nextProfile && isInvalidProviderVoiceProfileRef(nextProfile)) {
      setPreviewError(t("studio.voiceLibrary.unavailableVoice" as never));
      return;
    }
    const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage] ?? {};
    onChange({
      ...value,
      voiceProfilesByLanguage: {
        ...value.voiceProfilesByLanguage,
        [lang]: {
          ...row,
          ...patch,
          ...(nextProfile ? { voiceProfile: coerceVoiceProfileForStorage(nextProfile) } : {}),
        },
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

      {showInvalidVoiceBanner ?
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">
            {t("studio.voiceLibrary.unavailableVoice" as never)}
          </p>
          <p className="mt-1 text-xs text-amber-900">{t("studio.voiceCenter.invalidVoiceHint" as never)}</p>
          {canModify ?
            <button
              type="button"
              onClick={applyDefaultVoiceFallback}
              className="mt-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            >
              {t("studio.voiceCenter.useDefaultVoice" as never)}
            </button>
          : null}
        </div>
      : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-violet-900">
          {t("studio.characterVoice.language")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={value.voiceLanguage}
            onChange={(e) => onChange({ ...value, voiceLanguage: e.target.value })}
          >
            {VOICE_CENTER_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CharacterMainVoiceCard
        voiceProfile={value.voiceProfile}
        voiceDescription={value.voiceDescription}
        voiceProvider={value.voiceProvider}
        voiceEnabled={value.voiceEnabled}
        displayLabel={defaultProfileLabel}
        marketplaceEntry={marketplaceEntry}
        compatibilityScore={mainCompatibilityScore}
        catalogPreviewUrl={marketplaceEntry?.previewUrl}
        mainPreviewUrl={mainPreviewUrl}
        lastPreviewWasDraft={lastPreviewWasDraft}
        previewBusy={mainPreviewBusy}
        onPreview={() => void runPreview(mainVoiceLang)}
        t={t}
      />

      <p className="mt-4 text-xs text-violet-700/90">{t("studio.voiceCenter.previewTextAutoHint")}</p>

      {voicePayload && voiceLibrary?.voicesReady ?
        <StudioVoiceRecommendationsPanel
          payload={voicePayload}
          marketplaceContext={{
            ...marketplaceContext,
            characterName,
            language: value.voiceLanguage,
            gender: value.voiceGender,
          }}
          selectedProfile={value.voiceProfile}
          onSelectProfile={handleSelectProfile}
          characterId={characterId}
          characterName={characterName}
          language={value.voiceLanguage}
          previewText={resolvedPreviewText}
          onPreviewError={setPreviewError}
        />
      : voiceLibrary?.loadingVoices ?
        <p className="mt-6 text-sm text-violet-700">{t("studio.voiceLibrary.loadingVoices")}</p>
      : null}

      {voicePayload ?
        <StudioVoicePersonaPresetsPanel
          personaPresets={voicePayload.personaPresets}
          selectedProfile={value.voiceProfile}
          onSelectProfile={handleSelectProfile}
          characterId={characterId}
          characterName={characterName}
          language={value.voiceLanguage}
          previewText={resolvedPreviewText}
          onPreviewError={setPreviewError}
        />
      : null}

      <div className="mt-6">
        <h3 className="text-sm font-bold text-violet-950">{t("studio.voiceCenter.chooseVoice")}</h3>
        {!value.voiceEnabled ?
          <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
            {t("studio.voiceCenter.enableToUseHint")}
          </p>
        : null}
        <p className="mt-2 text-xs text-violet-800">{t("studio.voiceCenter.browseBeforeEnableHint")}</p>
        {libraryAvailabilityLine ?
          <p className="mt-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
            {libraryAvailabilityLine}
          </p>
        : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["presets", "studio.voiceCenter.source.preset"],
              ["persona", "studio.voiceCenter.source.persona"],
              ["my_voice", "studio.voiceCenter.source.myVoice"],
            ] as const
          ).map(([tab, labelKey]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setVoiceLibraryTab(tab)}
              className={`min-h-[44px] rounded-full px-4 py-2.5 text-sm font-semibold ${
                voiceLibraryTab === tab
                  ? "bg-violet-700 text-white"
                  : "border border-violet-200 bg-white text-violet-900 hover:bg-violet-50"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <StudioCharacterVoiceLibrarySection
        activeTab={voiceLibraryTab}
        voiceEnabled={value.voiceEnabled}
        selectedProfile={value.voiceProfile}
        characterId={characterId}
        characterName={characterName}
        language={value.voiceLanguage}
        canModify={canModify}
        isAdmin={isAdmin}
        marketplaceContext={{
          ...marketplaceContext,
          characterName,
          language: value.voiceLanguage,
          gender: value.voiceGender,
        }}
        onSelectProfile={handleSelectProfile}
      />

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setAdvancedLanguageOpen((open) => !open)}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-left text-sm font-semibold text-violet-950 hover:bg-violet-50/80"
          aria-expanded={advancedLanguageOpen}
        >
          <span aria-hidden className="text-violet-600">
            {advancedLanguageOpen ? "▼" : "▶"}
          </span>
          {t("studio.voiceCenter.advancedLanguageTitle")}
        </button>
        <p className="mt-1 px-1 text-xs text-violet-700">{t("studio.voiceCenter.advancedLanguageOptional")}</p>

        {advancedLanguageOpen ?
          <div className="mt-3 space-y-4 rounded-xl border border-violet-100 bg-white/80 p-4">
            <label className="block text-xs font-medium text-violet-900">
              {t("studio.voiceCenter.previewTextLabel")}
              <textarea
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                rows={2}
                value={resolvedPreviewText}
                placeholder={defaultPreviewText}
                onChange={(e) => {
                  setPreviewTextTouched(true);
                  setPreviewText(e.target.value);
                }}
              />
              <span className="mt-1 block text-[11px] text-violet-700/90">
                {t("studio.voiceCenter.previewTextHint")}
              </span>
            </label>

            <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-violet-950">
              <input
                type="checkbox"
                checked={useSameVoiceForAllLanguages}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseSameVoiceForAllLanguages(checked);
                  if (checked) {
                    onChange({ ...value, voiceProfilesByLanguage: {} });
                  }
                }}
              />
              {t("studio.voiceCenter.sameVoiceForAllLanguages")}
            </label>

            {!useSameVoiceForAllLanguages || isAdmin ?
              <div className="space-y-3">
                {isAdmin && useSameVoiceForAllLanguages ?
                  <p className="text-xs text-violet-700">{t("studio.voiceCenter.adminOverridesHint")}</p>
                : null}
                {VOICE_CENTER_LANGUAGES.map((lang) => {
                  const resolved = resolveLanguageVoice(value, lang);
                  const row = value.voiceProfilesByLanguage[lang as StudioVoiceExecutionLanguage] ?? {};
                  const profileRefLang = parseVoiceProfileRef(resolved.profile);
                  const rowProfileRef = parseVoiceProfileRef(row.voiceProfile ?? "");
                  const langCatalogName =
                    profileRefLang.kind === "library" && voiceLibrary?.payload
                      ? voiceLibrary.payload.catalog.voices.find(
                          (v) => v.id === profileRefLang.providerVoiceId
                        )?.name
                      : undefined;
                  const rowCatalogName =
                    rowProfileRef.kind === "library" && voiceLibrary?.payload
                      ? voiceLibrary.payload.catalog.voices.find(
                          (v) => v.id === rowProfileRef.providerVoiceId
                        )?.name
                      : undefined;
                  const activeLabel = resolveVoiceDisplayLabel({
                    voiceProfile: resolved.profile,
                    voiceDescription: row.voiceDescription ?? value.voiceDescription,
                    t,
                    catalogVoiceName: langCatalogName,
                  });
                  const previewUrl = previewByLang[lang];

                  return (
                    <article
                      key={lang}
                      className={`rounded-xl border bg-white p-4 shadow-sm ${
                        isAdmin && useSameVoiceForAllLanguages
                          ? "border-dashed border-violet-200 bg-violet-50/40"
                          : "border-violet-100"
                      }`}
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
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next) {
                                setUseSameVoiceForAllLanguages(false);
                              }
                              updateLang(lang, {
                                voiceProfile: next ? normalizeVoiceProfileSelection(next) : undefined,
                              });
                            }}
                          >
                            <option value="">{t("studio.characterVoice.languageProfileInherit")}</option>
                            {buildPerLanguageVoiceOverrideOptions({
                              lang,
                              t,
                              payload: voiceLibrary?.payload ?? null,
                              clones: userVoiceLibrary?.library?.voices,
                              includeProfile: row.voiceProfile,
                              catalogVoiceName: rowCatalogName,
                            }).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex flex-col justify-end gap-2">
                          <button
                            type="button"
                            disabled={previewBusyLang === lang}
                            onClick={() => void runPreview(lang)}
                            className="min-h-[44px] rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                          >
                            {previewBusyLang === lang
                              ? t("button.loading")
                              : t("studio.voiceCenter.preview")}
                          </button>
                        </div>
                      </div>

                      {previewUrl ?
                        <div className="mt-3 space-y-1">
                          {lastPreviewWasDraft ?
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                              {t("studio.voiceCenter.draftPreviewBadge")}
                            </p>
                          : null}
                          <StudioAudioPreviewPlayer
                            title={t("studio.voiceCenter.lastPreview")}
                            audioUrl={previewUrl}
                            source="voice_character"
                            variant="compact"
                            className="border-violet-100"
                          />
                        </div>
                      : null}
                    </article>
                  );
                })}
              </div>
            : null}
          </div>
        : null}
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
