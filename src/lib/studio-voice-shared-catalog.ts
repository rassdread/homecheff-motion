/**
 * ElevenLabs shared/marketplace voices — GET /v1/shared-voices ingestion.
 */

import { parseAccentFromDescription } from "@/lib/studio-voice-accent-model";
import {
  mapElevenLabsVoice,
  normalizeLanguageCode,
  type ElevenLabsVerifiedLanguage,
  type ElevenLabsVoiceRow,
  type VoiceLibraryEntry,
} from "@/lib/studio-voice-library-catalog";

export type ElevenLabsSharedVoiceRow = {
  voice_id?: string;
  public_owner_id?: string;
  name?: string;
  accent?: string;
  language?: string;
  gender?: string;
  age?: string;
  category?: string;
  description?: string | null;
  preview_url?: string | null;
  descriptive?: string | null;
  use_case?: string | null;
  locale?: string | null;
  labels?: Record<string, string>;
  verified_languages?: ElevenLabsVerifiedLanguage[] | null;
};

export type VoiceLibraryIngestionMeta = {
  sources: Array<"account" | "shared">;
  accountFetched: number;
  sharedFetched: number;
  totalFetched: number;
  totalVisible: number;
  dedupeCount: number;
  paginationLimited: boolean;
  sharedVoicesLimit: number;
};

export type SharedVoicesFetchOptions = {
  maxVoices?: number;
  pageSize?: number;
  fetchFn?: typeof fetch;
};

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

/** `null` = fetch every page until ElevenLabs reports `has_more: false`. */
export function resolveSharedVoicesLimit(): number | null {
  const raw = process.env.ELEVENLABS_SHARED_VOICES_MAX?.trim();
  if (!raw || raw === "0" || raw === "unlimited" || raw === "all") {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

const SHARED_ACCENT_ALIASES: Record<string, string> = {
  "received pronunciation": "british",
  rp: "british",
  "us southern": "american",
  "us midwest": "american",
  "african american": "american",
  peninsular: "spanish",
  parisian: "french",
  brazilian: "latin american",
  mexican: "latin american",
  colombian: "latin american",
  argentine: "latin american",
  gujarati: "indian",
  punjabi: "indian",
  kiwi: "new zealand",
  "new zealand": "new zealand",
  nz: "new zealand",
  scots: "scottish",
  gaelic: "irish",
  flemish: "flemish",
  belgian: "flemish",
  surinamese: "surinamese",
  surinaams: "surinamese",
  jamaica: "jamaican",
  trinidadian: "trinidadian",
  barbadian: "barbadian",
  guyanese: "guyanese",
  ghanaian: "ghanaian",
  kenyan: "kenyan",
  pakistani: "pakistani",
  welsh: "welsh",
  nigerian: "nigerian",
  "swiss german": "swiss german",
  ukrainian: "ukrainian",
  romanian: "romanian",
  "south african": "south african",
  "south african english": "south african",
  hindustani: "indian",
  mandarin: "mandarin",
  cantonese: "cantonese",
  deutsch: "german",
  german: "german",
  russisch: "russian",
  russian: "russian",
  italiano: "italian",
  castellano: "spanish",
  português: "portuguese",
  portuguese: "portuguese",
  brasileiro: "brazilian",
  quebecois: "canadian french",
  "québécois": "canadian french",
};

/** Normalize marketplace accent labels (often "standard") into catalog-friendly values. */
export function normalizeSharedAccent(params: {
  rawAccent: string;
  language: string;
  name: string;
  description: string;
}): string {
  const accent = params.rawAccent.trim().toLowerCase();
  if (accent && accent !== "standard" && SHARED_ACCENT_ALIASES[accent]) {
    return SHARED_ACCENT_ALIASES[accent];
  }
  if (accent && accent !== "standard") {
    return accent;
  }

  const lang = normalizeLanguageCode(params.language);
  if (lang === "nl") {
    return "dutch";
  }
  if (lang === "fr") {
    return "french";
  }
  if (lang === "es") {
    return "spanish";
  }

  const fromName = parseAccentFromDescription(params.name);
  if (fromName) {
    return fromName;
  }
  const fromDescription = parseAccentFromDescription(params.description);
  if (fromDescription) {
    return fromDescription;
  }

  return accent === "standard" ? "" : accent;
}

function normalizeSharedCategory(raw: string): string {
  const category = raw.trim().toLowerCase();
  if (category === "high_quality" || category === "high quality") {
    return "high_quality";
  }
  if (category === "professional") {
    return "professional";
  }
  if (category === "premade" || category === "cloned" || category === "clone") {
    return category === "clone" ? "cloned" : category;
  }
  return category || "shared";
}

/** Map a /v1/shared-voices row into the existing VoiceLibraryEntry shape. */
export function mapElevenLabsSharedVoice(row: ElevenLabsSharedVoiceRow): VoiceLibraryEntry | null {
  const voiceId = row.voice_id?.trim();
  if (!voiceId) {
    return null;
  }

  const name = row.name?.trim() || voiceId;
  const description = row.description?.trim() ?? "";
  const rawLanguage = (row.language ?? row.labels?.language ?? "").trim();
  const language = normalizeLanguageCode(rawLanguage);
  const accent = normalizeSharedAccent({
    rawAccent: row.accent ?? row.labels?.accent ?? "",
    language,
    name,
    description,
  });

  const labels: Record<string, string> = {
    ...(row.labels ?? {}),
    catalog_source: "shared",
  };
  if (accent) {
    labels.accent = labels.accent || accent;
  }
  if (language) {
    labels.language = labels.language || language;
  }
  if (row.gender?.trim()) {
    labels.gender = labels.gender || row.gender.trim();
  }
  if (row.age?.trim()) {
    labels.age = labels.age || row.age.trim();
  }
  if (rawLanguage) {
    labels.provider_language = labels.provider_language || rawLanguage;
  }
  if (row.descriptive?.trim()) {
    labels.descriptive = labels.descriptive || row.descriptive.trim();
  }
  if (row.use_case?.trim()) {
    labels.use_case = labels.use_case || row.use_case.trim();
  }
  if (row.locale?.trim()) {
    labels.locale = labels.locale || row.locale.trim();
  }

  const mapped = mapElevenLabsVoice({
    voice_id: voiceId,
    name,
    labels,
    preview_url: row.preview_url?.trim() ?? undefined,
    category: normalizeSharedCategory(row.category ?? "shared"),
    description,
    verified_languages: row.verified_languages ?? undefined,
  } satisfies ElevenLabsVoiceRow);

  if (!mapped) {
    return null;
  }

  return {
    ...mapped,
    accent: mapped.accent || accent,
    language: mapped.language || language,
    gender: mapped.gender || row.gender?.trim() || "",
    age: mapped.age || row.age?.trim() || "",
    labels: {
      ...mapped.labels,
      catalog_source: "shared",
    },
  };
}

/** Account voices win on id conflicts (name/preview priority). */
export function mergeAccountAndSharedVoices(
  accountVoices: VoiceLibraryEntry[],
  sharedVoices: VoiceLibraryEntry[]
): { voices: VoiceLibraryEntry[]; dedupeCount: number } {
  const byId = new Map<string, VoiceLibraryEntry>();
  let dedupeCount = 0;

  for (const shared of sharedVoices) {
    byId.set(shared.id, shared);
  }

  for (const account of accountVoices) {
    const existing = byId.get(account.id);
    if (existing) {
      dedupeCount += 1;
      byId.set(account.id, {
        ...existing,
        ...account,
        name: account.name || existing.name,
        previewUrl: account.previewUrl || existing.previewUrl,
        category: account.category || existing.category,
        labels: {
          ...existing.labels,
          ...account.labels,
          catalog_source: "account",
        },
      });
    } else {
      byId.set(account.id, {
        ...account,
        labels: {
          ...account.labels,
          catalog_source: account.labels.catalog_source || "account",
        },
      });
    }
  }

  const voices = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { voices, dedupeCount };
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Yield one shared-voice page at a time. Retries a 429 twice, then throws. */
export async function* iterateElevenLabsSharedVoicePages(
  apiKey: string,
  options?: SharedVoicesFetchOptions
): AsyncGenerator<VoiceLibraryEntry[]> {
  const fetchFn = options?.fetchFn ?? fetch;
  const sharedVoicesLimit = options?.maxVoices ?? resolveSharedVoicesLimit();
  const pageSize = Math.min(options?.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  let page = 0;
  let yielded = 0;

  while (sharedVoicesLimit === null || yielded < sharedVoicesLimit) {
    const remaining = sharedVoicesLimit === null ? pageSize : sharedVoicesLimit - yielded;
    const requestSize = Math.min(pageSize, remaining);
    const url = `https://api.elevenlabs.io/v1/shared-voices?page_size=${requestSize}&page=${page}`;
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      res = await fetchFn(url, {
        headers: { "xi-api-key": apiKey },
        next: { revalidate: 3600 },
      });
      if (res.status !== 429 || attempt === 2) {
        break;
      }
      await pause(1000 * (attempt + 1));
    }
    if (!res || !res.ok) {
      const detail = res ? await res.text().catch(() => "") : "";
      throw new Error(
        `ElevenLabs shared voice list failed (${res?.status ?? 0}): ${detail.slice(0, 200) || res?.statusText || "no response"}`
      );
    }
    const payload = (await res.json()) as {
      voices?: ElevenLabsSharedVoiceRow[];
      has_more?: boolean;
    };
    const rows = payload.voices ?? [];
    if (rows.length === 0) {
      break;
    }
    const mapped: VoiceLibraryEntry[] = [];
    for (const row of rows) {
      if (sharedVoicesLimit !== null && yielded + mapped.length >= sharedVoicesLimit) {
        break;
      }
      const voice = mapElevenLabsSharedVoice(row);
      if (voice) {
        mapped.push(voice);
      }
    }
    if (mapped.length > 0) {
      yield mapped;
      yielded += mapped.length;
    }
    if (sharedVoicesLimit !== null && yielded >= sharedVoicesLimit) {
      break;
    }
    if (!payload.has_more) {
      break;
    }
    page += 1;
  }
}

export async function fetchElevenLabsSharedVoices(
  apiKey: string,
  options?: SharedVoicesFetchOptions
): Promise<{
  voices: VoiceLibraryEntry[];
  fetched: number;
  paginationLimited: boolean;
  sharedVoicesLimit: number;
}> {
  const fetchFn = options?.fetchFn ?? fetch;
  const sharedVoicesLimit = options?.maxVoices ?? resolveSharedVoicesLimit();
  const pageSize = Math.min(options?.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const voices: VoiceLibraryEntry[] = [];
  let page = 0;
  let paginationLimited = false;

  while (sharedVoicesLimit === null || voices.length < sharedVoicesLimit) {
    const remaining =
      sharedVoicesLimit === null ? pageSize : sharedVoicesLimit - voices.length;
    const requestSize = Math.min(pageSize, remaining);
    const url = `https://api.elevenlabs.io/v1/shared-voices?page_size=${requestSize}&page=${page}`;
    const res = await fetchFn(url, {
      headers: { "xi-api-key": apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `ElevenLabs shared voice list failed (${res.status}): ${detail.slice(0, 200) || res.statusText}`
      );
    }

    const payload = (await res.json()) as {
      voices?: ElevenLabsSharedVoiceRow[];
      has_more?: boolean;
    };
    const rows = payload.voices ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (sharedVoicesLimit !== null && voices.length >= sharedVoicesLimit) {
        paginationLimited = true;
        break;
      }
      const mapped = mapElevenLabsSharedVoice(row);
      if (mapped) {
        voices.push(mapped);
      }
    }

    if (sharedVoicesLimit !== null && voices.length >= sharedVoicesLimit) {
      paginationLimited = Boolean(payload.has_more);
      break;
    }
    if (!payload.has_more) {
      break;
    }
    page += 1;
  }

  return {
    voices,
    fetched: voices.length,
    paginationLimited,
    sharedVoicesLimit: sharedVoicesLimit ?? voices.length,
  };
}
