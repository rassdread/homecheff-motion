import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeVoiceConceptIds } from "@/lib/studio-voice-characteristics";
import type { VoiceCatalogDraft } from "@/lib/studio-voice-catalog-policy";
import {
  buildVoiceCatalogWhere,
  recommendVoiceCatalogWithClient,
  searchVoiceCatalogWithClient,
  voiceCatalogFilterOptionsFromCounts,
  VOICE_CATALOG_PAGE_SIZE,
  type VoiceCatalogSearchInput,
  type VoiceCatalogSearchClient,
  type VoiceCatalogSearchRow,
  type VoiceCatalogWhere,
} from "@/lib/studio-voice-catalog-search";
import { replaceVoiceCharacteristics } from "@/server/studio/studio-voice-characteristic-index";
import {
  characteristicCountSql,
  characteristicPageSql,
  conceptFacetSql,
  prismaCatalogWhere,
} from "@/server/studio/studio-voice-characteristic-query";
import type { VoiceCatalogSyncClient } from "@/server/studio/studio-voice-catalog-sync";
import type { VoiceLibraryPageResult } from "@/lib/studio-voice-library-page";

async function countBy(
  field: "accentId" | "gender" | "age" | "category" | "canonicalLanguage"
) {
  const where = buildVoiceCatalogWhere({});
  const rows = await prisma.studioVoiceCatalogEntry.groupBy({
    by: [field],
    where: where as Prisma.StudioVoiceCatalogEntryWhereInput,
    _count: { _all: true },
  });
  return rows.map((row) => ({
    value: String(row[field] ?? ""),
    voiceCount: row._count._all,
  }));
}

/** Summary for the editor. Counts come from the database; voice rows are not loaded. */
export async function loadStudioVoiceCatalogSummary() {
  const where = buildVoiceCatalogWhere({});
  const [totalVoices, accents, genders, languages, ages, categories] = await Promise.all([
    prisma.studioVoiceCatalogEntry.count({ where }),
    countBy("accentId"),
    countBy("gender"),
    countBy("canonicalLanguage"),
    countBy("age"),
    countBy("category"),
  ]);
  return {
    totalVoices,
    filterOptions: voiceCatalogFilterOptionsFromCounts({
      accents,
      genders,
      languages,
      ages,
      categories,
    }),
  };
}

export function recommendStudioVoices(input: VoiceCatalogSearchInput) {
  return recommendVoiceCatalogWithClient(catalogSearchClient(), input);
}

function catalogSearchClient(): VoiceCatalogSearchClient {
  return {
    count: (args) =>
      prisma.studioVoiceCatalogEntry.count({
        where: prismaCatalogWhere(args.where),
      }),
    findMany: async (args) => {
      const rows = await prisma.studioVoiceCatalogEntry.findMany({
        where: prismaCatalogWhere(args.where),
        orderBy: args.orderBy,
        skip: args.skip,
        take: args.take,
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
      return rows satisfies VoiceCatalogSearchRow[];
    },
    groupBy: async (args) => {
      const rows = await prisma.studioVoiceCatalogEntry.groupBy({
        by: ["canonicalLanguage"],
        where: prismaCatalogWhere(args.where),
        _count: { _all: true },
      });
      return rows.map((row) => ({
        canonicalLanguage: row.canonicalLanguage,
        _count: { _all: row._count._all },
      }));
    },
    groupByValue: async (field, where) => {
      const scoped = prismaCatalogWhere(where);
      if (field === "accentId") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["accentId"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.accentId, voiceCount: row._count._all }));
      }
      if (field === "locale") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["locale"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.locale, voiceCount: row._count._all }));
      }
      if (field === "gender") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["gender"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.gender, voiceCount: row._count._all }));
      }
      if (field === "age") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["age"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.age, voiceCount: row._count._all }));
      }
      if (field === "useCase") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["useCase"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.useCase, voiceCount: row._count._all }));
      }
      if (field === "descriptive") {
        const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["descriptive"], where: scoped, _count: { _all: true } });
        return rows.map((row) => ({ value: row.descriptive, voiceCount: row._count._all }));
      }
      const rows = await prisma.studioVoiceCatalogEntry.groupBy({ by: ["category"], where: scoped, _count: { _all: true } });
      return rows.map((row) => ({ value: row.category, voiceCount: row._count._all }));
    },
    groupByRawAccent: async (where) => {
      const rows = await prisma.studioVoiceCatalogEntry.groupBy({
        by: ["accent"],
        where: { ...prismaCatalogWhere(where), accentId: "", NOT: { accent: "" } },
        _count: { _all: true },
      });
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = row.accent.trim().toLowerCase();
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + row._count._all);
      }
      return [...counts.entries()].map(([value, voiceCount]) => ({ value, voiceCount }));
    },
    groupByAccentLocale: async (where) => {
      const rows = await prisma.studioVoiceCatalogEntry.groupBy({
        by: ["accentId", "locale"],
        where: prismaCatalogWhere(where),
        _count: { _all: true },
      });
      return rows.map((row) => ({
        accentId: row.accentId,
        locale: row.locale,
        voiceCount: row._count._all,
      }));
    },
  };
}

async function conceptCounts(where: VoiceCatalogWhere) {
  const rows = await prisma.$queryRaw<Array<{ concept: string; exact: number; related: number }>>(conceptFacetSql(where));
  return rows
    .map((row) => ({ concept: row.concept, exact: Number(row.exact), related: Number(row.related) }))
    .filter((row) => row.related > 0);
}

async function searchByCharacteristics(input: VoiceCatalogSearchInput, concepts: string[]): Promise<VoiceLibraryPageResult> {
  const mode = input.matchMode === "related" ? "related" : "strict";
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? VOICE_CATALOG_PAGE_SIZE));
  const page = Math.max(0, Math.floor(input.page ?? 0));
  const where = buildVoiceCatalogWhere({ ...input, concepts: undefined });
  const [counted, rows, base] = await Promise.all([
    prisma.$queryRaw<Array<{ total: number }>>(characteristicCountSql(where, concepts, mode)),
    prisma.$queryRaw<VoiceCatalogSearchRow[]>(characteristicPageSql(where, concepts, mode, page * pageSize, pageSize)),
    searchVoiceCatalogWithClient(catalogSearchClient(), { ...input, concepts: undefined, page: 0, pageSize: 1 }),
  ]);
  const conceptsForFacets = await conceptCounts(where);
  return {
    ...base,
    voices: rows.map((row) => ({
      id: row.providerVoiceId,
      name: row.name,
      accent: row.accent,
      gender: row.gender,
      age: row.age,
      language: row.canonicalLanguage,
      description: row.description,
      previewUrl: row.previewUrl,
      category: row.category || undefined,
    })),
    total: Number(counted[0]?.total ?? 0),
    page,
    pageSize,
    conceptCounts: conceptsForFacets,
  };
}

export async function searchStudioVoiceCatalog(input: VoiceCatalogSearchInput): Promise<VoiceLibraryPageResult> {
  const concepts = normalizeVoiceConceptIds(input.concepts);
  if (concepts.length > 0) {
    return searchByCharacteristics(input, concepts);
  }
  const page = await searchVoiceCatalogWithClient(catalogSearchClient(), input);
  if (input.facets === false) return page;
  const counts = await conceptCounts(buildVoiceCatalogWhere(input));
  return { ...page, conceptCounts: counts };
}

export function studioVoiceCatalogSyncClient(): VoiceCatalogSyncClient {
  return {
    async findRunning(since) {
      return prisma.studioVoiceCatalogSyncRun.findFirst({
        where: { status: "running", startedAt: { gt: since } },
        select: { id: true, status: true, startedAt: true },
      });
    },
    async findLastCompleted() {
      const row = await prisma.studioVoiceCatalogSyncRun.findFirst({
        where: { status: "completed", finishedAt: { not: null } },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true },
      });
      if (!row?.finishedAt) {
        return null;
      }
      return { finishedAt: row.finishedAt };
    },
    async startRun(now) {
      return prisma.studioVoiceCatalogSyncRun.create({
        data: { status: "running", startedAt: now },
        select: { id: true, status: true, startedAt: true },
      });
    },
    async finishRun(id, patch) {
      await prisma.studioVoiceCatalogSyncRun.update({
        where: { id },
        data: patch,
      });
    },
    async upsert(draft: VoiceCatalogDraft, now) {
      const data = {
        name: draft.name,
        canonicalLanguage: draft.canonicalLanguage,
        originalLanguage: draft.originalLanguage,
        locale: draft.locale,
        accent: draft.accent,
        accentId: draft.accentId,
        gender: draft.gender,
        age: draft.age,
        category: draft.category,
        description: draft.description,
        descriptive: draft.descriptive,
        useCase: draft.useCase,
        labelsJson: draft.labelsJson as Prisma.InputJsonValue,
        previewUrl: draft.previewUrl,
        catalogSource: draft.catalogSource,
        eligibilityStatus: draft.eligibilityStatus,
        availabilityStatus: draft.availabilityStatus,
        modelCompatibility: draft.modelCompatibility,
        sampleStatus: draft.sampleStatus,
        lastSeenAt: now,
        lastCheckedAt: now,
      };
      await prisma.studioVoiceCatalogEntry.upsert({
        where: {
          provider_providerVoiceId: {
            provider: draft.provider,
            providerVoiceId: draft.providerVoiceId,
          },
        },
        create: {
          ...data,
          provider: draft.provider,
          providerVoiceId: draft.providerVoiceId,
          firstSeenAt: now,
        },
        update: data,
      });
      await replaceVoiceCharacteristics([{
        provider: draft.provider,
        providerVoiceId: draft.providerVoiceId,
        description: draft.description,
        descriptive: draft.descriptive,
      }]);
    },
  };
}
