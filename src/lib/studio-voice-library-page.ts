/**
 * Page a cached voice catalog without sending every row to the browser.
 */

import { filterVoiceLibrary } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog, VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";
import { canonicalVoiceLanguage } from "@/lib/studio-voice-language";

export const VOICE_LIBRARY_PAGE_SIZE = 24;

export type VoiceLibraryPageVoice = {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  language: string;
  description: string;
  previewUrl: string;
};

export type VoiceLibraryPageResult = {
  voices: VoiceLibraryPageVoice[];
  total: number;
  page: number;
  pageSize: number;
  languageCounts: Array<{ value: string; voiceCount: number }>;
};

function slimVoice(voice: VoiceLibraryEntry): VoiceLibraryPageVoice {
  return {
    id: voice.id,
    name: voice.name,
    accent: voice.accent,
    gender: voice.gender,
    age: voice.age,
    language: voice.language,
    description: voice.description.trim().slice(0, 180),
    previewUrl: voice.previewUrl,
  };
}

export function pageVoiceLibrary(
  catalog: VoiceLibraryCatalog,
  input: {
    query?: string;
    language?: string;
    accent?: string;
    gender?: string;
    age?: string;
    sample?: "yes" | "no" | "";
    category?: string;
    page?: number;
    pageSize?: number;
  }
): VoiceLibraryPageResult {
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? VOICE_LIBRARY_PAGE_SIZE));
  const page = Math.max(0, Math.floor(input.page ?? 0));
  const query = input.query?.trim() ?? "";
  const language = canonicalVoiceLanguage(input.language ?? "");
  const accent = input.accent?.trim() ?? "";
  const shared = {
    query,
    accentId: accent || undefined,
    gender: input.gender?.trim() || undefined,
    age: input.age?.trim() || undefined,
    category: input.category?.trim() || undefined,
  };
  let matches = filterVoiceLibrary(catalog, shared);
  if (accent && matches.length === 0) {
    const raw = accent.toLowerCase();
    matches = filterVoiceLibrary(catalog, {
      query,
      gender: shared.gender,
      age: shared.age,
      category: shared.category,
    }).filter((voice) => (voice.accent || "").trim().toLowerCase() === raw);
  }
  if (input.sample === "yes") {
    matches = matches.filter((voice) => Boolean(voice.previewUrl.trim()));
  } else if (input.sample === "no") {
    matches = matches.filter((voice) => !voice.previewUrl.trim());
  }
  const languageCounts = new Map<string, number>();
  for (const voice of matches) {
    const code = canonicalVoiceLanguage(voice.language || voice.labels.language || "");
    if (!code) continue;
    languageCounts.set(code, (languageCounts.get(code) ?? 0) + 1);
  }
  if (language) {
    matches = matches.filter(
      (voice) => canonicalVoiceLanguage(voice.language || voice.labels.language || "") === language
    );
    if (!languageCounts.has(language)) {
      languageCounts.set(language, 0);
    }
  }
  matches.sort((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id));
  const start = page * pageSize;
  return {
    voices: matches.slice(start, start + pageSize).map(slimVoice),
    total: matches.length,
    page,
    pageSize,
    languageCounts: [...languageCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, voiceCount]) => ({ value, voiceCount })),
  };
}
