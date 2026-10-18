"use client";

import { useEffect, useRef, useState } from "react";
import { StudioVoiceSampleCompare } from "@/components/studio/studio-voice-sample-compare";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  searchVoiceLibraryPage,
  type VoiceLibraryPageResult,
} from "@/lib/studio-voice-library-client";
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
  onSelect: (profile: string, voiceName: string, previewUrl: string, speechSpeed: number) => void;
};

function VoiceCatalogCard({
  voice,
  selected,
  onSelect,
}: {
  voice: VoiceLibraryPageResult["voices"][number];
  selected: boolean;
  onSelect: (speechSpeed: number) => void;
}) {
  const [speed, setSpeed] = useState(1);

  return (
    <li className={`rounded-xl border p-3 ${selected ? "border-[#0067B1] bg-sky-50" : "border-zinc-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{voice.name}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {[voiceLanguageLabel(voice.language), voice.accent, voice.gender, voice.age].filter(Boolean).join(" · ")}
          </p>
          {voice.description ? <p className="mt-1 text-xs text-zinc-500">{voice.description}</p> : null}
        </div>
        {selected ?
          <span className="rounded-full bg-[#0067B1] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            Geselecteerd
          </span>
        : null}
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

export function StudioVoiceCatalogBrowser({
  active,
  selectedProfile,
  filterOptions,
  statsNote,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [accent, setAccent] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [sampleFilter, setSampleFilter] = useState<"" | "yes" | "no">("");
  const [category, setCategory] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [page, setPage] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const seenQuery = useRef(query);
  const [result, setResult] = useState<VoiceLibraryPageResult | null>(null);
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
      page,
      signal: controller.signal,
    })
      .then((next) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setResult(next);
        setLoading(false);
        setError("");
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
  }, [active, debouncedQuery, language, accent, gender, age, sampleFilter, category, page]);

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
  const filtersActive = Boolean(query || language || accent || gender || age || sampleFilter || category);

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
    setPage(0);
    setLoading(true);
  }

  return (
    <div className="mt-4 space-y-3" data-testid="voice-catalog-browser">
      <p className="text-xs text-zinc-600">{statsNote}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek een stem"
          aria-label="Zoek een stem"
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        />
        <input
          type="search"
          value={languageQuery}
          onChange={(event) => setLanguageQuery(event.target.value)}
          placeholder="Zoek een taal"
          aria-label="Zoek een taal"
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        />
        <select
          aria-label="Taalfilter"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle talen</option>
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {voiceLanguageLabel(option.value)} ({option.voiceCount})
            </option>
          ))}
        </select>
        <select
          aria-label="Accentfilter"
          value={accent}
          onChange={(event) => {
            setAccent(event.target.value);
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle accenten</option>
          {(filterOptions?.accents ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {t(option.labelKey as TranslationKey)} ({option.voiceCount})
            </option>
          ))}
        </select>
        <select
          aria-label="Geslachtsfilter"
          value={gender}
          onChange={(event) => {
            setGender(event.target.value);
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle stemtypes</option>
          {(filterOptions?.genders ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey as TranslationKey)} ({option.voiceCount})
            </option>
          ))}
        </select>
        <select
          aria-label="Leeftijdsfilter"
          value={age}
          onChange={(event) => {
            setAge(event.target.value);
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle leeftijden</option>
          {(filterOptions?.ages ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey as TranslationKey)} ({option.voiceCount})
            </option>
          ))}
        </select>
        <select
          aria-label="Categoriefilter"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Alle categorieën</option>
          {(filterOptions?.categories ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey as TranslationKey)} ({option.voiceCount})
            </option>
          ))}
        </select>
        <select
          aria-label="Voorbeeldfilter"
          value={sampleFilter}
          onChange={(event) => {
            const next = event.target.value;
            setSampleFilter(next === "yes" || next === "no" ? next : "");
            setPage(0);
            setLoading(true);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="">Met en zonder voorbeeld</option>
          <option value="yes">Gratis voorbeeld aanwezig</option>
          <option value="no">Geen gratis voorbeeld</option>
        </select>
      </div>
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
            onSelect={(speechSpeed) => {
              const profile = safeFormatLibraryVoiceProfileRef(voice.id);
              if (profile) onSelect(profile, voice.name, voice.previewUrl, speechSpeed);
            }}
          />
        ))}
      </ul>
      {result && result.total === 0 && !loading ?
        <p className="text-sm text-zinc-600">Geen stemmen voor deze zoekopdracht.</p>
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
