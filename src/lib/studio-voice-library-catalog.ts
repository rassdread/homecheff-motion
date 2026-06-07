/**
 * ElevenLabs voice library catalog — GET /v1/voices consumption (no schema).
 */

export type VoiceLibraryEntry = {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  language: string;
  labels: Record<string, string>;
  previewUrl: string;
  category: string;
};

export type VoiceLibraryCatalog = {
  version: 1;
  source: "elevenlabs" | "mock";
  fetchedAt: string;
  voices: VoiceLibraryEntry[];
};

type ElevenLabsVoiceRow = {
  voice_id?: string;
  name?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  category?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedCatalog: VoiceLibraryCatalog | null = null;
let cacheExpiresAt = 0;

function pickLabel(labels: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = labels[key]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function mapElevenLabsVoice(row: ElevenLabsVoiceRow): VoiceLibraryEntry | null {
  const id = row.voice_id?.trim();
  if (!id) {
    return null;
  }
  const labels = row.labels ?? {};
  const accent = pickLabel(labels, "accent", "Accent");
  const gender = pickLabel(labels, "gender", "Gender");
  const age = pickLabel(labels, "age", "Age");
  const language = pickLabel(labels, "language", "Language", "locale");
  return {
    id,
    name: row.name?.trim() || id,
    accent,
    gender,
    age,
    language,
    labels,
    previewUrl: row.preview_url?.trim() ?? "",
    category: row.category?.trim() ?? "premade",
  };
}

/** Representative mock catalog for tests and offline dev. */
export function mockVoiceLibraryCatalog(): VoiceLibraryCatalog {
  const voices: VoiceLibraryEntry[] = [
    {
      id: "21m00Tcm4TlvDq8ikWAM",
      name: "Rachel",
      accent: "american",
      gender: "female",
      age: "young",
      language: "en",
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
    voices,
  };
}

async function fetchElevenLabsVoiceCatalog(): Promise<VoiceLibraryCatalog> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return mockVoiceLibraryCatalog();
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
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
  const voices = (payload.voices ?? [])
    .map(mapElevenLabsVoice)
    .filter((v): v is VoiceLibraryEntry => v !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    version: 1,
    source: "elevenlabs",
    fetchedAt: new Date().toISOString(),
    voices: voices.length > 0 ? voices : mockVoiceLibraryCatalog().voices,
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
