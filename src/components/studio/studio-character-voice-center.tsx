"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import {
  requestCharacterVoicePreview,
  resolveDefaultCharacterPreviewText,
} from "@/lib/studio-character-voice-preview-client";
import {
  buildStoryAwareVoicePreviewText,
  type VoiceMarketplaceContext,
} from "@/lib/studio-voice-marketplace";
import { appendVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import type { VoiceSelectMeta, VoiceLibraryTab } from "@/components/studio/studio-character-voice-library-section";
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
import { VoiceCenterCollapsibleSection } from "@/components/studio/voice-center-collapsible-section";
import { StudioMyVoicesSection } from "@/components/studio/studio-my-voices-section";
import { StudioVoiceCatalogBrowser } from "@/components/studio/studio-voice-catalog-browser";
import { StudioCharacterVoiceSharedPreview } from "@/components/studio/studio-character-voice-shared-preview";
import { playVoiceLibrarySample } from "@/lib/studio-voice-library-sample";
import { useOptionalVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { buildVoiceLibraryStats } from "@/lib/studio-voice-accent-coverage";
import { PREVIEW_TEXT_DEBOUNCE_MS } from "@/lib/studio-voice-center-ux";
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
  speechSpeed: number;
  voiceProfilesByLanguage: CharacterVoiceProfilesByLanguage;
};

export function characterVoiceStateFromDetail(
  character: StudioCharacterListItem
): CharacterVoiceFormState {
  return {
    voiceEnabled: character.voiceEnabled,
    voiceProvider: character.voiceProvider || "elevenlabs",
    voiceProfile: character.voiceProfile || "",
    voiceLanguage: character.voiceLanguage || "en",
    voiceGender: character.voiceGender || "",
    voiceDescription: character.voiceDescription || "",
    voiceNotes: character.voiceNotes || "",
    voiceLock: character.voiceLock,
    speechSpeed: character.speechSpeed ?? 1,
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
  if (!params.voiceProfile.trim()) {
    return "Geen stem gekozen";
  }
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
  const [previewByLang, setPreviewByLang] = useState<Partial<Record<VoiceCenterLanguage, string>>>(
    {}
  );
  const [previewBusyLang, setPreviewBusyLang] = useState<VoiceCenterLanguage | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewNotice, setPreviewNotice] = useState("");
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
  const [previewTextInput, setPreviewTextInput] = useState("");
  const [previewTextTouched, setPreviewTextTouched] = useState(false);
  const [appliedPreviewTextOverride, setAppliedPreviewTextOverride] = useState<string | null>(
    null
  );
  const [advancedLanguageOpen, setAdvancedLanguageOpen] = useState(false);
  const [adminDebugOverridesOpen, setAdminDebugOverridesOpen] = useState(false);
  const [useSameVoiceForAllLanguages, setUseSameVoiceForAllLanguages] = useState(
    () => !hasLanguageVoiceOverrides(value.voiceProfilesByLanguage)
  );
  const [voicePickerTab, setVoicePickerTab] = useState<"recommended" | "all" | "mine">("recommended");
  const [sampleByProfile, setSampleByProfile] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!previewTextTouched) {
      return;
    }
    const id = window.setTimeout(() => {
      setAppliedPreviewTextOverride(previewTextInput.trim() || defaultPreviewText);
    }, PREVIEW_TEXT_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [previewTextInput, previewTextTouched, defaultPreviewText]);

  const appliedPreviewText = useMemo(() => {
    if (!previewTextTouched) {
      return defaultPreviewText;
    }
    return appliedPreviewTextOverride ?? (previewTextInput.trim() || defaultPreviewText);
  }, [
    appliedPreviewTextOverride,
    defaultPreviewText,
    previewTextInput,
    previewTextTouched,
  ]);

  const flushPreviewText = useCallback(() => {
    if (!previewTextTouched) {
      setAppliedPreviewTextOverride(null);
      return;
    }
    setAppliedPreviewTextOverride(previewTextInput.trim() || defaultPreviewText);
  }, [previewTextInput, previewTextTouched, defaultPreviewText]);

  const mainVoiceLang = (value.voiceLanguage as VoiceCenterLanguage) || "en";
  const mainPreviewUrl = previewByLang[mainVoiceLang];
  const mainPreviewBusy = previewBusyLang === mainVoiceLang;
  const previewSignature = `${value.voiceProfile}|${value.speechSpeed}|${value.voiceLanguage}|${appliedPreviewText}`;
  const previewSignatureRef = useRef(previewSignature);
  useEffect(() => {
    if (previewSignatureRef.current === previewSignature) {
      return;
    }
    previewSignatureRef.current = previewSignature;
    setPreviewByLang({});
    setPreviewNotice("");
  }, [previewSignature]);

  const voicePayload = voiceLibrary?.payload ?? null;

  const libraryStats = useMemo(() => {
    if (!voicePayload) {
      return null;
    }
    return (
      voicePayload.stats ??
      buildVoiceLibraryStats({
        catalog: voicePayload.catalog,
        filterOptions: voicePayload.filterOptions,
        personaPresets: voicePayload.personaPresets,
      })
    );
  }, [voicePayload]);

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
      const storedProfile = coerceVoiceProfileForStorage(profile);
      if (meta?.previewUrl) {
        setSampleByProfile((current) => ({ ...current, [storedProfile]: meta.previewUrl ?? "" }));
      }
      onChange({
        ...value,
        voiceEnabled: true,
        voiceProfile: storedProfile,
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
      flushPreviewText();
      const resolved = resolveLanguageVoice(value, lang);
      const validation = validateVoiceProfileForSynthesis(resolved.profile);
      if (!validation.ok) {
        setPreviewError(t("studio.voiceLibrary.unavailableVoice" as never));
        return;
      }
      setPreviewBusyLang(lang);
      setPreviewError("");
      setPreviewNotice("");
      const sampleLine = previewTextTouched
        ? previewTextInput.trim() || defaultPreviewText
        : defaultPreviewText;
      try {
        const result = await requestCharacterVoicePreview({
          characterId,
          characterName,
          voiceProfile: resolved.profile,
          language: lang,
          sampleLine,
          speechSpeed: value.speechSpeed,
        });
        setPreviewNotice(
          result.free
            ? "Gratis voorbeeld. Er is geen Studio HC gebruikt."
            : "Voorbeeld afgespeeld na bevestiging van de Studio HC-kosten."
        );
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
    [
      characterId,
      characterName,
      defaultPreviewText,
      flushPreviewText,
      previewTextInput,
      previewTextTouched,
      t,
      value,
    ]
  );

  const showLanguageOverrideCards =
    !useSameVoiceForAllLanguages || (isAdmin && adminDebugOverridesOpen);

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
        <p className="basis-full text-xs text-zinc-600">
          Inschakelen laat renders deze stem gebruiken. Zonder vinkje blijft een gekozen stem bewaard als keuze, maar scènes spreken hem niet.
        </p>
        <p className="basis-full text-xs text-zinc-600">
          Vergrendelen houdt deze stem vast in scènes. Je kunt hier nog een andere stem kiezen. Vink uit om te ontgrendelen, en sla daarna op.
        </p>
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-800">
        {!value.voiceProfile.trim()
          ? "Stem: niet gekozen"
          : !value.voiceEnabled
            ? "Stem gekozen, nog niet ingeschakeld"
            : value.voiceLock
              ? "Stem ingeschakeld en vergrendeld. Sla op om dit te bewaren."
              : "Stem ingeschakeld. Sla op om hem in scènes te gebruiken."}
      </p>

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

      <StudioCharacterVoiceSharedPreview
        voiceLabel={defaultProfileLabel}
        voiceSelected={Boolean(value.voiceProfile.trim())}
        voiceEnabled={value.voiceEnabled}
        language={value.voiceLanguage}
        languages={VOICE_CENTER_LANGUAGES}
        onLanguage={(language) => onChange({ ...value, voiceLanguage: language })}
        speechSpeed={value.speechSpeed || 1}
        onSpeechSpeed={(speechSpeed) => onChange({ ...value, speechSpeed })}
        previewText={previewTextTouched ? previewTextInput : defaultPreviewText}
        onPreviewText={(text) => {
          setPreviewTextTouched(true);
          setPreviewTextInput(text);
        }}
        sampleUrl={
          sampleByProfile[value.voiceProfile] ||
          voicePayload?.personaPresets.find((preset) => {
            const ref = parseVoiceProfileRef(value.voiceProfile);
            const providerId = ref.kind === "library" || ref.kind === "clone" ? ref.providerVoiceId : "";
            return preset.voiceId === providerId || `library:${preset.voiceId}` === value.voiceProfile;
          })?.previewUrl ||
          ""
        }
        onPersonalizedPreview={() => void runPreview(mainVoiceLang)}
        previewBusy={mainPreviewBusy}
        previewError={previewError}
        previewNotice={previewNotice}
        personalizedAudioUrl={mainPreviewUrl}
      />

      {!value.voiceEnabled ?
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
          {t("studio.voiceCenter.enableToUseHint")}
        </p>
      : null}

      <div className="mt-4" data-testid="voice-picker">
        <p className="text-sm font-semibold text-zinc-900">Kies een stem</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["recommended", "Aanbevolen"],
              ["all", "Alle stemmen"],
              ["mine", "Mijn stemmen"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              aria-pressed={voicePickerTab === tab}
              onClick={() => setVoicePickerTab(tab)}
              className={`min-h-[44px] rounded-xl px-2 text-sm font-semibold ${
                voicePickerTab === tab ? "bg-[#0067B1] text-white" : "border border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {voicePickerTab === "recommended" ? (
        <div className="mt-4 space-y-2">
          {voiceLibrary?.loading && !voicePayload ?
            <p className="text-sm text-zinc-600">Aanbevolen stemmen laden…</p>
          : null}
          {voiceLibrary?.error ?
            <p className="text-sm text-red-800">{voiceLibrary.error}</p>
          : null}
          <ul className="grid gap-2">
            {(voicePayload?.personaPresets ?? []).map((preset) => {
              const profile = safeFormatLibraryVoiceProfileRef(preset.voiceId) ?? "";
              const selected = profile !== "" && value.voiceProfile === profile;
              return (
                <li
                  key={preset.id}
                  className={`rounded-xl border p-3 ${selected ? "border-[#0067B1] bg-sky-50" : "border-zinc-200 bg-white"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{preset.voiceName || t(preset.labelKey as never)}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {t(preset.labelKey as never)} · {preset.language.toUpperCase()}
                      </p>
                    </div>
                    {selected ?
                      <span className="rounded-full bg-[#0067B1] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Geselecteerd
                      </span>
                    : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preset.previewUrl ?
                      <button
                        type="button"
                        onClick={() => playVoiceLibrarySample(preset.previewUrl)}
                        className="min-h-[44px] rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900"
                      >
                        Beluister gratis voorbeeld
                      </button>
                    : <p className="text-xs text-zinc-500">Geen gratis voorbeeld beschikbaar</p>}
                    <button
                      type="button"
                      disabled={!profile || !canModify}
                      onClick={() =>
                        handleSelectProfile(profile, {
                          voiceName: preset.voiceName,
                          personaLabelKey: preset.labelKey,
                          previewUrl: preset.previewUrl,
                        })
                      }
                      className="min-h-[44px] rounded-full bg-[#0067B1] px-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Kies deze stem
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {voicePickerTab === "all" ? (
        <StudioVoiceCatalogBrowser
          active={voicePickerTab === "all"}
          selectedProfile={value.voiceProfile}
          filterOptions={voicePayload?.filterOptions ?? null}
          statsNote={
            libraryStats
              ? `${libraryStats.totalVoices} stemmen, ${libraryStats.accentCount} accenten, ${libraryStats.languageCount} talen en ${libraryStats.personaCount} persona's staan in de index (${libraryStats.catalogSource}). Dit is geen live controle of elke stem nu spraak kan maken.`
              : "De stemindex laden…"
          }
          onSelect={(profile, voiceName, previewUrl) =>
            handleSelectProfile(profile, { voiceName, previewUrl })
          }
        />
      ) : null}

      {voicePickerTab === "mine" ? (
        <div className="mt-4">
          <StudioMyVoicesSection
            selectedProfile={value.voiceProfile}
            characterId={characterId}
            characterName={characterName}
            language={value.voiceLanguage}
            canModify={canModify}
            onSelectProfile={handleSelectProfile}
          />
          <p className="mt-4 text-xs text-violet-700">{t("studio.voiceLibrary.clonesInLibraryHint")}</p>
        </div>
      ) : null}

      <VoiceCenterCollapsibleSection
        title={t("studio.voiceCenter.advancedLanguageTitle")}
        summary={
          useSameVoiceForAllLanguages
            ? t("studio.voiceCenter.summary.sameVoiceForAllLanguages")
            : t("studio.voiceCenter.summary.languageOverrides")
        }
        open={advancedLanguageOpen}
        onToggle={() => setAdvancedLanguageOpen((open) => !open)}
      >
        <div className="space-y-4 rounded-xl border border-violet-100 bg-white/80 p-4">
          <p className="text-xs text-violet-700">{t("studio.voiceCenter.advancedLanguageOptional")}</p>

          <label className="block text-xs font-medium text-violet-900">
            {t("studio.voiceCenter.previewTextLabel")}
            <textarea
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
              rows={2}
              value={previewTextTouched ? previewTextInput : defaultPreviewText}
              placeholder={defaultPreviewText}
              onChange={(e) => {
                setPreviewTextTouched(true);
                setPreviewTextInput(e.target.value);
              }}
              onBlur={flushPreviewText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  flushPreviewText();
                }
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
                  setAdminDebugOverridesOpen(false);
                }
              }}
            />
            {t("studio.voiceCenter.sameVoiceForAllLanguages")}
          </label>

          {isAdmin && useSameVoiceForAllLanguages && !adminDebugOverridesOpen ?
            <button
              type="button"
              onClick={() => setAdminDebugOverridesOpen(true)}
              className="min-h-[44px] rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50"
            >
              {t("studio.voiceCenter.showDebugOverrides")}
            </button>
          : null}

          {showLanguageOverrideCards ?
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
      </VoiceCenterCollapsibleSection>

      {previewNotice ?
        <p className="mt-3 text-xs font-medium text-[#006D52]">{previewNotice}</p>
      : null}
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
