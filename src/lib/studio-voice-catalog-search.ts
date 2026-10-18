/**
 * Paginated search against StudioVoiceCatalogEntry.
 * The query asks the database for one page. It does not load the catalog into memory.
 * Public discovery stays on the provider cache until STUDIO_VOICE_CATALOG_DB=1.
 */

import { CANONICAL_ACCENT_DEFINITIONS } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { rawAccentFilterValue, rawAccentLabel } from "@/lib/studio-voice-characteristics";
import type { VoiceMatchMode } from "@/lib/studio-voice-characteristics";
import { canonicalVoiceAge, canonicalVoiceLanguage, voiceGenderPreference, voiceLocaleLabel } from "@/lib/studio-voice-language";
import { suppressedAccentIds } from "@/lib/studio-voice-filter-presentation";
import type { VoiceLibraryPageResult } from "@/lib/studio-voice-library-page";

export const VOICE_CATALOG_PAGE_SIZE = 24;

export type VoiceCatalogSearchInput = {
  query?: string;
  language?: string;
  accent?: string;
  gender?: string;
  age?: string;
  category?: string;
  locale?: string;
  useCase?: string;
  descriptive?: string;
  concepts?: string[];
  matchMode?: VoiceMatchMode;
  sample?: "yes" | "no" | "";
  page?: number;
  pageSize?: number;
  facets?: boolean;
  providerVoiceIds?: string[];
};

export type VoiceCatalogWhere = {
  eligibilityStatus: "ELIGIBLE";
  availabilityStatus: "AVAILABILITY_UNKNOWN";
  previewUrl?: { not: string } | string;
  canonicalLanguage?: string;
  locale?: string;
  accentId?: string;
  gender?: string;
  age?: string;
  category?: string;
  useCase?: string;
  descriptive?: string;
  accentEquals?: string;
  textQuery?: string;
  OR?: Array<Record<string, { contains: string; mode: "insensitive" }>>;
  providerVoiceId?: { in: string[] };
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
  groupByValue?(field: "accentId" | "locale" | "gender" | "age" | "category" | "useCase" | "descriptive", where: VoiceCatalogWhere): Promise<VoiceCatalogCount[]>;
  groupByAccentLocale?(where: VoiceCatalogWhere): Promise<Array<{ accentId: string; locale: string; voiceCount: number }>>;
  groupByRawAccent?(where: VoiceCatalogWhere): Promise<VoiceCatalogCount[]>;
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
  const rawAccent = rawAccentFilterValue(input.accent ?? "");
  const accent = input.accent?.trim() ?? "";
  if (rawAccent) {
    where.accentId = "";
    where.accentEquals = rawAccent;
  } else if (accent) {
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
  const locale = input.locale?.trim() ?? "";
  if (locale) {
    where.locale = locale;
  }
  const useCase = input.useCase?.trim().toLowerCase() ?? "";
  if (/^[a-z0-9_]{1,40}$/.test(useCase)) {
    where.useCase = useCase;
  }
  const descriptive = input.descriptive?.trim().toLowerCase() ?? "";
  if (/^[a-z0-9_]{1,40}$/.test(descriptive)) {
    where.descriptive = descriptive;
  }
  if (input.sample === "no") {
    where.previewUrl = "";
  }
  if (input.providerVoiceIds) {
    where.providerVoiceId = { in: input.providerVoiceIds };
  }
  const query = input.query?.trim() ?? "";
  if (query) {
    where.textQuery = query.slice(0, 80);
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { accent: { contains: query, mode: "insensitive" } },
    ];
  }
  return where;
}

export function voiceCatalogInputFromSearchParams(url: URL): VoiceCatalogSearchInput {
  const concepts = (url.searchParams.get("concepts") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return {
    query: url.searchParams.get("q") ?? "",
    language: url.searchParams.get("language") ?? "",
    accent: url.searchParams.get("accent") ?? "",
    gender: url.searchParams.get("gender") ?? "",
    age: url.searchParams.get("age") ?? "",
    category: url.searchParams.get("category") ?? "",
    locale: url.searchParams.get("locale") ?? "",
    useCase: url.searchParams.get("useCase") ?? "",
    descriptive: url.searchParams.get("descriptive") ?? "",
    concepts,
    matchMode: url.searchParams.get("matchMode") === "related" ? "related" : "strict",
    sample:
      url.searchParams.get("sample") === "yes" ? "yes"
      : url.searchParams.get("sample") === "no" ? "no"
      : "",
    page: Number(url.searchParams.get("page")) || 0,
    pageSize: Number(url.searchParams.get("pageSize")) || 24,
  };
}

function whereWithout(where: VoiceCatalogWhere, keys: Array<keyof VoiceCatalogWhere>): VoiceCatalogWhere {
  const next = { ...where };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

export function accentOptionsFromCounts(counts: VoiceCatalogCount[]) {
  const labels = new Map(CANONICAL_ACCENT_DEFINITIONS.map((item) => [item.id, item]));
  return counts
    .filter((item) => item.value && labels.has(item.value))
    .map((item) => {
      const definition = labels.get(item.value)!;
      return { value: definition.id, labelKey: definition.labelKey, voiceCount: item.voiceCount };
    });
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
  const includeFacets = input.facets !== false;
  const languageSelected = Boolean(canonicalVoiceLanguage(input.language ?? ""));
  const [total, rows, groups, accentGroups, localeGroups, genderGroups, ageGroups, categoryGroups, accentLocalePairs, useCaseGroups, descriptiveGroups, rawAccentGroups] = await Promise.all([
    client.count({ where }),
    client.findMany({ where, orderBy, skip: page * pageSize, take: pageSize, select }),
    includeFacets
      ? client.groupBy({
          by: ["canonicalLanguage"],
          where: whereWithout(where, ["canonicalLanguage"]),
          _count: { _all: true },
        })
      : Promise.resolve([]),
    includeFacets && client.groupByValue
      ? client.groupByValue("accentId", whereWithout(where, ["accentId", "accentEquals"]))
      : Promise.resolve([]),
    includeFacets && client.groupByValue
      ? client.groupByValue("locale", whereWithout(where, ["locale", "accentId", "accentEquals"]))
      : Promise.resolve([]),
    includeFacets && languageSelected && client.groupByValue
      ? client.groupByValue("gender", whereWithout(where, ["gender"]))
      : Promise.resolve([]),
    includeFacets && languageSelected && client.groupByValue
      ? client.groupByValue("age", whereWithout(where, ["age"]))
      : Promise.resolve([]),
    includeFacets && languageSelected && client.groupByValue
      ? client.groupByValue("category", whereWithout(where, ["category"]))
      : Promise.resolve([]),
    includeFacets && languageSelected && client.groupByAccentLocale
      ? client.groupByAccentLocale(whereWithout(where, ["locale", "accentId", "accentEquals"]))
      : Promise.resolve([]),
    includeFacets && client.groupByValue
      ? client.groupByValue("useCase", whereWithout(where, ["useCase"]))
      : Promise.resolve([]),
    includeFacets && client.groupByValue
      ? client.groupByValue("descriptive", whereWithout(where, ["descriptive"]))
      : Promise.resolve([]),
    includeFacets && client.groupByRawAccent
      ? client.groupByRawAccent(whereWithout(where, ["accentId", "accentEquals"]))
      : Promise.resolve([]),
  ]);
  const scoped = voiceCatalogFilterOptionsFromCounts({
    accents: [],
    genders: genderGroups,
    languages: [],
    ages: ageGroups,
    categories: categoryGroups,
  });
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
    accentCounts: [
      ...accentOptionsFromCounts(accentGroups),
      ...rawAccentGroups
        .filter((item) => item.value)
        .map((item) => ({
          value: `raw:${item.value}`,
          labelKey: "",
          label: rawAccentLabel(item.value),
          voiceCount: item.voiceCount,
        })),
    ],
    suppressedAccentIds: suppressedAccentIds({
      selectedLocale: input.locale,
      pairs: accentLocalePairs,
    }),
    genderCounts: languageSelected ? scoped.genders : [],
    ageCounts: languageSelected ? scoped.ages : [],
    categoryCounts: languageSelected ? scoped.categories : [],
    useCaseCounts: useCaseGroups.filter((item) => item.value),
    descriptiveCounts: descriptiveGroups.filter((item) => item.value),
    localeCounts: localeGroups
      .filter((item) => item.value)
      .map((item) => ({ value: item.value, label: voiceLocaleLabel(item.value), voiceCount: item.voiceCount }))
      .sort((a, b) => a.label.localeCompare(b.label, "nl")),
  };
}

export async function recommendVoiceCatalogWithClient(
  client: VoiceCatalogSearchClient,
  input: VoiceCatalogSearchInput
): Promise<VoiceLibraryPageResult> {
  const page = await searchVoiceCatalogWithClient(client, {
    language: canonicalVoiceLanguage(input.language ?? ""),
    gender: voiceGenderPreference(input.gender),
    page: 0,
    pageSize: 8,
    facets: false,
  });
  return { ...page, relaxed: false };
}
