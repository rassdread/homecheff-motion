/**
 * Paginated search against StudioVoiceCatalogEntry.
 * The query asks the database for one page. It does not load the catalog into memory.
 * Public discovery stays on the provider cache until STUDIO_VOICE_CATALOG_DB=1.
 */

import { CANONICAL_ACCENT_DEFINITIONS } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { canonicalVoiceAge, canonicalVoiceLanguage } from "@/lib/studio-voice-language";
import type { VoiceLibraryPageResult } from "@/lib/studio-voice-library-page";

export const VOICE_CATALOG_PAGE_SIZE = 24;

export type VoiceCatalogSearchInput = {
  query?: string;
  language?: string;
  accent?: string;
  gender?: string;
  age?: string;
  category?: string;
  sample?: "yes" | "no" | "";
  page?: number;
  pageSize?: number;
};

export type VoiceCatalogWhere = {
  eligibilityStatus: "ELIGIBLE";
  availabilityStatus: "AVAILABILITY_UNKNOWN";
  previewUrl?: { not: string } | string;
  canonicalLanguage?: string;
  accentId?: string;
  gender?: string;
  age?: string;
  category?: string;
  OR?: Array<Record<string, { contains: string; mode: "insensitive" }>>;
};

export type VoiceCatalogSearchRow = {
  providerVoiceId: string;
  name: string;
  canonicalLanguage: string;
  accent: string;
  gender: string;
  age: string;
  category: string;
  description: string;
  previewUrl: string;
};

export type VoiceCatalogSearchClient = {
  count(args: { where: VoiceCatalogWhere }): Promise<number>;
  findMany(args: {
    where: VoiceCatalogWhere;
    orderBy: Array<{ name: "asc" } | { providerVoiceId: "asc" }>;
    skip: number;
    take: number;
    select: Record<string, true>;
  }): Promise<VoiceCatalogSearchRow[]>;
  groupBy(args: {
    by: ["canonicalLanguage"];
    where: VoiceCatalogWhere;
    _count: { _all: true };
  }): Promise<Array<{ canonicalLanguage: string; _count: { _all: number } }>>;
};

export function isStudioVoiceCatalogDbEnabled(): boolean {
  return process.env.STUDIO_VOICE_CATALOG_DB === "1";
}

export function buildVoiceCatalogWhere(input: VoiceCatalogSearchInput): VoiceCatalogWhere {
  const where: VoiceCatalogWhere = {
    eligibilityStatus: "ELIGIBLE",
    availabilityStatus: "AVAILABILITY_UNKNOWN",
    previewUrl: { not: "" },
  };
  const language = canonicalVoiceLanguage(input.language ?? "");
  if (language) {
    where.canonicalLanguage = language;
  }
  const accent = input.accent?.trim() ?? "";
  if (accent) {
    where.accentId = accent;
  }
  const gender = input.gender?.trim().toLowerCase() ?? "";
  if (gender) {
    where.gender = gender;
  }
  const age = canonicalVoiceAge(input.age ?? "");
  if (age) {
    where.age = age;
  }
  const category = input.category?.trim().toLowerCase() ?? "";
  if (category) {
    where.category = category;
  }
  if (input.sample === "no") {
    where.previewUrl = "";
  }
  const query = input.query?.trim() ?? "";
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { accent: { contains: query, mode: "insensitive" } },
    ];
  }
  return where;
}

function whereWithoutLanguage(where: VoiceCatalogWhere): VoiceCatalogWhere {
  const next = { ...where };
  delete next.canonicalLanguage;
  return next;
}

const GENDER_LABEL_KEYS: Record<string, string> = {
  male: "studio.voiceLibrary.filter.gender.male",
  female: "studio.voiceLibrary.filter.gender.female",
  neutral: "studio.voiceLibrary.filter.gender.neutral",
};

const AGE_LABEL_KEYS: Record<string, string> = {
  young: "studio.voiceLibrary.filter.age.young",
  middle_aged: "studio.voiceLibrary.filter.age.middleAged",
  old: "studio.voiceLibrary.filter.age.old",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  professional: "studio.voiceLibrary.category.professional",
  high_quality: "studio.voiceLibrary.category.highQuality",
  shared: "studio.voiceLibrary.category.shared",
  cloned: "studio.voiceLibrary.category.cloned",
  premade: "studio.voiceLibrary.category.premade",
  default: "studio.voiceLibrary.category.premade",
};

export type VoiceCatalogCount = { value: string; voiceCount: number };

export function voiceCatalogFilterOptionsFromCounts(input: {
  accents: VoiceCatalogCount[];
  genders: VoiceCatalogCount[];
  languages: VoiceCatalogCount[];
  ages: VoiceCatalogCount[];
  categories: VoiceCatalogCount[];
}): VoiceLibraryFilterOptions {
  const accentLabels = new Map(CANONICAL_ACCENT_DEFINITIONS.map((item) => [item.id, item]));
  return {
    accents: input.accents
      .filter((item) => item.value && accentLabels.has(item.value))
      .map((item) => {
        const definition = accentLabels.get(item.value)!;
        return {
          id: definition.id,
          familyId: definition.familyId,
          labelKey: definition.labelKey,
          voiceCount: item.voiceCount,
        };
      }),
    genders: input.genders.filter((item) => item.value).map((item) => ({
      value: item.value,
      labelKey: GENDER_LABEL_KEYS[item.value] ?? "studio.voiceLibrary.filter.gender.other",
      voiceCount: item.voiceCount,
    })),
    languages: input.languages.filter((item) => item.value),
    ages: input.ages.filter((item) => item.value).map((item) => ({
      value: item.value,
      labelKey: AGE_LABEL_KEYS[item.value] ?? "studio.voiceLibrary.filter.age.other",
      voiceCount: item.voiceCount,
    })),
    categories: input.categories.filter((item) => item.value).map((item) => ({
      value: item.value,
      labelKey: CATEGORY_LABEL_KEYS[item.value] ?? "studio.voiceLibrary.category.other",
      voiceCount: item.voiceCount,
    })),
  };
}

export async function searchVoiceCatalogWithClient(
  client: VoiceCatalogSearchClient,
  input: VoiceCatalogSearchInput
): Promise<VoiceLibraryPageResult> {
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? VOICE_CATALOG_PAGE_SIZE));
  const page = Math.max(0, Math.floor(input.page ?? 0));
  const where = buildVoiceCatalogWhere(input);
  const orderBy = [{ name: "asc" as const }, { providerVoiceId: "asc" as const }];
  const select = {
    providerVoiceId: true,
    name: true,
    canonicalLanguage: true,
    accent: true,
    gender: true,
    age: true,
    category: true,
    description: true,
    previewUrl: true,
  } as const;
  const [total, rows, groups] = await Promise.all([
    client.count({ where }),
    client.findMany({ where, orderBy, skip: page * pageSize, take: pageSize, select }),
    client.groupBy({
      by: ["canonicalLanguage"],
      where: whereWithoutLanguage(where),
      _count: { _all: true },
    }),
  ]);
  return {
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
    total,
    page,
    pageSize,
    languageCounts: groups
      .filter((group) => group.canonicalLanguage)
      .map((group) => ({ value: group.canonicalLanguage, voiceCount: group._count._all }))
      .sort((a, b) => a.value.localeCompare(b.value)),
  };
}
