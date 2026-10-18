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
import {
  searchVoiceConcepts,
  voiceConceptById,
  voiceDescriptiveLabel,
  voiceUseCaseLabel,
  VOICE_CONCEPT_GROUPS,
} from "@/lib/studio-voice-characteristics";
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
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const description = voice.description.trim();
  const longDescription = description.length > 160;

  return (
    <li className={`rounded-xl border p-3 ${selected ? "border-[#0067B1] bg-sky-50" : "border-zinc-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{voice.name}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {[voiceLanguageLabel(voice.language), voice.accent, voice.gender, voice.age, voice.category].filter(Boolean).join(" · ")}
          </p>
          {description ?
            <p className={`mt-1 text-xs text-zinc-500 ${longDescription && !descriptionOpen ? "line-clamp-2" : ""}`}>{description}</p>
          : null}
          {longDescription ?
            <button type="button" onClick={() => setDescriptionOpen((open) => !open)} className="mt-1 text-xs font-semibold text-[#0067B1]">
              {descriptionOpen ? "Verberg beschrijving" : "Toon beschrijving"}
            </button>
          : null}
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

function CreativeConceptResults({
  query,
  selected,
  counts,
  mode,
  onToggle,
}: {
  query: string;
  selected: string[];
  counts: Array<{ concept: string; exact: number; related: number }>;
  mode: "strict" | "related";
  onToggle: (concept: string) => void;
}) {
  const text = query.trim();
  if (text.length < 2) {
    return <p className="text-xs text-zinc-500">Zoek een kenmerk. Zeldzame termen zoals vampier of gothic verschijnen hier.</p>;
  }
  const countByConcept = new Map(counts.map((row) => [row.concept, row]));
  const visible = searchVoiceConcepts(text).filter((concept) => {
    if (selected.includes(concept.id)) return true;
    if (counts.length === 0) return true;
    return (countByConcept.get(concept.id)?.related ?? 0) > 0;
  });
  if (visible.length === 0) {
    return <p className="text-xs text-zinc-500">Geen kenmerk met deze zoekterm in de huidige selectie.</p>;
  }
  const groups = VOICE_CONCEPT_GROUPS
    .map((group) => ({ ...group, concepts: visible.filter((concept) => concept.group === group.id) }))
    .filter((group) => group.concepts.length > 0);
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{group.label}</p>
          <ul className="mt-1 space-y-1">
            {group.concepts.map((concept) => {
              const count = countByConcept.get(concept.id);
              const active = selected.includes(concept.id);
              return (
                <li key={concept.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(concept.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm ${active ? "border-[#0067B1] bg-sky-50" : "border-zinc-200 bg-white"}`}
                  >
                    <span className="font-semibold text-zinc-900">{concept.nl}</span>
                    <span className="text-xs text-zinc-500">
                      Exact {count?.exact ?? 0}
                      {mode === "related" ? ` · Inclusief verwant ${count?.related ?? 0}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
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
  const [useCase, setUseCase] = useState("");
  const [descriptive, setDescriptive] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<"strict" | "related">("strict");
  const [creativeQuery, setCreativeQuery] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [accentQuery, setAccentQuery] = useState("");
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
      useCase,
      descriptive,
      concepts,
      matchMode,
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
  }, [active, collection, debouncedQuery, language, accent, gender, age, sampleFilter, category, locale, useCase, descriptive, concepts, matchMode, page]);

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
  const filtersActive = Boolean(query || language || accent || gender || age || sampleFilter || category || locale || useCase || descriptive || concepts.length);
  const suppressedAccents = new Set(result?.suppressedAccentIds ?? []);
  const accentQueryText = accentQuery.trim().toLowerCase();
  const accentOptions = language
    ? (result?.accentCounts ?? []).filter((option) => !suppressedAccents.has(option.value)).filter((option) => {
        if (!accentQueryText || option.value === accent) return true;
        const label = (option.label || (option.labelKey ? t(option.labelKey as TranslationKey) : option.value)).toLowerCase();
        return label.includes(accentQueryText) || option.value.toLowerCase().includes(accentQueryText);
      })
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
    setAccentQuery("");
    setAccent("");
    setGender("");
    setAge("");
    setSampleFilter("");
    setCategory("");
    setLocale("");
    setUseCase("");
    setDescriptive("");
    setConcepts([]);
    setMatchMode("strict");
    setCreativeQuery("");
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
          <input
            type="search"
            value={accentQuery}
            onChange={(event) => setAccentQuery(event.target.value)}
            placeholder={language ? "Zoek een accent" : "Kies eerst een taal"}
            aria-label="Zoek een accent"
            disabled={!language}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-50"
          />
          <select
            aria-label="Accent"
            value={accent}
            disabled={!language}
            onChange={(event) => {
              setAccent(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-50"
          >
            <option value="">{language ? "Alle accenten" : "Kies eerst een taal"}</option>
            {accentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label || (option.labelKey ? t(option.labelKey as TranslationKey) : option.value)} ({option.voiceCount})
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
        <FilterField label="Gebruik">
          <select
            aria-label="Gebruik"
            value={useCase}
            onChange={(event) => {
              setUseCase(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Alle gebruiken</option>
            {(result?.useCaseCounts ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {voiceUseCaseLabel(option.value)} ({option.voiceCount})
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
      <details className="rounded-xl border border-zinc-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Stemkarakter</summary>
        <div className="mt-3">
          <select
            aria-label="Stemkarakter"
            value={descriptive}
            onChange={(event) => {
              setDescriptive(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="">Alle stemkarakters</option>
            {(result?.descriptiveCounts ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {voiceDescriptiveLabel(option.value)} ({option.voiceCount})
              </option>
            ))}
          </select>
        </div>
      </details>
      <details className="rounded-xl border border-zinc-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Creatieve kenmerken</summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Zoekmodus">
            <button
              type="button"
              aria-pressed={matchMode === "strict"}
              onClick={() => {
                setMatchMode("strict");
                setPage(0);
                setLoading(true);
              }}
              className={`min-h-[44px] rounded-full px-3 text-sm font-semibold ${matchMode === "strict" ? "bg-[#0067B1] text-white" : "border border-zinc-300 text-zinc-800"}`}
            >
              Alle kenmerken
            </button>
            <button
              type="button"
              aria-pressed={matchMode === "related"}
              onClick={() => {
                setMatchMode("related");
                setPage(0);
                setLoading(true);
              }}
              className={`min-h-[44px] rounded-full px-3 text-sm font-semibold ${matchMode === "related" ? "bg-[#0067B1] text-white" : "border border-zinc-300 text-zinc-800"}`}
            >
              Verwante kenmerken
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Alle kenmerken eist elk gekozen kenmerk. Verwante kenmerken zet exacte treffers bovenaan en toont nabije termen daaronder.
          </p>
          <input
            type="search"
            value={creativeQuery}
            onChange={(event) => setCreativeQuery(event.target.value)}
            placeholder="Zoek op gothic, horror, melancholisch, fluisterend"
            aria-label="Zoek creatieve kenmerken"
            className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          />
          <CreativeConceptResults
            query={creativeQuery}
            selected={concepts}
            counts={result?.conceptCounts ?? []}
            mode={matchMode}
            onToggle={(concept) => {
              setConcepts((current) => current.includes(concept) ? current.filter((item) => item !== concept) : [...current, concept].slice(0, 8));
              setPage(0);
              setLoading(true);
            }}
          />
        </div>
      </details>
      {concepts.length || useCase || descriptive ?
        <div className="flex flex-wrap gap-2">
          {useCase ?
            <button type="button" onClick={() => { setUseCase(""); setPage(0); setLoading(true); }} className="min-h-[36px] rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-800">
              Gebruik: {voiceUseCaseLabel(useCase)} ×
            </button>
          : null}
          {descriptive ?
            <button type="button" onClick={() => { setDescriptive(""); setPage(0); setLoading(true); }} className="min-h-[36px] rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-800">
              Stemkarakter: {voiceDescriptiveLabel(descriptive)} ×
            </button>
          : null}
          {concepts.map((concept) => (
            <button
              key={concept}
              type="button"
              onClick={() => {
                setConcepts((current) => current.filter((item) => item !== concept));
                setPage(0);
                setLoading(true);
              }}
              className="min-h-[36px] rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-800"
            >
              {voiceConceptById(concept)?.nl ?? concept} ×
            </button>
          ))}
        </div>
      : null}
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
