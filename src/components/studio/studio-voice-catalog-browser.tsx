"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { StudioVoiceFavoriteHeart } from "@/components/studio/studio-voice-favorite-heart";
import { StudioVoiceSampleCompare } from "@/components/studio/studio-voice-sample-compare";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  fetchVoiceFavoriteIds,
  searchVoiceLibraryPage,
  setVoiceFavorite,
  type VoiceLibraryPageResult,
} from "@/lib/studio-voice-library-client";
import { voiceGenderLabel } from "@/lib/studio-voice-language";
import type { VoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { safeFormatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import {
  sortVoiceLanguageOptions,
  voiceLanguageLabel,
} from "@/lib/studio-voice-language";

type Props = {
  active: boolean;
  selectedProfile: string;
  filterOptions: VoiceLibraryFilterOptions | null;
  statsNote: string;
  collection?: "all" | "favorites";
  onSelect: (profile: string, voiceName: string, previewUrl: string, speechSpeed: number) => void;
};

function VoiceCatalogCard({
  voice,
  selected,
  favorite,
  onFavorite,
  onSelect,
}: {
  voice: VoiceLibraryPageResult["voices"][number];
  selected: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onSelect: (speechSpeed: number) => void;
}) {
  const [speed, setSpeed] = useState(1);

  return (
    <li className={`rounded-xl border p-3 ${selected ? "border-[#0067B1] bg-sky-50" : "border-zinc-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{voice.name}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {[voiceLanguageLabel(voice.language), voice.accent, voice.gender, voice.age, voice.category].filter(Boolean).join(" · ")}
          </p>
          {voice.description ? <p className="mt-1 text-xs text-zinc-500">{voice.description}</p> : null}
        </div>
        <span className="flex items-center gap-2">
          <StudioVoiceFavoriteHeart favorite={favorite} onToggle={onFavorite} />
          {selected ?
            <span className="rounded-full bg-[#0067B1] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
              Geselecteerd
            </span>
          : null}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StudioVoiceSampleCompare previewUrl={voice.previewUrl} label={voice.name} onSpeed={setSpeed} />
        <button
          type="button"
          onClick={() => onSelect(speed)}
          className="min-h-[44px] rounded-full bg-[#0067B1] px-3 text-sm font-semibold text-white"
        >
          Kies deze stem
        </button>
      </div>
    </li>
  );
}

function voiceSelected(profile: string, voiceId: string): boolean {
  return profile === voiceId || profile === `library:${voiceId}` || profile.endsWith(`:${voiceId}`);
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-zinc-700">
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}

export function StudioVoiceCatalogBrowser({
  active,
  selectedProfile,
  filterOptions,
  statsNote,
  collection = "all",
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [accent, setAccent] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [sampleFilter, setSampleFilter] = useState<"" | "yes" | "no">("");
  const [category, setCategory] = useState("");
  const [locale, setLocale] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [page, setPage] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const seenQuery = useRef(query);
  const [result, setResult] = useState<VoiceLibraryPageResult | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (seenQuery.current === query) {
      return;
    }
    seenQuery.current = query;
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(0);
      setLoading(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    void searchVoiceLibraryPage({
      query: debouncedQuery,
      language,
      accent,
      gender,
      age,
      sample: sampleFilter,
      category,
      locale,
      favorites: collection === "favorites",
      page,
      signal: controller.signal,
    })
      .then((next) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        const hidden = new Set(next.suppressedAccentIds ?? []);
        const availableAccents = new Set((next.accentCounts ?? []).map((row) => row.value));
        if (accent && (hidden.has(accent) || (language && next.accentCounts && !availableAccents.has(accent)))) {
          setAccent("");
        }
        const availableLocales = new Set((next.localeCounts ?? []).map((row) => row.value));
        if (locale && language && next.localeCounts && !availableLocales.has(locale)) {
          setLocale("");
        }
        setResult(next);
        setLoading(false);
        setError("");
        if (collection === "favorites") {
          setFavoriteIds(next.voices.map((voice) => voice.id));
          return;
        }
        void fetchVoiceFavoriteIds(next.voices.map((voice) => voice.id), controller.signal).then((ids) => {
          if (!cancelled && !controller.signal.aborted) setFavoriteIds(ids);
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setLoading(false);
        setError(err instanceof Error ? err.message : "Stemmen laden mislukt.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active, collection, debouncedQuery, language, accent, gender, age, sampleFilter, category, locale, page]);

  const t = useActiveTranslator();
  const languageSource = result?.languageCounts?.length
    ? result.languageCounts
    : (filterOptions?.languages ?? []);
  const languageQueryText = languageQuery.trim().toLowerCase();
  const languageOptions = sortVoiceLanguageOptions(languageSource).filter((option) => {
    if (option.value === language) return true;
    if (!languageQueryText) return true;
    const label = voiceLanguageLabel(option.value).toLowerCase();
    return label.includes(languageQueryText) || option.value.toLowerCase().includes(languageQueryText);
  });

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const filtersActive = Boolean(query || language || accent || gender || age || sampleFilter || category || locale);
  const suppressedAccents = new Set(result?.suppressedAccentIds ?? []);
  const accentOptions = language
    ? (result?.accentCounts ?? []).filter((option) => !suppressedAccents.has(option.value))
    : [];
  const localeOptions = language ? (result?.localeCounts ?? []) : [];
  const genderOptions = language ? (result?.genderCounts ?? []) : (filterOptions?.genders ?? []);
  const ageOptions = language ? (result?.ageCounts ?? []) : (filterOptions?.ages ?? []);
  const categoryOptions = language ? (result?.categoryCounts ?? []) : (filterOptions?.categories ?? []);

  async function toggleFavorite(voiceId: string) {
    const next = !favoriteIds.includes(voiceId);
    setFavoriteIds((current) => next ? [...current, voiceId] : current.filter((id) => id !== voiceId));
    setFavoriteError("");
    const ok = await setVoiceFavorite(voiceId, next);
    if (!ok) {
      setFavoriteIds((current) => next ? current.filter((id) => id !== voiceId) : [...current, voiceId]);
      setFavoriteError("Favoriet opslaan mislukt. Probeer het opnieuw.");
    }
  }

  function resetFilters() {
    setQuery("");
    setDebouncedQuery("");
    seenQuery.current = "";
    setLanguage("");
    setLanguageQuery("");
    setAccent("");
    setGender("");
    setAge("");
    setSampleFilter("");
    setCategory("");
    setLocale("");
    setPage(0);
    setLoading(true);
  }

  return (
    <div className="mt-4 space-y-3" data-testid="voice-catalog-browser">
      <p className="text-xs text-zinc-600">{statsNote}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FilterField label="Zoeken">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek een stem"
            aria-label="Zoek een stem"
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          />
        </FilterField>
        <FilterField label="Taal">
          <input
            type="search"
            value={languageQuery}
            onChange={(event) => setLanguageQuery(event.target.value)}
            placeholder="Zoek een taal"
            aria-label="Zoek een taal"
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          />
          <select
            aria-label="Taal"
            value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setAccent("");
            setLocale("");
            setPage(0);
            setLoading(true);
          }}
          className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle talen</option>
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {voiceLanguageLabel(option.value)} ({option.voiceCount})
            </option>
          ))}
          </select>
        </FilterField>
        <FilterField label="Regio / taalvariant">
          <select
            aria-label="Regio / taalvariant"
            value={locale}
            disabled={!language}
            onChange={(event) => {
              setLocale(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-50"
          >
            <option value="">{language ? "Alle taalvarianten" : "Kies eerst een taal"}</option>
            {localeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.voiceCount})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Accent">
          <select
            aria-label="Accent"
            value={accent}
            disabled={!language}
            onChange={(event) => {
              setAccent(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-50"
          >
            <option value="">{language ? "Alle accenten" : "Kies eerst een taal"}</option>
            {accentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey as TranslationKey)} ({option.voiceCount})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stemtype">
          <select
            aria-label="Stemtype"
            value={gender}
            onChange={(event) => {
              setGender(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Alle stemtypes</option>
            {genderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {(voiceGenderLabel(option.value) !== option.value ? voiceGenderLabel(option.value) : t(option.labelKey as TranslationKey))} ({option.voiceCount})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Leeftijd">
          <select
            aria-label="Leeftijd"
            value={age}
            onChange={(event) => {
              setAge(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Alle leeftijden</option>
            {ageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey as TranslationKey)} ({option.voiceCount})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Categorie">
          <select
            aria-label="Categorie"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Alle categorieën</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey as TranslationKey)} ({option.voiceCount})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Voorbeeld">
          <select
            aria-label="Voorbeeld"
            value={sampleFilter}
            onChange={(event) => {
              const next = event.target.value;
              setSampleFilter(next === "yes" || next === "no" ? next : "");
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Met en zonder voorbeeld</option>
            <option value="yes">Gratis voorbeeld aanwezig</option>
            <option value="no">Geen gratis voorbeeld</option>
          </select>
        </FilterField>
      </div>
      <p className="text-xs text-zinc-500">
        Regio is de taalvariant. Accent is een afwijkende klank. Als die twee hetzelfde zijn, staat de keuze alleen bij regio.
      </p>
      {favoriteError ? <p className="text-sm text-red-800">{favoriteError}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-600">
          {result ? `${result.total} stemmen in deze selectie` : "Selectie laden…"}
          {language ? ` · ${voiceLanguageLabel(language)}` : ""}
        </p>
        {filtersActive ?
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[44px] rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800"
          >
            Wis filters
          </button>
        : null}
      </div>
      {loading ? <p className="text-sm text-zinc-600">Stemmen laden…</p> : null}
      {error ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error} Controleer je verbinding en probeer opnieuw.
        </p>
      : null}
      <ul className="grid gap-2">
        {(result?.voices ?? []).map((voice) => (
          <VoiceCatalogCard
            key={voice.id}
            voice={voice}
            selected={voiceSelected(selectedProfile, voice.id)}
            favorite={favoriteIds.includes(voice.id)}
            onFavorite={() => void toggleFavorite(voice.id)}
            onSelect={(speechSpeed) => {
              const profile = safeFormatLibraryVoiceProfileRef(voice.id);
              if (profile) onSelect(profile, voice.name, voice.previewUrl, speechSpeed);
            }}
          />
        ))}
      </ul>
      {result && result.total === 0 && !loading ?
        collection === "favorites" && !filtersActive ?
          <div className="text-sm text-zinc-600">
            <p>Je hebt nog geen favoriete stemmen.</p>
            <p className="mt-1">Gebruik het hartje bij een stem om hem hier te bewaren.</p>
          </div>
        : <p className="text-sm text-zinc-600">Geen stemmen voor deze zoekopdracht.</p>
      : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={page <= 0 || loading}
          onClick={() => {
            setLoading(true);
            setPage((current) => Math.max(0, current - 1));
          }}
          className="min-h-[44px] rounded-full border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-50"
        >
          Vorige
        </button>
        <p className="text-xs text-zinc-600">
          {result ? `${result.total} in deze selectie · pagina ${page + 1} van ${totalPages}` : ""}
        </p>
        <button
          type="button"
          disabled={loading || !result || (page + 1) * result.pageSize >= result.total}
          onClick={() => {
            setLoading(true);
            setPage((current) => current + 1);
          }}
          className="min-h-[44px] rounded-full border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-50"
        >
          Volgende
        </button>
      </div>
    </div>
  );
}
