/**
 * Page a cached voice catalog without sending every row to the browser.
 */

import { filterVoiceLibrary } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog, VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

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
    page?: number;
    pageSize?: number;
  }
): VoiceLibraryPageResult {
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? VOICE_LIBRARY_PAGE_SIZE));
  const page = Math.max(0, Math.floor(input.page ?? 0));
  const query = input.query?.trim() ?? "";
  const language = input.language?.trim() ?? "";
  const accent = input.accent?.trim() ?? "";
  let matches = filterVoiceLibrary(catalog, {
    query,
    language: language || undefined,
    accentId: accent || undefined,
  });
  if (accent && matches.length === 0) {
    const raw = accent.toLowerCase();
    matches = filterVoiceLibrary(catalog, {
      query,
      language: language || undefined,
    }).filter((voice) => (voice.accent || "").trim().toLowerCase() === raw);
  }
  const start = page * pageSize;
  return {
    voices: matches.slice(start, start + pageSize).map(slimVoice),
    total: matches.length,
    page,
    pageSize,
  };
}
