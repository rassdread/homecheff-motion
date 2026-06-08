/**
 * ElevenLabs voice library catalog — /v1/voices + /v1/shared-voices (no schema).
 */

import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import { applyVoiceMetadataRepair } from "@/lib/studio-voice-metadata-repair";

export { inferAccentFromLocale } from "@/lib/studio-voice-locale-accent";
export { parseAccentFromDescription } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryIngestionMeta } from "@/lib/studio-voice-shared-catalog";

export type { VoiceLibraryIngestionMeta } from "@/lib/studio-voice-shared-catalog";

export type VoiceLibraryEntry = {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  language: string;
  description: string;
  labels: Record<string, string>;
  previewUrl: string;
  category: string;
};

export type VoiceLibraryCatalog = {
  version: 1;
  source: "elevenlabs" | "mock";
  fetchedAt: string;
  voices: VoiceLibraryEntry[];
  ingestion?: VoiceLibraryIngestionMeta;
};

export type ElevenLabsVerifiedLanguage = {
  language?: string;
  locale?: string | null;
  accent?: string | null;
  model_id?: string;
  preview_url?: string | null;
};

export type ElevenLabsVoiceRow = {
  voice_id?: string;
  name?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  category?: string;
  description?: string | null;
  verified_languages?: ElevenLabsVerifiedLanguage[] | null;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedCatalog: VoiceLibraryCatalog | null = null;
let cacheExpiresAt = 0;

export function isMockOnlyVoiceId(voiceId: string): boolean {
  return voiceId.trim().startsWith("mock-");
}

function pickLabel(labels: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = labels[key]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

export function normalizeLanguageCode(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return "";
  }
  const primary = value.split(/[-_]/)[0]?.trim();
  return primary ?? value;
}

export function pickVerifiedLanguage(row: ElevenLabsVoiceRow): ElevenLabsVerifiedLanguage | null {
  const entries = row.verified_languages ?? [];
  if (entries.length === 0) {
    return null;
  }
  const labels = row.labels ?? {};
  const labelLang = normalizeLanguageCode(pickLabel(labels, "language", "Language", "locale"));
  const withAccent = entries.filter((entry) => entry.accent?.trim());

  if (labelLang) {
    const matched = withAccent.find((entry) => {
      const lang = normalizeLanguageCode(entry.language ?? entry.locale ?? "");
      return lang === labelLang;
    });
    if (matched) {
      return matched;
    }
  }

  return withAccent[0] ?? entries[0] ?? null;
}

export function mapElevenLabsVoice(row: ElevenLabsVoiceRow): VoiceLibraryEntry | null {
  const id = row.voice_id?.trim();
  if (!id) {
    return null;
  }

  const labels = { ...(row.labels ?? {}) };
  const verified = pickVerifiedLanguage(row);

  let accent = pickLabel(labels, "accent", "Accent");
  const gender = pickLabel(labels, "gender", "Gender");
  const age = pickLabel(labels, "age", "Age");
  let language = normalizeLanguageCode(pickLabel(labels, "language", "Language", "locale"));
  let previewUrl = row.preview_url?.trim() ?? "";

  if (verified) {
    if (!accent && verified.accent?.trim()) {
      accent = verified.accent.trim();
    }
    if (!language) {
      language =
        normalizeLanguageCode(verified.language ?? "") ||
        normalizeLanguageCode(verified.locale ?? "");
    }
    if (!previewUrl && verified.preview_url?.trim()) {
      previewUrl = verified.preview_url.trim();
    }
    if (verified.locale?.trim()) {
      labels.verified_locale = labels.verified_locale || verified.locale.trim();
    }
  }

  if (!language && verified?.locale?.trim()) {
    language = normalizeLanguageCode(verified.locale);
  }

  if (accent) {
    labels.accent = labels.accent || accent;
  }
  if (language) {
    labels.language = labels.language || language;
  }

  return applyVoiceMetadataRepair(
    {
      id,
      name: row.name?.trim() || id,
      accent,
      gender,
      age,
      language,
      description: row.description?.trim() ?? "",
      labels,
      previewUrl,
      category: row.category?.trim() ?? "premade",
    },
    row
  );
}

export function isVoiceLanguageMetadataMissing(voice: VoiceLibraryEntry): boolean {
  const language = (voice.language || voice.labels.language || "").trim();
  return !language;
}

export function isVoiceAccentMetadataMissing(voice: VoiceLibraryEntry): boolean {
  const raw = voice.accent || voice.labels.accent || "";
  return !raw.trim() && !classifyVoiceAccent(voice.name);
}

/** Representative mock catalog for tests and offline dev. */
export function mockVoiceLibraryCatalog(): VoiceLibraryCatalog {
  const voices = [
    {
      id: "21m00Tcm4TlvDq8ikWAM",
      name: "Rachel",
      accent: "american",
      gender: "female",
      age: "young",
      language: "en",
      description: "",
      labels: { accent: "american", gender: "female", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-rachel.mp3",
      category: "premade",
    },
    {
      id: "ErXwobaYiN019PkySvjV",
      name: "Antoni",
      accent: "american",
      gender: "male",
      age: "young",
      language: "en",
      labels: { accent: "american", gender: "male", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-antoni.mp3",
      category: "premade",
    },
    {
      id: "EXAVITQu4vr4xnSDxMaL",
      name: "Bella",
      accent: "american",
      gender: "female",
      age: "middle aged",
      language: "en",
      labels: { accent: "american", gender: "female", age: "middle aged", use_case: "social media" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-bella.mp3",
      category: "premade",
    },
    {
      id: "pNInz6obpgDQGcFmaJgB",
      name: "Adam",
      accent: "american",
      gender: "male",
      age: "middle aged",
      language: "en",
      labels: { accent: "american", gender: "male", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-adam.mp3",
      category: "premade",
    },
    {
      id: "onwK4e9ZLuTAKqWW03F9",
      name: "Daniel",
      accent: "british",
      gender: "male",
      age: "middle aged",
      language: "en",
      labels: { accent: "british", gender: "male", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-daniel.mp3",
      category: "premade",
    },
    {
      id: "VR6AewLTigWG4xSOukaG",
      name: "Arnold",
      accent: "american",
      gender: "male",
      age: "middle aged",
      language: "en",
      labels: { accent: "american", gender: "male", age: "middle aged", use_case: "characters" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-arnold.mp3",
      category: "premade",
    },
    {
      id: "mock-british-chef",
      name: "Oliver",
      accent: "british",
      gender: "male",
      age: "middle aged",
      language: "en",
      labels: { accent: "british", gender: "male", age: "middle aged", use_case: "characters" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-oliver.mp3",
      category: "premade",
    },
    {
      id: "mock-jamaican-chef",
      name: "Marcus",
      accent: "jamaican",
      gender: "male",
      age: "young",
      language: "en",
      labels: { accent: "jamaican", gender: "male", age: "young", use_case: "characters" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-marcus.mp3",
      category: "premade",
    },
    {
      id: "mock-dutch-grower",
      name: "Sanne",
      accent: "dutch",
      gender: "female",
      age: "middle aged",
      language: "nl",
      labels: { accent: "dutch", gender: "female", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-sanne.mp3",
      category: "premade",
    },
    {
      id: "mock-vlaams",
      name: "Lucas",
      accent: "flemish",
      gender: "male",
      age: "young",
      language: "nl",
      labels: { accent: "flemish", gender: "male", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-lucas.mp3",
      category: "premade",
    },
    {
      id: "mock-surinamese",
      name: "Asha",
      accent: "surinamese",
      gender: "female",
      age: "young",
      language: "nl",
      labels: { accent: "surinamese", gender: "female", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-asha.mp3",
      category: "premade",
    },
    {
      id: "mock-caribbean",
      name: "Keisha",
      accent: "caribbean",
      gender: "female",
      age: "middle aged",
      language: "en",
      labels: { accent: "caribbean", gender: "female", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-keisha.mp3",
      category: "premade",
    },
    {
      id: "mock-italian",
      name: "Giovanni",
      accent: "italian",
      gender: "male",
      age: "middle aged",
      language: "en",
      labels: { accent: "italian", gender: "male", age: "middle aged", use_case: "characters" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-giovanni.mp3",
      category: "premade",
    },
    {
      id: "mock-luxury",
      name: "Charlotte",
      accent: "british",
      gender: "female",
      age: "middle aged",
      language: "en",
      labels: { accent: "british", gender: "female", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-charlotte.mp3",
      category: "premade",
    },
    {
      id: "mock-spanish-spain",
      name: "Valentina",
      accent: "spanish",
      gender: "female",
      age: "young",
      language: "es",
      labels: { accent: "spanish", gender: "female", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-valentina.mp3",
      category: "premade",
    },
    {
      id: "mock-latin",
      name: "Mateo",
      accent: "latin american",
      gender: "male",
      age: "young",
      language: "es",
      labels: { accent: "latin american", gender: "male", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-mateo.mp3",
      category: "premade",
    },
    {
      id: "mock-french",
      name: "Camille",
      accent: "french",
      gender: "female",
      age: "young",
      language: "fr",
      labels: { accent: "french", gender: "female", age: "young", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-camille.mp3",
      category: "premade",
    },
    {
      id: "mock-canadian-french",
      name: "Étienne",
      accent: "canadian french",
      gender: "male",
      age: "middle aged",
      language: "fr",
      labels: { accent: "canadian french", gender: "male", age: "middle aged", use_case: "narration" },
      previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/mock-etienne.mp3",
      category: "premade",
    },
  ];
  return {
    version: 1,
    source: "mock",
    fetchedAt: new Date().toISOString(),
    voices: voices.map((v) => ({ description: "", ...v })),
  };
}

async function fetchElevenLabsAccountVoices(
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<VoiceLibraryEntry[]> {
  const res = await fetchFn("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs voice list failed (${res.status}): ${detail.slice(0, 200) || res.statusText}`
    );
  }

  const payload = (await res.json()) as { voices?: ElevenLabsVoiceRow[] };
  const accountVoices: VoiceLibraryEntry[] = [];
  for (const row of payload.voices ?? []) {
    const mapped = mapElevenLabsVoice(row);
    if (!mapped) {
      continue;
    }
    accountVoices.push({
      ...mapped,
      labels: {
        ...mapped.labels,
        catalog_source: mapped.labels.catalog_source || "account",
      },
    });
  }
  return accountVoices;
}

async function fetchElevenLabsVoiceCatalog(): Promise<VoiceLibraryCatalog> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return mockVoiceLibraryCatalog();
  }

  const accountVoices = await fetchElevenLabsAccountVoices(apiKey);

  let sharedVoices: VoiceLibraryEntry[] = [];
  let sharedFetched = 0;
  let paginationLimited = false;
  let sharedVoicesLimit = 0;
  const sources: VoiceLibraryIngestionMeta["sources"] = ["account"];
  const { fetchElevenLabsSharedVoices, mergeAccountAndSharedVoices } = await import(
    "@/lib/studio-voice-shared-catalog"
  );

  try {
    const sharedResult = await fetchElevenLabsSharedVoices(apiKey);
    sharedVoices = sharedResult.voices;
    sharedFetched = sharedResult.fetched;
    paginationLimited = sharedResult.paginationLimited;
    sharedVoicesLimit = sharedResult.sharedVoicesLimit;
    if (sharedFetched > 0) {
      sources.push("shared");
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[voice-library] shared voices fetch failed; using account voices only:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const merged = mergeAccountAndSharedVoices(accountVoices, sharedVoices);
  const accountFetched = accountVoices.length;
  const ingestion: VoiceLibraryIngestionMeta = {
    sources,
    accountFetched,
    sharedFetched,
    totalFetched: accountFetched + sharedFetched,
    totalVisible: merged.voices.length,
    dedupeCount: merged.dedupeCount,
    paginationLimited,
    sharedVoicesLimit,
  };

  return {
    version: 1,
    source: "elevenlabs",
    fetchedAt: new Date().toISOString(),
    voices: merged.voices,
    ingestion,
  };
}

/** Build (and cache) the ElevenLabs voice library catalog. */
export async function buildVoiceLibraryCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<VoiceLibraryCatalog> {
  const now = Date.now();
  if (!options?.forceRefresh && cachedCatalog && now < cacheExpiresAt) {
    return cachedCatalog;
  }

  const catalog = await fetchElevenLabsVoiceCatalog();
  cachedCatalog = catalog;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return catalog;
}

export function findVoiceLibraryEntry(
  catalog: VoiceLibraryCatalog,
  voiceId: string
): VoiceLibraryEntry | undefined {
  const id = voiceId.trim();
  return catalog.voices.find((v) => v.id === id);
}

export function clearVoiceLibraryCatalogCacheForTests(): void {
  cachedCatalog = null;
  cacheExpiresAt = 0;
}
