import { Prisma } from "@prisma/client";
import type { VoiceCatalogSearchRow, VoiceCatalogWhere } from "@/lib/studio-voice-catalog-search";
import { voiceConceptById, voiceConcepts, type VoiceMatchMode } from "@/lib/studio-voice-characteristics";

export function prismaCatalogWhere(where: VoiceCatalogWhere): Prisma.StudioVoiceCatalogEntryWhereInput {
  const next: Prisma.StudioVoiceCatalogEntryWhereInput = {
    eligibilityStatus: where.eligibilityStatus,
    availabilityStatus: where.availabilityStatus,
  };
  if (where.previewUrl !== undefined) next.previewUrl = where.previewUrl;
  if (where.canonicalLanguage) next.canonicalLanguage = where.canonicalLanguage;
  if (where.locale) next.locale = where.locale;
  if (where.accentEquals) {
    next.accentId = "";
    next.accent = { equals: where.accentEquals, mode: "insensitive" };
  } else if (where.accentId) {
    next.accentId = where.accentId;
  }
  if (where.gender) next.gender = where.gender;
  if (where.age) next.age = where.age;
  if (where.category) next.category = where.category;
  if (where.useCase) next.useCase = where.useCase;
  if (where.descriptive) next.descriptive = where.descriptive;
  if (where.providerVoiceId) next.providerVoiceId = where.providerVoiceId;
  if (where.OR) next.OR = where.OR as Prisma.StudioVoiceCatalogEntryWhereInput["OR"];
  return next;
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function catalogFilterSql(where: VoiceCatalogWhere): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`e."eligibilityStatus" = ${where.eligibilityStatus}`,
    Prisma.sql`e."availabilityStatus" = ${where.availabilityStatus}`,
  ];
  if (typeof where.previewUrl === "string") {
    parts.push(Prisma.sql`e."previewUrl" = ${where.previewUrl}`);
  } else if (where.previewUrl && "not" in where.previewUrl) {
    parts.push(Prisma.sql`e."previewUrl" <> ${where.previewUrl.not}`);
  }
  if (where.canonicalLanguage) parts.push(Prisma.sql`e."canonicalLanguage" = ${where.canonicalLanguage}`);
  if (where.locale) parts.push(Prisma.sql`e.locale = ${where.locale}`);
  if (where.accentEquals) {
    parts.push(Prisma.sql`e."accentId" = ''`);
    parts.push(Prisma.sql`lower(btrim(e.accent)) = ${where.accentEquals}`);
  } else if (where.accentId) {
    parts.push(Prisma.sql`e."accentId" = ${where.accentId}`);
  }
  if (where.gender) parts.push(Prisma.sql`e.gender = ${where.gender}`);
  if (where.age) parts.push(Prisma.sql`e.age = ${where.age}`);
  if (where.category) parts.push(Prisma.sql`e.category = ${where.category}`);
  if (where.useCase) parts.push(Prisma.sql`e."useCase" = ${where.useCase}`);
  if (where.descriptive) parts.push(Prisma.sql`e.descriptive = ${where.descriptive}`);
  if (where.providerVoiceId) {
    parts.push(where.providerVoiceId.in.length
      ? Prisma.sql`e."providerVoiceId" IN (${Prisma.join(where.providerVoiceId.in)})`
      : Prisma.sql`FALSE`);
  }
  if (where.textQuery) {
    const pattern = likePattern(where.textQuery);
    parts.push(Prisma.sql`(e.name ILIKE ${pattern} ESCAPE '\\' OR e.description ILIKE ${pattern} ESCAPE '\\' OR e.accent ILIKE ${pattern} ESCAPE '\\')`);
  }
  return Prisma.join(parts, " AND ");
}

function relatedChildren(conceptId: string): string[] {
  return voiceConcepts().filter((concept) => concept.relatedParents.includes(conceptId)).map((concept) => concept.id);
}

function conceptExists(conceptId: string, mode: VoiceMatchMode): Prisma.Sql {
  const concept = voiceConceptById(conceptId);
  const archetype = concept?.category === "CHARACTER_ARCHETYPE";
  if (mode === "strict") {
    return archetype
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "StudioVoiceCharacteristic" c
          WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
            AND c.concept = ${conceptId} AND c."matchType" = 'CHARACTER_ROLE'
        )`
      : Prisma.sql`EXISTS (
          SELECT 1 FROM "StudioVoiceCharacteristic" c
          WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
            AND c.concept = ${conceptId} AND c."matchType" IN ('EXPLICIT_DESCRIPTION', 'STRUCTURED')
        )`;
  }
  const children = relatedChildren(conceptId);
  const childClause = children.length
    ? Prisma.sql`OR EXISTS (
        SELECT 1 FROM "StudioVoiceCharacteristic" c
        WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
          AND c.concept IN (${Prisma.join(children)})
          AND c."matchType" IN ('EXPLICIT_DESCRIPTION', 'STRUCTURED')
      )`
    : Prisma.empty;
  return Prisma.sql`(
    EXISTS (
      SELECT 1 FROM "StudioVoiceCharacteristic" c
      WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
        AND c.concept = ${conceptId}
    )
    ${childClause}
  )`;
}

function conceptWeight(conceptId: string): Prisma.Sql {
  const children = relatedChildren(conceptId);
  const childScore = children.length
    ? Prisma.sql`CASE WHEN EXISTS (
        SELECT 1 FROM "StudioVoiceCharacteristic" c
        WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
          AND c.concept IN (${Prisma.join(children)})
          AND c."matchType" IN ('EXPLICIT_DESCRIPTION', 'STRUCTURED')
      ) THEN 2 ELSE 0 END`
    : Prisma.sql`0`;
  return Prisma.sql`GREATEST(
    COALESCE((
      SELECT MAX(CASE c."matchType"
        WHEN 'EXPLICIT_DESCRIPTION' THEN 3
        WHEN 'STRUCTURED' THEN 3
        WHEN 'RELATED_DESCRIPTION' THEN 2
        ELSE 1 END)
      FROM "StudioVoiceCharacteristic" c
      WHERE c.provider = e.provider AND c."providerVoiceId" = e."providerVoiceId"
        AND c.concept = ${conceptId}
    ), 0),
    ${childScore}
  )`;
}

const VOICE_COLUMNS = Prisma.sql`
  e."providerVoiceId", e.name, e."canonicalLanguage", e.accent, e.gender, e.age, e.category, e.description, e."previewUrl"
`;

export function characteristicMatchSql(where: VoiceCatalogWhere, concepts: string[], mode: VoiceMatchMode): Prisma.Sql {
  const filters = [catalogFilterSql(where), ...concepts.map((concept) => conceptExists(concept, mode))];
  return Prisma.join(filters, " AND ");
}

export function characteristicPageSql(
  where: VoiceCatalogWhere,
  concepts: string[],
  mode: VoiceMatchMode,
  skip: number,
  take: number
): Prisma.Sql {
  const match = characteristicMatchSql(where, concepts, mode);
  if (mode === "related") {
    const score = Prisma.join(concepts.map((concept) => conceptWeight(concept)), " + ");
    return Prisma.sql`
      SELECT ${VOICE_COLUMNS}, (${score}) AS score
      FROM "StudioVoiceCatalogEntry" e
      WHERE ${match}
      ORDER BY score DESC, e.name ASC, e."providerVoiceId" ASC
      LIMIT ${take} OFFSET ${skip}
    `;
  }
  return Prisma.sql`
    SELECT ${VOICE_COLUMNS}
    FROM "StudioVoiceCatalogEntry" e
    WHERE ${match}
    ORDER BY e.name ASC, e."providerVoiceId" ASC
    LIMIT ${take} OFFSET ${skip}
  `;
}

export function characteristicCountSql(where: VoiceCatalogWhere, concepts: string[], mode: VoiceMatchMode): Prisma.Sql {
  return Prisma.sql`
    SELECT count(*)::int AS total
    FROM "StudioVoiceCatalogEntry" e
    WHERE ${characteristicMatchSql(where, concepts, mode)}
  `;
}

export function conceptFacetSql(where: VoiceCatalogWhere): Prisma.Sql {
  return Prisma.sql`
    SELECT c.concept,
      count(DISTINCT e."providerVoiceId") FILTER (
        WHERE c."matchType" IN ('EXPLICIT_DESCRIPTION', 'STRUCTURED', 'CHARACTER_ROLE')
      )::int AS exact,
      count(DISTINCT e."providerVoiceId")::int AS related
    FROM "StudioVoiceCharacteristic" c
    INNER JOIN "StudioVoiceCatalogEntry" e
      ON e.provider = c.provider AND e."providerVoiceId" = c."providerVoiceId"
    WHERE ${catalogFilterSql(where)}
    GROUP BY c.concept
  `;
}

export type CharacteristicVoiceRow = VoiceCatalogSearchRow & { score?: number };
