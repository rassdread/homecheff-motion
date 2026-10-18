import { prisma } from "@/lib/prisma";
import {
  pageFavoriteRows,
  setVoiceFavoriteWithStore,
  VOICE_FAVORITE_PROVIDER,
  type VoiceFavoriteRow,
  type VoiceFavoriteStore,
} from "@/lib/studio-voice-favorites";
import { searchStudioVoiceCatalog } from "@/server/studio/studio-voice-catalog-db";
import type { VoiceCatalogSearchInput } from "@/lib/studio-voice-catalog-search";
import type { VoiceLibraryPageResult } from "@/lib/studio-voice-library-page";

function store(): VoiceFavoriteStore {
  return {
    async list(userId) {
      const rows = await prisma.studioVoiceFavorite.findMany({
        where: { userId, provider: VOICE_FAVORITE_PROVIDER },
        orderBy: { createdAt: "desc" },
        select: { userId: true, provider: true, providerVoiceId: true, createdAt: true },
      });
      return rows;
    },
    async add(row) {
      await prisma.studioVoiceFavorite.upsert({
        where: {
          userId_provider_providerVoiceId: {
            userId: row.userId,
            provider: row.provider,
            providerVoiceId: row.providerVoiceId,
          },
        },
        create: row,
        update: {},
      });
    },
    async remove(row) {
      await prisma.studioVoiceFavorite.deleteMany({
        where: {
          userId: row.userId,
          provider: row.provider,
          providerVoiceId: row.providerVoiceId,
        },
      });
    },
  };
}

export function setStudioVoiceFavorite(input: {
  userId: string;
  providerVoiceId: string;
  favorite: boolean;
}) {
  return setVoiceFavoriteWithStore(store(), input);
}

export async function studioVoiceFavoriteIds(userId: string, voiceIds: string[]): Promise<string[]> {
  const ids = [...new Set(voiceIds.map((id) => id.trim()).filter(Boolean))].slice(0, 48);
  if (ids.length === 0) return [];
  const rows = await prisma.studioVoiceFavorite.findMany({
    where: { userId, provider: VOICE_FAVORITE_PROVIDER, providerVoiceId: { in: ids } },
    select: { providerVoiceId: true },
  });
  return rows.map((row) => row.providerVoiceId);
}

function emptyFavoritePage(page: number, pageSize: number): VoiceLibraryPageResult {
  return {
    voices: [],
    total: 0,
    page,
    pageSize,
    languageCounts: [],
    accentCounts: [],
    localeCounts: [],
    suppressedAccentIds: [],
  };
}

export async function listStudioVoiceFavorites(
  userId: string,
  input: VoiceCatalogSearchInput
): Promise<VoiceLibraryPageResult> {
  const rows = await store().list(userId);
  if (rows.length === 0) {
    return emptyFavoritePage(0, input.pageSize ?? 24);
  }
  const filtersActive = Boolean(
    input.query?.trim() || input.language?.trim() || input.accent?.trim() || input.locale?.trim() || input.gender?.trim() || input.age?.trim() || input.category?.trim()
  );
  if (filtersActive) {
    return searchStudioVoiceCatalog({
      ...input,
      providerVoiceIds: rows.map((row) => row.providerVoiceId),
      facets: true,
    });
  }
  const page = pageFavoriteRows(rows, input.page ?? 0, input.pageSize ?? 24);
  const ids = page.rows.map((row) => row.providerVoiceId);
  const catalog = await prisma.studioVoiceCatalogEntry.findMany({
    where: { provider: VOICE_FAVORITE_PROVIDER, providerVoiceId: { in: ids } },
    select: {
      providerVoiceId: true,
      name: true,
      canonicalLanguage: true,
      accent: true,
      gender: true,
      age: true,
      category: true,
      description: true,
      previewUrl: true,
    },
  });
  const byId = new Map(catalog.map((row) => [row.providerVoiceId, row]));
  return {
    voices: page.rows.map((row) => {
      const match = byId.get(row.providerVoiceId);
      return {
        id: row.providerVoiceId,
        name: match?.name || "Stem tijdelijk niet in de catalogus",
        accent: match?.accent ?? "",
        gender: match?.gender ?? "",
        age: match?.age ?? "",
        language: match?.canonicalLanguage ?? "",
        description: match?.description ?? "",
        previewUrl: match?.previewUrl ?? "",
        category: match?.category || undefined,
      };
    }),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
    languageCounts: [],
    accentCounts: [],
    localeCounts: [],
    suppressedAccentIds: [],
  };
}

export type { VoiceFavoriteRow };
