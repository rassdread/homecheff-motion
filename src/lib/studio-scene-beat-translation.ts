/**
 * Studio V2 — Scene Beat Translation (consumption layer).
 * Story Architect narrative moments → unique scene copy for Director proposals.
 * No LLM, no new planners — uses existing beatKey context + i18n variants.
 */

import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type {
  StoryArchitecture,
  StoryNarrativeMoment,
  StoryNarrativeMomentId,
} from "@/types/studio-story-architecture";

export const BEAT_TRANSLATION_VARIANT_COUNT = 3;

export type ProposalStoryEntities = {
  subject: string;
  setting: string;
  character: string;
  prop: string;
  distilledGoal: string;
  distilledMessage: string;
};

export type TranslatedStoryBeat = {
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  beatKey: string;
  momentId: StoryNarrativeMomentId;
  variantIndex: number;
  sceneParams: Record<string, string>;
};

export type SceneBeatDedupeWarning = {
  sceneOrder: number;
  messageKey: string;
  alternateVariantIndex: number;
};

const META_PREFIX_RE =
  /^(een\s+)?(filmpje|video|clip|promotie(?:video)?|reclame|short|film|story|verhaal)\s+(waar\s+ik|over|van|met|voor)\s+/iu;

const SETTING_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(markt|market|bazaar)\b/i, label: "markt" },
  { pattern: /\b(keuken|kitchen)\b/i, label: "keuken" },
  { pattern: /\b(tuin|garden)\b/i, label: "tuin" },
  { pattern: /\b(restaurant)\b/i, label: "restaurant" },
  { pattern: /\b(studio|atelier|werkplaats)\b/i, label: "studio" },
  { pattern: /\b(strand|beach|kust)\b/i, label: "strand" },
  { pattern: /\b(stad|city|centrum)\b/i, label: "stad" },
  { pattern: /\b(bos|forest|woods)\b/i, label: "bos" },
  { pattern: /\b(stadion|stadium|arena)\b/i, label: "stadion" },
];

const CHARACTER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(chef|kok)\b/i, label: "chef" },
  { pattern: /\b(mascot|maskotte|personage)\b/i, label: "personage" },
  { pattern: /\b(host|presentator|presentatrice)\b/i, label: "presentator" },
  { pattern: /\b(held|hero|protagonist)\b/i, label: "held" },
];

const PROP_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(product|merk|brand)\b/i, label: "product" },
  { pattern: /\b(gerecht|dish|meal|eten)\b/i, label: "gerecht" },
  { pattern: /\b(tools?|gereedschap)\b/i, label: "gereedschap" },
];

const PLACE_NAME_RE =
  /\b(?:in|at|naar|door|from|to)\s+([A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+)?)/u;

const MOMENT_FOCUS_BUILDERS: Record<
  StoryNarrativeMomentId,
  (entities: ProposalStoryEntities) => string
> = {
  departure: (e) => (e.setting ? `vertrek naar ${e.setting}` : "het begin van het verhaal"),
  discovery: (e) => e.setting || "nieuwe omgeving",
  conflict: (e) => (e.subject ? `spanning rond ${e.subject}` : "opbouw"),
  breakthrough: (e) => e.subject || "het beslissende moment",
  closing: (e) => e.distilledMessage || "de afsluiting",
};

export function distillStorySubject(idea: string): string {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  let distilled = trimmed.replace(META_PREFIX_RE, "").trim();
  if (!distilled) {
    const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
    distilled = firstSentence;
  } else {
    distilled = distilled.split(/[.!?]/)[0]?.trim() ?? distilled;
  }
  if (distilled.length <= 80) {
    return distilled;
  }
  return `${distilled.slice(0, 77).trim()}…`;
}

function detectFromPatterns(
  idea: string,
  patterns: Array<{ pattern: RegExp; label: string }>
): string {
  for (const { pattern, label } of patterns) {
    if (pattern.test(idea)) {
      return label;
    }
  }
  return "";
}

function detectPlaceName(idea: string): string {
  const match = idea.match(PLACE_NAME_RE);
  return match?.[1]?.trim() ?? "";
}

function distillGoal(storyGoal: string, subject: string): string {
  const trimmed = storyGoal.trim();
  if (!trimmed) {
    return subject;
  }
  const withoutShare = trimmed.replace(/^Share\s+/i, "").trim();
  if (withoutShare === subject || /^Share\s+/i.test(trimmed)) {
    return subject || withoutShare;
  }
  return trimmed.slice(0, 100);
}

function distillMessage(message: string, subject: string): string {
  const trimmed = message.trim();
  if (!trimmed || trimmed === subject || META_PREFIX_RE.test(trimmed)) {
    return subject;
  }
  if (/^Share\s+/i.test(trimmed)) {
    return subject || trimmed.replace(/^Share\s+/i, "").trim();
  }
  return trimmed.slice(0, 100);
}

export function extractProposalStoryEntities(params: {
  idea: string;
  productionBrief?: StudioProductionBrief;
  architecture: StoryArchitecture;
  promptTokens: string[];
}): ProposalStoryEntities {
  const subject = distillStorySubject(params.idea);

  const setting =
    params.productionBrief?.world?.name?.trim()
    || params.productionBrief?.recommendedLocations.find((l) => l.name.trim())?.name.trim()
    || detectPlaceName(params.idea)
    || detectFromPatterns(params.idea, SETTING_PATTERNS)
    || params.promptTokens.find((t) => SETTING_PATTERNS.some((p) => p.label === t))
    || "";

  const character =
    params.productionBrief?.mainCharacters.find((c) => c.name.trim())?.name.trim()
    || detectFromPatterns(params.idea, CHARACTER_PATTERNS)
    || "";

  const prop =
    params.productionBrief?.recommendedProps.find((p) => p.name.trim())?.name.trim()
    || detectFromPatterns(params.idea, PROP_PATTERNS)
    || "";

  return {
    subject,
    setting,
    character,
    prop,
    distilledGoal: distillGoal(params.architecture.storyGoal, subject),
    distilledMessage: distillMessage(params.architecture.message, subject),
  };
}

export function beatTranslationTemplateKeys(
  momentId: StoryNarrativeMomentId,
  variantIndex: number
): { titleKey: string; descriptionKey: string; actionKey: string } {
  const variant = ((variantIndex % BEAT_TRANSLATION_VARIANT_COUNT) + BEAT_TRANSLATION_VARIANT_COUNT)
    % BEAT_TRANSLATION_VARIANT_COUNT;
  return {
    titleKey: `studio.storyArchitect.beatTranslation.${momentId}.title.${variant}`,
    descriptionKey: `studio.storyArchitect.beatTranslation.${momentId}.description.${variant}`,
    actionKey: `studio.storyArchitect.beatTranslation.${momentId}.action.${variant}`,
  };
}

export function variantIndexForScene(
  moment: StoryNarrativeMoment,
  sceneIndex: number,
  entities?: ProposalStoryEntities
): number {
  const orderInMoment = moment.sceneOrders.indexOf(sceneIndex);
  let variant =
    orderInMoment >= 0
      ? orderInMoment % BEAT_TRANSLATION_VARIANT_COUNT
      : sceneIndex % BEAT_TRANSLATION_VARIANT_COUNT;

  if (entities) {
    variant = adjustVariantForEntities(moment.id, variant, entities);
  }
  return variant;
}

function adjustVariantForEntities(
  momentId: StoryNarrativeMomentId,
  variantIndex: number,
  entities: ProposalStoryEntities
): number {
  const needsCharacter = variantIndex === 2;
  const needsSetting =
    (momentId === "departure" || momentId === "discovery" || momentId === "closing")
    && variantIndex === 2;

  if (needsCharacter && !entities.character.trim()) {
    return 0;
  }
  if (needsSetting && !entities.setting.trim()) {
    return variantIndex === 2 ? 1 : variantIndex;
  }
  return variantIndex;
}

export function buildMomentSceneParams(
  architecture: StoryArchitecture,
  moment: StoryNarrativeMoment,
  sceneIndex: number,
  sceneCount: number,
  entities: ProposalStoryEntities
): Record<string, string> {
  const focus = MOMENT_FOCUS_BUILDERS[moment.id](entities);
  const theme =
    architecture.theme.startsWith("studio.") ? moment.id : architecture.theme.slice(0, 60);

  return {
    ...moment.beatParams,
    storyGoal: entities.distilledGoal,
    message: entities.distilledMessage,
    topic: entities.subject,
    subject: entities.subject,
    setting: entities.setting || focus,
    character: entities.character,
    prop: entities.prop,
    focus,
    theme,
    moment: moment.id,
    scene: String(sceneIndex + 1),
    scenes: String(sceneCount),
  };
}

export function translateStoryBeatForScene(params: {
  architecture: StoryArchitecture;
  moment: StoryNarrativeMoment;
  sceneIndex: number;
  sceneCount: number;
  entities: ProposalStoryEntities;
  variantIndex?: number;
}): TranslatedStoryBeat {
  const variantIndex =
    params.variantIndex
    ?? variantIndexForScene(params.moment, params.sceneIndex, params.entities);
  const templates = beatTranslationTemplateKeys(params.moment.id, variantIndex);
  const sceneParams = buildMomentSceneParams(
    params.architecture,
    params.moment,
    params.sceneIndex,
    params.sceneCount,
    params.entities
  );

  return {
    ...templates,
    beatKey: params.moment.beatKey,
    momentId: params.moment.id,
    variantIndex,
    sceneParams,
  };
}

export function suggestAssetNameFromEntities(
  type: "character" | "location" | "prop",
  entities: ProposalStoryEntities,
  sceneIndex: number
): string {
  if (type === "character") {
    return (entities.character || entities.subject || "personage").slice(0, 80);
  }
  if (type === "location") {
    return (entities.setting || entities.subject || "locatie").slice(0, 80);
  }
  return (entities.prop || entities.subject || "prop").slice(0, 80);
}

function normalizeCopyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sceneCopySimilarity(a: string, b: string): number {
  const normA = normalizeCopyText(a);
  const normB = normalizeCopyText(b);
  if (!normA || !normB) {
    return 0;
  }
  if (normA === normB) {
    return 1;
  }
  const wordsA = normA.split(" ").filter((w) => w.length >= 3);
  const wordsB = new Set(normB.split(" ").filter((w) => w.length >= 3));
  if (wordsA.length === 0 || wordsB.size === 0) {
    return normA.includes(normB) || normB.includes(normA) ? 0.9 : 0;
  }
  const overlap = wordsA.filter((w) => wordsB.has(w)).length;
  return overlap / Math.max(wordsA.length, wordsB.size);
}

export type SceneCopySnapshot = {
  order: number;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  titleParams: Record<string, string>;
  descriptionParams: Record<string, string>;
  actionParams: Record<string, string>;
  momentId: StoryNarrativeMomentId;
  variantIndex: number;
};

export function resolveSceneCopySnapshot(
  scene: SceneCopySnapshot,
  t: (key: string, params?: Record<string, string>) => string
): { title: string; description: string; action: string } {
  const title =
    scene.titleKey.trim()
      ? t(scene.titleKey, scene.titleParams)
    : scene.titleParams.title ?? scene.titleParams.subject ?? "";
  const description =
    scene.descriptionKey.trim()
      ? t(scene.descriptionKey, scene.descriptionParams)
    : scene.descriptionParams.description ?? scene.descriptionParams.focus ?? "";
  const action =
    scene.actionKey.trim() ? t(scene.actionKey, scene.actionParams) : scene.actionParams.focus ?? "";
  return { title, description, action };
}

export function applySceneBeatDedupe<T extends SceneCopySnapshot>(params: {
  scenes: T[];
  architecture: StoryArchitecture;
  entities: ProposalStoryEntities;
  t: (key: string, p?: Record<string, string>) => string;
  similarityThreshold?: number;
}): { scenes: T[]; warnings: SceneBeatDedupeWarning[] } {
  const threshold = params.similarityThreshold ?? 0.82;
  const warnings: SceneBeatDedupeWarning[] = [];
  const scenes = params.scenes.map((scene) => ({ ...scene }));
  const resolved = scenes.map((scene) => resolveSceneCopySnapshot(scene, params.t));

  for (let i = 0; i < scenes.length; i += 1) {
    for (let j = i + 1; j < scenes.length; j += 1) {
      const current = resolved[i]!;
      const other = resolved[j]!;
      const titleSim = sceneCopySimilarity(current.title, other.title);
      const descSim = sceneCopySimilarity(current.description, other.description);
      const actionSim = sceneCopySimilarity(current.action, other.action);

      if (titleSim < threshold && descSim < threshold && actionSim < threshold) {
        continue;
      }

      const laterIndex = j;
      const scene = scenes[laterIndex]!;
      const moment =
        params.architecture.storyMoments.find((m) => m.id === scene.momentId)
        ?? params.architecture.storyMoments[0];
      if (!moment) {
        continue;
      }

      let alternateApplied = false;
      for (let attempt = 1; attempt < BEAT_TRANSLATION_VARIANT_COUNT; attempt += 1) {
        const nextVariant = (scene.variantIndex + attempt) % BEAT_TRANSLATION_VARIANT_COUNT;
        const translated = translateStoryBeatForScene({
          architecture: params.architecture,
          moment,
          sceneIndex: scene.order,
          sceneCount: scenes.length,
          entities: params.entities,
          variantIndex: nextVariant,
        });
        const candidate = resolveSceneCopySnapshot(
          {
            ...scene,
            titleKey: translated.titleKey,
            descriptionKey: translated.descriptionKey,
            actionKey: translated.actionKey,
            titleParams: translated.sceneParams,
            descriptionParams: translated.sceneParams,
            actionParams: translated.sceneParams,
            variantIndex: nextVariant,
          },
          params.t
        );

        const titleOk = sceneCopySimilarity(candidate.title, current.title) < threshold;
        const descOk = sceneCopySimilarity(candidate.description, current.description) < threshold;
        if (!titleOk && !descOk) {
          continue;
        }

        scenes[laterIndex] = {
          ...scene,
          titleKey: translated.titleKey,
          descriptionKey: translated.descriptionKey,
          actionKey: translated.actionKey,
          titleParams: translated.sceneParams,
          descriptionParams: translated.sceneParams,
          actionParams: translated.sceneParams,
          variantIndex: nextVariant,
        } as T;
        resolved[laterIndex] = candidate;
        warnings.push({
          sceneOrder: scene.order,
          messageKey: "studio.storyArchitect.beatTranslation.warning.duplicate",
          alternateVariantIndex: nextVariant,
        });
        alternateApplied = true;
        break;
      }

      if (!alternateApplied) {
        warnings.push({
          sceneOrder: scene.order,
          messageKey: "studio.storyArchitect.beatTranslation.warning.similar",
          alternateVariantIndex: scene.variantIndex,
        });
      }
    }
  }

  return { scenes, warnings };
}
