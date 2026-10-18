import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { VoiceCatalogDraft } from "@/lib/studio-voice-catalog-policy";
import {
  buildVoiceCatalogWhere,
  searchVoiceCatalogWithClient,
  voiceCatalogFilterOptionsFromCounts,
  type VoiceCatalogSearchInput,
  type VoiceCatalogSearchClient,
  type VoiceCatalogSearchRow,
} from "@/lib/studio-voice-catalog-search";
import type { VoiceCatalogSyncClient } from "@/server/studio/studio-voice-catalog-sync";

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

export function searchStudioVoiceCatalog(input: VoiceCatalogSearchInput) {
  const client: VoiceCatalogSearchClient = {
    count: (args) =>
      prisma.studioVoiceCatalogEntry.count({
        where: args.where as Prisma.StudioVoiceCatalogEntryWhereInput,
      }),
    findMany: async (args) => {
      const rows = await prisma.studioVoiceCatalogEntry.findMany({
        where: args.where as Prisma.StudioVoiceCatalogEntryWhereInput,
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
        where: args.where as Prisma.StudioVoiceCatalogEntryWhereInput,
        _count: { _all: true },
      });
      return rows.map((row) => ({
        canonicalLanguage: row.canonicalLanguage,
        _count: { _all: row._count._all },
      }));
    },
  };
  return searchVoiceCatalogWithClient(client, input);
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
    },
  };
}
