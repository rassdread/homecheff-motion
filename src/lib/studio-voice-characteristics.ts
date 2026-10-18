/**
 * Curated voice characteristics from the V9.3A description inventory.
 * Extraction is deterministic. A keyword is not treated as a verified trait
 * when the sentence only names a role, a genre use, or a negated quality.
 */

export const VOICE_CONCEPT_GROUPS = [
  { id: "sfeer", label: "Sfeer" },
  { id: "genre", label: "Genre" },
  { id: "klankkleur", label: "Klankkleur" },
  { id: "energie", label: "Energie" },
  { id: "emotie", label: "Emotie" },
  { id: "spreekstijl", label: "Spreekstijl" },
  { id: "personagetype", label: "Personagetype" },
] as const;

export type VoiceConceptGroupId = (typeof VOICE_CONCEPT_GROUPS)[number]["id"];

export type VoiceConceptCategory =
  | "VOICE_TEXTURE"
  | "PITCH_AND_DEPTH"
  | "ENERGY"
  | "EMOTIONAL_TONE"
  | "ATMOSPHERE"
  | "GENRE"
  | "PERSONALITY"
  | "CHARACTER_ARCHETYPE"
  | "SPEAKING_STYLE"
  | "INTENDED_USE";

export type VoiceCharacteristicMatchType =
  | "STRUCTURED"
  | "EXPLICIT_DESCRIPTION"
  | "RELATED_DESCRIPTION"
  | "GENRE_ASSOCIATION"
  | "CHARACTER_ROLE";

export type VoiceMatchMode = "strict" | "related";

export type VoiceConceptDefinition = {
  id: string;
  category: VoiceConceptCategory;
  group: VoiceConceptGroupId;
  nl: string;
  search: string[];
  patterns: string[];
  /** Other concepts for which an explicit match of this one is only a close relation. */
  relatedParents: string[];
};

export type ExtractedVoiceCharacteristic = {
  concept: string;
  category: VoiceConceptCategory;
  matchType: VoiceCharacteristicMatchType;
  source: "description" | "descriptive";
};

const CONCEPTS: VoiceConceptDefinition[] = [
  { id: "warm", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Warm", search: ["warm", "warmte"], patterns: ["warm", "warmth"], relatedParents: [] },
  { id: "smooth", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Glad", search: ["smooth", "glad", "vloeiend"], patterns: ["smooth"], relatedParents: [] },
  { id: "soft", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Zacht", search: ["soft", "zacht"], patterns: ["soft"], relatedParents: [] },
  { id: "gentle", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Zachtaardig", search: ["gentle", "zachtaardig"], patterns: ["gentle"], relatedParents: [] },
  { id: "raspy", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Raspig", search: ["raspy", "raspig"], patterns: ["raspy"], relatedParents: [] },
  { id: "husky", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Hees", search: ["husky", "hees"], patterns: ["husky"], relatedParents: [] },
  { id: "breathy", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Ademend", search: ["breathy", "ademend"], patterns: ["breathy"], relatedParents: [] },
  { id: "gravelly", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Schor", search: ["gravelly", "schor"], patterns: ["gravelly"], relatedParents: [] },
  { id: "velvety", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Fluwelig", search: ["velvety", "fluwelig"], patterns: ["velvety"], relatedParents: [] },
  { id: "crisp", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Helder", search: ["crisp", "helder"], patterns: ["crisp"], relatedParents: [] },
  { id: "hoarse", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Schor en hees", search: ["hoarse", "hees"], patterns: ["hoarse"], relatedParents: [] },
  { id: "airy", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Luchtig", search: ["airy", "luchtig"], patterns: ["airy"], relatedParents: [] },
  { id: "rough", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Ruw", search: ["rough", "ruw"], patterns: ["rough"], relatedParents: [] },
  { id: "sultry", category: "VOICE_TEXTURE", group: "klankkleur", nl: "Zwoel", search: ["sultry", "zwoel"], patterns: ["sultry"], relatedParents: [] },
  { id: "deep", category: "PITCH_AND_DEPTH", group: "klankkleur", nl: "Diep", search: ["deep", "diep"], patterns: ["deep"], relatedParents: [] },
  { id: "baritone", category: "PITCH_AND_DEPTH", group: "klankkleur", nl: "Bariton", search: ["baritone", "bariton"], patterns: ["baritone"], relatedParents: [] },
  { id: "bass", category: "PITCH_AND_DEPTH", group: "klankkleur", nl: "Bas", search: ["bass", "bas"], patterns: ["bass"], relatedParents: [] },
  { id: "bright", category: "PITCH_AND_DEPTH", group: "klankkleur", nl: "Helder van toon", search: ["bright", "helder"], patterns: ["bright"], relatedParents: [] },
  { id: "energetic", category: "ENERGY", group: "energie", nl: "Energiek", search: ["energetic", "energiek"], patterns: ["energetic"], relatedParents: [] },
  { id: "lively", category: "ENERGY", group: "energie", nl: "Levendig", search: ["lively", "levendig"], patterns: ["lively"], relatedParents: [] },
  { id: "intense", category: "ENERGY", group: "energie", nl: "Intens", search: ["intense", "intens"], patterns: ["intense"], relatedParents: [] },
  { id: "powerful", category: "ENERGY", group: "energie", nl: "Krachtig", search: ["powerful", "krachtig"], patterns: ["powerful"], relatedParents: [] },
  { id: "relaxed", category: "ENERGY", group: "energie", nl: "Ontspannen", search: ["relaxed", "ontspannen"], patterns: ["relaxed"], relatedParents: [] },
  { id: "enthusiastic", category: "ENERGY", group: "energie", nl: "Enthousiast", search: ["enthusiastic", "enthousiast"], patterns: ["enthusiastic"], relatedParents: [] },
  { id: "melancholic", category: "EMOTIONAL_TONE", group: "emotie", nl: "Melancholisch", search: ["melancholic", "melancholy", "melancholisch"], patterns: ["melancholic", "melancholy"], relatedParents: [] },
  { id: "cheerful", category: "EMOTIONAL_TONE", group: "emotie", nl: "Vrolijk", search: ["cheerful", "vrolijk"], patterns: ["cheerful"], relatedParents: [] },
  { id: "hopeful", category: "EMOTIONAL_TONE", group: "emotie", nl: "Hoopvol", search: ["hopeful", "hoopvol"], patterns: ["hopeful"], relatedParents: [] },
  { id: "anxious", category: "EMOTIONAL_TONE", group: "emotie", nl: "Ongerust", search: ["anxious", "ongerust"], patterns: ["anxious"], relatedParents: [] },
  { id: "heartfelt", category: "EMOTIONAL_TONE", group: "emotie", nl: "Oprecht", search: ["heartfelt", "oprecht"], patterns: ["heartfelt"], relatedParents: [] },
  { id: "emotional", category: "EMOTIONAL_TONE", group: "emotie", nl: "Emotioneel", search: ["emotional", "emotioneel"], patterns: ["emotional"], relatedParents: [] },
  { id: "sad", category: "EMOTIONAL_TONE", group: "emotie", nl: "Droevig", search: ["sad", "droevig"], patterns: ["sad"], relatedParents: [] },
  { id: "wistful", category: "EMOTIONAL_TONE", group: "emotie", nl: "Weemoedig", search: ["wistful", "weemoedig"], patterns: ["wistful"], relatedParents: [] },
  { id: "friendly", category: "PERSONALITY", group: "emotie", nl: "Vriendelijk", search: ["friendly", "vriendelijk"], patterns: ["friendly"], relatedParents: [] },
  { id: "playful", category: "PERSONALITY", group: "emotie", nl: "Speels", search: ["playful", "speels"], patterns: ["playful"], relatedParents: [] },
  { id: "sarcastic", category: "PERSONALITY", group: "emotie", nl: "Sarcastisch", search: ["sarcastic", "sarcastisch"], patterns: ["sarcastic", "sarcasm"], relatedParents: [] },
  { id: "quirky", category: "PERSONALITY", group: "emotie", nl: "Eigenzinnig", search: ["quirky", "eigenzinnig"], patterns: ["quirky"], relatedParents: [] },
  { id: "charming", category: "PERSONALITY", group: "emotie", nl: "Charmant", search: ["charming", "charmant"], patterns: ["charming"], relatedParents: [] },
  { id: "authoritative", category: "PERSONALITY", group: "emotie", nl: "Gezaghebbend", search: ["authoritative", "gezaghebbend"], patterns: ["authoritative"], relatedParents: [] },
  { id: "intimidating", category: "PERSONALITY", group: "emotie", nl: "Intimiderend", search: ["intimidating", "intimiderend"], patterns: ["intimidating"], relatedParents: [] },
  { id: "serious", category: "PERSONALITY", group: "emotie", nl: "Serieus", search: ["serious", "serieus"], patterns: ["serious"], relatedParents: [] },
  { id: "dark", category: "ATMOSPHERE", group: "sfeer", nl: "Donker", search: ["dark", "donker"], patterns: ["dark"], relatedParents: [] },
  { id: "mysterious", category: "ATMOSPHERE", group: "sfeer", nl: "Mysterieus", search: ["mysterious", "mysterieus"], patterns: ["mysterious"], relatedParents: [] },
  { id: "sinister", category: "ATMOSPHERE", group: "sfeer", nl: "Sinister", search: ["sinister"], patterns: ["sinister"], relatedParents: [] },
  { id: "eerie", category: "ATMOSPHERE", group: "sfeer", nl: "Griezelig", search: ["eerie", "griezelig"], patterns: ["eerie"], relatedParents: ["sinister"] },
  { id: "haunting", category: "ATMOSPHERE", group: "sfeer", nl: "Beklemmend", search: ["haunting", "beklemmend"], patterns: ["haunting"], relatedParents: [] },
  { id: "ominous", category: "ATMOSPHERE", group: "sfeer", nl: "Onheilspellend", search: ["ominous", "onheilspellend"], patterns: ["ominous"], relatedParents: ["sinister"] },
  { id: "creepy", category: "ATMOSPHERE", group: "sfeer", nl: "Eng", search: ["creepy", "eng"], patterns: ["creepy"], relatedParents: ["horror"] },
  { id: "dreamy", category: "ATMOSPHERE", group: "sfeer", nl: "Dromerig", search: ["dreamy", "dromerig"], patterns: ["dreamy"], relatedParents: [] },
  { id: "scary", category: "ATMOSPHERE", group: "sfeer", nl: "Angstaanjagend", search: ["scary", "angstaanjagend"], patterns: ["scary"], relatedParents: ["horror"] },
  { id: "terrifying", category: "ATMOSPHERE", group: "sfeer", nl: "Angstwekkend", search: ["terrifying", "angstwekkend"], patterns: ["terrifying"], relatedParents: ["horror"] },
  { id: "horror", category: "GENRE", group: "genre", nl: "Horror", search: ["horror"], patterns: ["horror", "horrific"], relatedParents: [] },
  { id: "gothic", category: "GENRE", group: "genre", nl: "Gothic", search: ["gothic"], patterns: ["gothic"], relatedParents: [] },
  { id: "dark_fantasy", category: "GENRE", group: "genre", nl: "Dark fantasy", search: ["dark fantasy", "darkfantasy"], patterns: ["dark fantasy"], relatedParents: [] },
  { id: "thriller", category: "GENRE", group: "genre", nl: "Thriller", search: ["thriller"], patterns: ["thriller"], relatedParents: [] },
  { id: "fantasy", category: "GENRE", group: "genre", nl: "Fantasy", search: ["fantasy"], patterns: ["fantasy"], relatedParents: [] },
  { id: "romance", category: "GENRE", group: "genre", nl: "Romantiek", search: ["romance", "romantiek"], patterns: ["romance"], relatedParents: [] },
  { id: "comedy", category: "GENRE", group: "genre", nl: "Komedie", search: ["comedy", "comedic", "komedie"], patterns: ["comedy", "comedic"], relatedParents: [] },
  { id: "cinematic", category: "GENRE", group: "genre", nl: "Filmisch", search: ["cinematic", "filmisch"], patterns: ["cinematic"], relatedParents: [] },
  { id: "fairytale", category: "GENRE", group: "genre", nl: "Sprookje", search: ["fairytale", "fairy tale", "sprookje"], patterns: ["fairytale", "fairy tale", "fairy-tale"], relatedParents: [] },
  { id: "science_fiction", category: "GENRE", group: "genre", nl: "Sciencefiction", search: ["science fiction", "sci-fi", "sciencefiction"], patterns: ["science fiction", "sci-fi", "scifi"], relatedParents: [] },
  { id: "documentary", category: "INTENDED_USE", group: "genre", nl: "Documentaire", search: ["documentary", "documentaire"], patterns: ["documentary"], relatedParents: [] },
  { id: "whispering", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Fluisterend", search: ["whispering", "whisper", "fluisterend"], patterns: ["whisper", "whispers", "whispered", "whispering", "whispery"], relatedParents: [] },
  { id: "dramatic", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Dramatisch", search: ["dramatic", "dramatisch"], patterns: ["dramatic"], relatedParents: [] },
  { id: "theatrical", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Theatraal", search: ["theatrical", "theatraal"], patterns: ["theatrical"], relatedParents: [] },
  { id: "monotone", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Monotoon", search: ["monotone", "monotoon"], patterns: ["monotone"], relatedParents: [] },
  { id: "announcer", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Omroeper", search: ["announcer", "omroeper"], patterns: ["announcer"], relatedParents: [] },
  { id: "storytelling", category: "SPEAKING_STYLE", group: "spreekstijl", nl: "Verhalend", search: ["storytelling", "verhalend"], patterns: ["storytelling", "storyteller"], relatedParents: [] },
  { id: "villain", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Schurk", search: ["villain", "schurk"], patterns: ["villain", "villains"], relatedParents: [] },
  { id: "vampire", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Vampier", search: ["vampire", "vampier"], patterns: ["vampire", "vampires"], relatedParents: [] },
  { id: "witch", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Heks", search: ["witch", "heks"], patterns: ["witch", "witches"], relatedParents: [] },
  { id: "robot", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Robot", search: ["robot", "android"], patterns: ["robot", "robots", "android"], relatedParents: [] },
  { id: "monster", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Monster", search: ["monster"], patterns: ["monster", "monsters"], relatedParents: [] },
  { id: "ghost", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Geest", search: ["ghost", "geest"], patterns: ["ghost", "ghosts"], relatedParents: [] },
  { id: "alien", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Buitenaards", search: ["alien", "buitenaards"], patterns: ["alien", "aliens"], relatedParents: [] },
  { id: "detective", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Detective", search: ["detective"], patterns: ["detective"], relatedParents: [] },
  { id: "wizard", category: "CHARACTER_ARCHETYPE", group: "personagetype", nl: "Tovenaar", search: ["wizard", "tovenaar"], patterns: ["wizard", "wizards"], relatedParents: [] },
];

const CONCEPT_BY_ID = new Map(CONCEPTS.map((concept) => [concept.id, concept]));

const USE_CASE_LABELS: Record<string, string> = {
  narrative_story: "Verhalen",
  conversational: "Gesprekken",
  informative_educational: "Educatief",
  social_media: "Sociale media",
  characters_animation: "Personages en animatie",
  advertisement: "Reclame",
  entertainment_tv: "Entertainment en televisie",
};

const DESCRIPTIVE_LABELS: Record<string, string> = {
  calm: "Rustig",
  confident: "Zelfverzekerd",
  casual: "Informeel",
  professional: "Professioneel",
  deep: "Diep",
  pleasant: "Aangenaam",
  classy: "Stijlvol",
  upbeat: "Opgewekt",
  excited: "Enthousiast",
  chill: "Luchtig",
  gentle: "Zachtaardig",
  cute: "Schattig",
  modulated: "Gemoduleerd",
  neutral: "Neutraal",
  crisp: "Helder",
  formal: "Formeel",
  relaxed: "Ontspannen",
  intense: "Intens",
  serious: "Serieus",
  mature: "Volwassen",
  soft: "Zacht",
  meditative: "Meditatief",
  wise: "Wijs",
  raspy: "Raspig",
  hyped: "Uitgelaten",
  sassy: "Pittig",
  whispery: "Fluisterend",
  husky: "Hees",
  anxious: "Ongerust",
  rough: "Ruw",
  sad: "Droevig",
  robotic: "Robotisch",
  grumpy: "Grommerig",
  childish: "Kinderlijk",
};

const STRUCTURED_CONCEPT: Record<string, string> = {
  whispery: "whispering",
};

const NEGATED = /(?:\bnot suitable for|\bis not\b|\bisn't\b|\bnot an?\b|\bunlike (?:typical|other|most)\b|\bnever\b)[^.]{0,40}$/i;
const WITHOUT_SOUNDING = /\bwithout sounding(?:\s+\w+){0,4}\s*$/i;
const SUITABILITY = /(?:\bperfect|\bideal|\bgreat|\bsuitable|\bdesigned|\bbuilt|\bmeant|\bused)\s+for(?:\s+[a-z'-]+){0,6}\s*$/i;

export function voiceConcepts(): VoiceConceptDefinition[] {
  return CONCEPTS;
}

export function voiceConceptById(id: string): VoiceConceptDefinition | null {
  return CONCEPT_BY_ID.get(id) ?? null;
}

export function voiceUseCaseLabel(value: string): string {
  return USE_CASE_LABELS[value] ?? value;
}

export function voiceDescriptiveLabel(value: string): string {
  return DESCRIPTIVE_LABELS[value] ?? value;
}

export function knownVoiceUseCases(): string[] {
  return Object.keys(USE_CASE_LABELS);
}

export function knownVoiceDescriptives(): string[] {
  return Object.keys(DESCRIPTIVE_LABELS);
}

export function normalizeVoiceConceptIds(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values ?? []) {
    const id = value.trim().toLowerCase();
    if (!id || seen.has(id) || !CONCEPT_BY_ID.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 8) break;
  }
  return ids;
}

export function searchVoiceConcepts(query: string): VoiceConceptDefinition[] {
  const text = query.trim().toLowerCase();
  if (text.length < 2) return [];
  return CONCEPTS.filter((concept) => {
    if (concept.nl.toLowerCase().includes(text) || concept.id.includes(text.replace(/\s+/g, "_"))) return true;
    return concept.search.some((term) => term.includes(text));
  }).slice(0, 12);
}

export function rawAccentFilterValue(accent: string): string {
  const value = accent.trim().toLowerCase();
  if (!value.startsWith("raw:")) return "";
  const raw = value.slice(4).trim();
  if (!/^[a-z0-9][a-z0-9 .'-]{0,40}$/.test(raw)) return "";
  return raw;
}

export function rawAccentLabel(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function patternSource(patterns: string[]): string {
  const body = patterns
    .map((pattern) => pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+"))
    .join("|");
  return `\\b(?:${body})\\b`;
}

function isNegated(before: string): boolean {
  return NEGATED.test(before) || WITHOUT_SOUNDING.test(before);
}

function matchTypeFor(concept: VoiceConceptDefinition, before: string): VoiceCharacteristicMatchType {
  if (concept.category === "CHARACTER_ARCHETYPE") return "CHARACTER_ROLE";
  if (SUITABILITY.test(before)) {
    if (concept.category === "GENRE" || concept.category === "ATMOSPHERE") return "GENRE_ASSOCIATION";
    return "RELATED_DESCRIPTION";
  }
  return "EXPLICIT_DESCRIPTION";
}

function addTag(
  tags: Map<string, Set<VoiceCharacteristicMatchType>>,
  concept: string,
  matchType: VoiceCharacteristicMatchType
) {
  const current = tags.get(concept) ?? new Set<VoiceCharacteristicMatchType>();
  current.add(matchType);
  tags.set(concept, current);
}

export function extractVoiceCharacteristics(input: {
  description?: string;
  descriptive?: string;
}): ExtractedVoiceCharacteristic[] {
  const tags = new Map<string, Set<VoiceCharacteristicMatchType>>();
  const text = input.description ?? "";
  if (text.trim()) {
    for (const concept of CONCEPTS) {
      const expression = new RegExp(patternSource(concept.patterns), "gi");
      for (const match of text.matchAll(expression)) {
        const index = match.index ?? 0;
        const before = text.slice(Math.max(0, index - 48), index);
        if (isNegated(before)) continue;
        const matchType = matchTypeFor(concept, before);
        addTag(tags, concept.id, matchType);
        if (matchType === "EXPLICIT_DESCRIPTION") {
          for (const parent of concept.relatedParents) {
            addTag(tags, parent, "RELATED_DESCRIPTION");
          }
        }
      }
    }
  }
  const descriptive = input.descriptive?.trim().toLowerCase() ?? "";
  if (descriptive) {
    const conceptId = STRUCTURED_CONCEPT[descriptive] ?? (CONCEPT_BY_ID.has(descriptive) ? descriptive : "");
    if (conceptId) addTag(tags, conceptId, "STRUCTURED");
  }
  const extracted: ExtractedVoiceCharacteristic[] = [];
  for (const [concept, matchTypes] of tags) {
    const definition = CONCEPT_BY_ID.get(concept);
    if (!definition) continue;
    for (const matchType of matchTypes) {
      extracted.push({
        concept,
        category: definition.category,
        matchType,
        source: matchType === "STRUCTURED" ? "descriptive" : "description",
      });
    }
  }
  return extracted;
}

export function voiceConceptScore(
  tags: Array<{ concept: string; matchType: string }>,
  conceptId: string,
  mode: VoiceMatchMode
): number {
  const concept = CONCEPT_BY_ID.get(conceptId);
  if (!concept) return 0;
  let best = 0;
  for (const tag of tags) {
    if (tag.concept !== conceptId) continue;
    if (mode === "strict") {
      const accepted = concept.category === "CHARACTER_ARCHETYPE"
        ? tag.matchType === "CHARACTER_ROLE"
        : tag.matchType === "EXPLICIT_DESCRIPTION" || tag.matchType === "STRUCTURED";
      if (accepted) best = 3;
      continue;
    }
    const weight = tag.matchType === "EXPLICIT_DESCRIPTION" || tag.matchType === "STRUCTURED" ? 3
      : tag.matchType === "RELATED_DESCRIPTION" ? 2
      : 1;
    best = Math.max(best, weight);
  }
  if (mode === "related" && best < 2) {
    const child = tags.some((tag) => {
      const definition = CONCEPT_BY_ID.get(tag.concept);
      return definition?.relatedParents.includes(conceptId)
        && (tag.matchType === "EXPLICIT_DESCRIPTION" || tag.matchType === "STRUCTURED");
    });
    if (child) best = Math.max(best, 2);
  }
  return best;
}

export function voiceConceptRank(
  tags: Array<{ concept: string; matchType: string }>,
  conceptIds: string[],
  mode: VoiceMatchMode
): { matched: boolean; score: number } {
  let score = 0;
  for (const conceptId of conceptIds) {
    const part = voiceConceptScore(tags, conceptId, mode);
    if (part <= 0) return { matched: false, score: 0 };
    score += part;
  }
  return { matched: true, score };
}
