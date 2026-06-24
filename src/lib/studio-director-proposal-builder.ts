/**
 * Studio V2 — build in-memory AI Director proposals from user ideas + asset libraries.
 * Uses existing heuristic engines (no LLM, no new providers).
 */

import {
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromLocation,
  extractAssetSemanticRecordFromProp,
  formatDirectorSemanticAssetLabel,
} from "@/lib/studio-asset-semantic-record";
import {
  DEFAULT_AI_DIRECTOR_STYLE_STRENGTH,
  interpretAiDirectorPrompt,
  normalizeAiDirectorStyleStrength,
  type AiDirectorStyleStrength,
} from "@/lib/studio-ai-director-interpreter";
import { buildAiDirectorDirection } from "@/lib/studio-ai-director-direction";
import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { resolveMusicProfileForDirector } from "@/lib/studio-music-profiles";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { resolveSoundProfileForDirector } from "@/lib/studio-sound-profiles";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { buildVoiceIdentityPlan } from "@/lib/studio-voice-identity-director";
import { buildProposalRenderReadiness } from "@/lib/studio-director-proposal-readiness";
import { enrichDirectorProposalWithConsistency } from "@/lib/studio-director-proposal-enrichment";
import { buildDirectorMemorySuggestions, memoryBoostForAsset } from "@/lib/studio-director-proposal-memory";
import {
  isCanonicalCharacterBaseRecord,
  scoreMotionCharacterReferencePreference,
} from "@/lib/studio-asset-character-evolution";
import {
  blocksReplacementAssetSuggestion,
  resolveDirectorIdentityProfileGuidance,
  scoreIdentityProfileDirectorBoost,
} from "@/lib/studio-asset-identity-profile";
import {
  biasShotTypeFromIdentity,
  buildSceneIdentityConsumption,
  buildStoryboardIdentityConsumption,
  mergeDirectorContextLines,
} from "@/lib/studio-identity-consumption";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { toMotionRenderStrategyHandoffPlan } from "@/lib/studio-render-strategy-handoff";
import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryboardActionIntelligence } from "@/lib/studio-character-capabilities";
import {
  buildSceneGenerationPlan,
  enrichIdeaWithGenerationPlan,
} from "@/lib/studio-scene-generation-orchestrator";
import {
  buildStudioAnimationPlan,
  enrichIdeaWithAnimationPlan,
} from "@/lib/studio-animation-planner";
import {
  buildStudioProductionPlan,
  enrichIdeaWithProductionPlan,
} from "@/lib/studio-production-planner";
import { enrichIdeaWithProductionBrief } from "@/lib/studio-production-brief-enrichment";
import {
  buildProductionMemoryContext,
  enrichIdeaWithProductionMemory,
} from "@/lib/studio-production-memory-profile";
import {
  buildCreativeReviewContext,
  enrichIdeaWithCreativeReview,
} from "@/lib/studio-creative-review";
import {
  buildCreationAssistantContext,
  enrichIdeaWithCreationAssistant,
} from "@/lib/studio-creation-assistant";
import {
  buildProductionTimelineContext,
  enrichIdeaWithProductionTimeline,
} from "@/lib/studio-production-timeline";
import {
  buildProductionPatternContext,
  enrichIdeaWithProductionPattern,
} from "@/lib/studio-production-pattern-profile";
import {
  buildStoryArchitecture,
  enrichIdeaWithStoryArchitecture,
  pickStoryMomentForPhase,
} from "@/lib/studio-story-architecture";
import {
  applySceneBeatDedupe,
  extractProposalStoryEntities,
  suggestAssetNameFromEntities,
  translateStoryBeatForScene,
  type ProposalStoryEntities,
} from "@/lib/studio-scene-beat-translation";
import {
  buildStudioSnapshotContext,
  enrichIdeaWithStudioSnapshot,
} from "@/lib/studio-snapshot-context";
import { recordDirectorModificationsIfDrift } from "@/lib/studio-director-apply-audit";
import { loadDirectorDecisionRegistry } from "@/lib/studio-director-decision-storage";
import {
  buildDirectorDecisionMemoryContext,
  enrichIdeaWithDirectorDecisionMemory,
  mergeDecisionPatternsIntoProductionMemory,
} from "@/lib/studio-director-decision-memory";
import {
  buildInsightsHubContext,
  enrichIdeaWithInsightsHub,
} from "@/lib/studio-insights-hub";
import { applyDecisionsToDirectorProposal } from "@/lib/studio-asset-decision-execution";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import { toIdentitySpec, toSearchHaystack } from "@/lib/studio-identity-spec-engine";
import {
  detectRecurringCharacter,
  detectRecurringLocation,
} from "@/lib/studio-recurring-asset-detection";
import { getVoiceProfilePreset, profileIdForNarrationMode, normalizeStudioNarrationMode } from "@/lib/studio-voice-profiles";
import {
  voiceProfileLabelKeyForPlanning,
} from "@/lib/studio-voice-profile-ref";
import { buildDirectorVoiceSuggestions } from "@/lib/studio-voice-location-suggestions";
import { buildFrequentCloneAdvisories } from "@/lib/studio-user-voice-advisories";
import { buildCharacterVoiceOrchestrationContext } from "@/lib/studio-character-voice-orchestration";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { type StoryArcPhase } from "@/lib/studio-story-arc";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  DirectorProposalTextSummary,
  DirectorProposalVoiceSummary,
  ProposedAssetRef,
  ProposedNewAsset,
  ProposedScene,
  ProposedSceneAudio,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";
import type { StudioProductionPlan } from "@/types/studio-production-plan";
import type { ProposalTextResolver } from "@/lib/studio-director-proposal-apply";

const PROPOSAL_PHASES: StoryArcPhase[] = [
  "opening",
  "discovery",
  "build_up",
  "climax",
  "resolution",
];

const DEFAULT_PROPOSAL_SCENE_COUNT = 5;
const MIN_MATCH_SCORE = 2;

const EMOTION_BY_PHASE: Record<StoryArcPhase, string> = {
  opening: "calm",
  discovery: "curious",
  build_up: "engaged",
  transition: "dynamic",
  climax: "excited",
  resolution: "happy",
  outro: "calm",
};

const PHASE_TEMPLATE_SUFFIX: Record<StoryArcPhase, string> = {
  opening: "opening",
  discovery: "discovery",
  build_up: "buildUp",
  transition: "transition",
  climax: "climax",
  resolution: "resolution",
  outro: "outro",
};

const ENTITY_KEYWORDS: Array<{
  type: "character" | "location" | "prop";
  patterns: RegExp[];
  defaultNameKey: string;
  reasonKey: string;
}> = [
  {
    type: "character",
    patterns: [/chef/i, /mascot/i, /host/i, /presentator/i, /personage/i, /character/i],
    defaultNameKey: "studio.directorProposal.suggestedCharacter.chef",
    reasonKey: "studio.directorProposal.reason.characterFromBrief",
  },
  {
    type: "location",
    patterns: [/garden/i, /tuin/i, /kitchen/i, /keuken/i, /restaurant/i, /studio/i, /locatie/i, /location/i],
    defaultNameKey: "studio.directorProposal.suggestedLocation.space",
    reasonKey: "studio.directorProposal.reason.locationFromBrief",
  },
  {
    type: "prop",
    patterns: [/product/i, /dish/i, /gerecht/i, /tool/i, /logo/i, /brand/i, /prop/i],
    defaultNameKey: "studio.directorProposal.suggestedProp.hero",
    reasonKey: "studio.directorProposal.reason.propFromBrief",
  },
];

export function extractProposalTopic(idea: string): string {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  if (firstSentence.length <= 72) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 69).trim()}…`;
}

export function tokenizeForAssetMatch(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = lower
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  const extras: string[] = [];
  if (/home\s*cheff|homecheff/i.test(lower)) {
    extras.push("homecheff", "chef", "garden", "tuin");
  }
  if (/pixar|animatie|animated/i.test(lower)) {
    extras.push("mascot", "character", "chef");
  }
  if (/afrika|africa|affiliate/i.test(lower)) {
    extras.push("travel", "local", "community");
  }
  if (/designer|design/i.test(lower)) {
    extras.push("studio", "product", "brand");
  }
  if (/reclame|commercial|promo|promotie/i.test(lower)) {
    extras.push("product", "brand", "hero");
  }
  return [...new Set([...tokens, ...extras])];
}

export function scoreAssetMatch(
  name: string,
  description: string | null | undefined,
  category: string | null | undefined,
  promptTokens: string[],
  extraFields: string[] = []
): number {
  const haystack = `${name} ${description ?? ""} ${category ?? ""} ${extraFields.join(" ")}`.toLowerCase();
  let score = 0;
  for (const token of promptTokens) {
    if (haystack.includes(token)) {
      score += token.length >= 5 ? 3 : 2;
    }
  }
  return score;
}

function scoreCharacterMatch(character: StudioCharacterListItem, promptTokens: string[]): number {
  const haystack = toSearchHaystack(toIdentitySpec(character));
  const record = extractAssetSemanticRecordFromCharacter(character);
  let score = scoreAssetMatch(
    haystack.name,
    haystack.description,
    haystack.category,
    promptTokens,
    haystack.extraFields
  );
  if (character.isMascot && promptTokens.some((t) => /mascot|chef|character|personage/.test(t))) {
    score += 2;
  }
  if (isCanonicalCharacterBaseRecord(record)) {
    score += scoreMotionCharacterReferencePreference(record);
  }
  score += scoreIdentityProfileDirectorBoost(record.identityProfile);
  return score;
}

function scoreLocationMatch(location: StudioLocationListItem, promptTokens: string[]): number {
  const haystack = toSearchHaystack(toIdentitySpec(location));
  return scoreAssetMatch(
    haystack.name,
    haystack.description,
    haystack.category,
    promptTokens,
    haystack.extraFields
  );
}

function scorePropMatch(prop: StudioPropListItem, promptTokens: string[]): number {
  const haystack = toSearchHaystack(toIdentitySpec(prop));
  return scoreAssetMatch(
    haystack.name,
    haystack.description,
    haystack.category,
    promptTokens,
    haystack.extraFields
  );
}

function pickBestAsset<T extends { id: string; name: string }>(
  items: T[],
  scorer: (item: T) => number
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    const score = scorer(item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= MIN_MATCH_SCORE ? best : null;
}

function toAssetRef(item: { id: string; name: string }, semanticLabel?: string): ProposedAssetRef {
  return { existingId: item.id, name: item.name, semanticLabel };
}

function toProposedAssetRef(
  item: { id: string; name: string },
  record: ReturnType<typeof extractAssetSemanticRecordFromCharacter>,
  semanticLabel: string
): ProposedAssetRef {
  return {
    existingId: item.id,
    name: item.name,
    semanticLabel,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
  };
}

function toCharacterAssetRef(character: StudioCharacterListItem): ProposedAssetRef {
  const record = extractAssetSemanticRecordFromCharacter(character);
  return toProposedAssetRef(
    character,
    record,
    formatDirectorSemanticAssetLabel(character.name, record)
  );
}

function toLocationAssetRef(location: StudioLocationListItem): ProposedAssetRef {
  const record = extractAssetSemanticRecordFromLocation(location);
  return toProposedAssetRef(
    location,
    record,
    formatDirectorSemanticAssetLabel(location.name, record)
  );
}

function toPropAssetRef(prop: StudioPropListItem): ProposedAssetRef {
  const record = extractAssetSemanticRecordFromProp(prop);
  return toProposedAssetRef(prop, record, formatDirectorSemanticAssetLabel(prop.name, record));
}

function collectIdentityProfileDirectorLines(
  libraries: {
    characters: StudioCharacterListItem[];
    locations: StudioLocationListItem[];
    props: StudioPropListItem[];
  }
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const addLine = (line: string) => {
    const key = line.trim();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    lines.push(key);
  };

  for (const character of libraries.characters) {
    const record = extractAssetSemanticRecordFromCharacter(character);
    if (!record.identityProfile) {
      continue;
    }
    addLine(
      `${character.name}: ${resolveDirectorIdentityProfileGuidance(record.identityProfile)}`
    );
  }
  for (const location of libraries.locations) {
    const record = extractAssetSemanticRecordFromLocation(location);
    if (!record.identityProfile) {
      continue;
    }
    addLine(`${location.name}: ${resolveDirectorIdentityProfileGuidance(record.identityProfile)}`);
  }
  for (const prop of libraries.props) {
    const record = extractAssetSemanticRecordFromProp(prop);
    if (!record.identityProfile) {
      continue;
    }
    addLine(`${prop.name}: ${resolveDirectorIdentityProfileGuidance(record.identityProfile)}`);
  }
  return lines.slice(0, 12);
}

function suggestNewAsset(
  type: "character" | "location" | "prop",
  idea: string,
  index: number,
  entities: ProposalStoryEntities
): ProposedNewAsset | null {
  const rule = ENTITY_KEYWORDS.find((r) => r.type === type);
  if (!rule || !rule.patterns.some((p) => p.test(idea))) {
    return null;
  }
  return {
    tempId: `new-${type}-${index}`,
    name: suggestAssetNameFromEntities(type, entities, index),
    reasonKey: rule.reasonKey,
  };
}

function sceneTemplateKeys(phase: StoryArcPhase) {
  const suffix = PHASE_TEMPLATE_SUFFIX[phase];
  return {
    titleKey: `studio.directorProposal.scene.${suffix}.title`,
    descriptionKey: `studio.directorProposal.scene.${suffix}.description`,
    actionKey: `studio.directorProposal.scene.${suffix}.action`,
  };
}

function textBeatsForPhase(
  phase: StoryArcPhase,
  sceneParams: Record<string, string>
): {
  keys: string[];
  params: Record<string, string>[];
  overlayKeys: string[];
  overlayParams: Record<string, string>[];
} {
  const beatParams = {
    topic: sceneParams.subject || sceneParams.focus || sceneParams.topic,
    focus: sceneParams.focus || sceneParams.subject,
    subject: sceneParams.subject,
  };
  const empty = { keys: [] as string[], params: [] as Record<string, string>[], overlayKeys: [] as string[], overlayParams: [] as Record<string, string>[] };
  if (phase === "opening") {
    return {
      keys: ["studio.directorProposal.textBeat.hook"],
      params: [beatParams],
      overlayKeys: ["studio.directorProposal.overlay.opening"],
      overlayParams: [beatParams],
    };
  }
  if (phase === "build_up" || phase === "discovery") {
    return {
      keys: ["studio.directorProposal.textBeat.core"],
      params: [beatParams],
      overlayKeys: ["studio.directorProposal.overlay.scene"],
      overlayParams: [beatParams],
    };
  }
  if (phase === "climax") {
    return {
      keys: ["studio.directorProposal.textBeat.highlight"],
      params: [beatParams],
      overlayKeys: ["studio.directorProposal.overlay.highlight"],
      overlayParams: [beatParams],
    };
  }
  if (phase === "resolution") {
    return {
      keys: ["studio.directorProposal.textBeat.cta"],
      params: [beatParams],
      overlayKeys: ["studio.directorProposal.overlay.cta"],
      overlayParams: [beatParams],
    };
  }
  return empty;
}

const EMPTY_SCENE_AUDIO: ProposedSceneAudio = {
  musicCueType: "",
  musicEnergyTarget: "",
  soundEnvironment: "",
  soundAmbient: "",
};

function resolveWorldRef(params: {
  characterRefs: ProposedAssetRef[];
  locationRef: ProposedAssetRef | null;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  worlds: StudioWorldProfileListItem[];
}): ProposedAssetRef | null {
  for (const ref of params.characterRefs) {
    const character = params.characters.find((c) => c.id === ref.existingId);
    if (character?.worldProfile) {
      return { existingId: character.worldProfile.id, name: character.worldProfile.name };
    }
  }
  if (params.locationRef) {
    const location = params.locations.find((l) => l.id === params.locationRef!.existingId);
    if (location?.worldProfile) {
      return { existingId: location.worldProfile.id, name: location.worldProfile.name };
    }
  }
  const matchedWorld = pickBestAsset(params.worlds, (w) => {
    const haystack = toSearchHaystack(toIdentitySpec(w));
    return scoreAssetMatch(
      haystack.name,
      haystack.description,
      haystack.category,
      [],
      haystack.extraFields
    );
  });
  return matchedWorld ? toAssetRef(matchedWorld) : null;
}

function libraryHasSimilarName(items: Array<{ name: string }>, candidate: string): boolean {
  const norm = candidate.trim().toLowerCase();
  return items.some((item) => item.name.trim().toLowerCase() === norm);
}

function buildSyntheticFlow(count: number, subject: string): StoryFlowSceneInput[] {
  const phases = PROPOSAL_PHASES.slice(0, Math.min(count, PROPOSAL_PHASES.length));
  while (phases.length < count) {
    phases.push("build_up");
  }
  return phases.map((_phase, order) => ({
    sceneId: `proposal-${order}`,
    order,
    title: subject ? `Scene ${order + 1}` : `Scene ${order + 1}`,
    shotType: "",
    cameraMovement: "",
    sceneEnergy: "",
    camera: "",
  }));
}

function existingToFlow(scenes: StudioSceneDetail[]): StoryFlowSceneInput[] {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: scene.sceneEnergy,
      camera: scene.camera,
    }));
}

function dominantValue(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function proposalMockStoryboard(
  base: StudioStoryboardDetail,
  proposalScenes: ProposedScene[],
  idea: string,
  characters: StudioCharacterListItem[],
  props: StudioPropListItem[],
  locations: StudioLocationListItem[]
): StudioStoryboardDetail {
  const interpretation = interpretAiDirectorPrompt(idea);
  const characterById = new Map(characters.map((c) => [c.id, c]));
  const propById = new Map(props.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  return {
    ...base,
    aiDirectorPrompt: idea,
    directorProfile: interpretation.directorProfile,
    promptStyleProfile: interpretation.promptStyleProfile,
    voiceEnabled: true,
    musicEnabled: true,
    soundEnabled: true,
    scenes: proposalScenes.map((scene, index) => ({
      id: scene.existingSceneId ?? scene.tempId,
      storyboardId: base.id,
      order: index,
      title: scene.titleParams.title ?? scene.titleParams.subject ?? `Scene ${index + 1}`,
      description: scene.descriptionParams.description ?? scene.descriptionParams.focus ?? "",
      action: scene.actionParams.focus ?? scene.actionParams.subject ?? "",
      emotion: scene.emotion,
      camera: scene.camera,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: normalizeStudioSceneEnergy(scene.sceneEnergy),
      transitionToNext: "",
      musicCueType: scene.sceneAudio.musicCueType,
      musicEnergyTarget: scene.sceneAudio.musicEnergyTarget,
      musicTransitionType: "",
      musicStartBehavior: "",
      musicEndBehavior: "",
      soundEnvironmentOverride: scene.sceneAudio.soundEnvironment,
      soundCharacterOverride: "",
      soundPropOverride: "",
      soundTransitionOverride: "",
      soundAmbientOverride: scene.sceneAudio.soundAmbient,
      voicePriority: "",
      musicPriority: "",
      soundPriority: "",
      audioFocus: "",
      duckingMode: "",
      voiceAssetOverride: "",
      musicAssetOverride: "",
      ambienceAssetOverride: "",
      sfxAssetOverride: "",
      durationSeconds: scene.durationSeconds,
      locationId: scene.locationRef?.existingId ?? null,
      location: scene.locationRef ? locationById.get(scene.locationRef.existingId) ?? null : null,
      characters: scene.characterRefs
        .map((ref) => characterById.get(ref.existingId))
        .filter((c): c is StudioCharacterListItem => Boolean(c)),
      props: scene.propRefs
        .map((ref) => propById.get(ref.existingId))
        .filter((p): p is StudioPropListItem => Boolean(p)),
      selectedSceneImageId: null,
      sceneImages: [],
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    })),
  };
}

function assignAssetsToScene(params: {
  idea: string;
  promptTokens: string[];
  entities: ProposalStoryEntities;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  sceneIndex: number;
  arcPhase: StoryArcPhase;
  usedCharacterIds: Set<string>;
  usedLocationId: string | null;
  usedPropIds: Set<string>;
  projectMemory?: StudioProjectMemorySnapshot;
}): Pick<
  ProposedScene,
  | "characterRefs"
  | "proposedCharacters"
  | "locationRef"
  | "proposedLocation"
  | "propRefs"
  | "proposedProps"
  | "worldRef"
> {
  const availableCharacters = params.characters.filter((c) => !params.usedCharacterIds.has(c.id));
  const primaryCharacter =
    pickBestAsset(params.characters, (c) =>
      scoreCharacterMatch(c, params.promptTokens) +
      memoryBoostForAsset(params.projectMemory, "characters", c.id)
    ) ??
    pickBestAsset(availableCharacters, (c) =>
      scoreCharacterMatch(c, params.promptTokens) +
      memoryBoostForAsset(params.projectMemory, "characters", c.id)
    );

  const secondaryCharacter =
    params.arcPhase === "climax" || params.arcPhase === "build_up"
      ? pickBestAsset(
          availableCharacters.filter((c) => c.id !== primaryCharacter?.id),
          (c) =>
            scoreCharacterMatch(c, params.promptTokens) +
            memoryBoostForAsset(params.projectMemory, "characters", c.id)
        )
      : null;

  const location =
    pickBestAsset(params.locations, (l) =>
      scoreLocationMatch(l, params.promptTokens) +
      memoryBoostForAsset(params.projectMemory, "locations", l.id)
    ) ??
    (params.usedLocationId ?
      params.locations.find((l) => l.id === params.usedLocationId) ?? null
    : null);

  const prop =
    pickBestAsset(params.props, (p) => scorePropMatch(p, params.promptTokens)) ??
    pickBestAsset(
      params.props.filter((p) => !params.usedPropIds.has(p.id)),
      (p) => scorePropMatch(p, params.promptTokens)
    );

  const characterRefs: ProposedAssetRef[] = [];
  for (const character of [primaryCharacter, secondaryCharacter]) {
    if (!character) {
      continue;
    }
    if (!characterRefs.some((c) => c.existingId === character.id)) {
      characterRefs.push(toCharacterAssetRef(character));
      params.usedCharacterIds.add(character.id);
    }
  }

  const propRefs: ProposedAssetRef[] = [];
  if (prop && !params.usedPropIds.has(prop.id)) {
    propRefs.push(toPropAssetRef(prop));
    params.usedPropIds.add(prop.id);
  } else if (prop) {
    propRefs.push(toPropAssetRef(prop));
  }

  let locationRef = location ? toLocationAssetRef(location) : null;
  if (!locationRef) {
    const recurringLocation = detectRecurringLocation({
      idea: params.idea,
      locations: params.locations,
      memory: params.projectMemory,
      candidateName: params.entities.setting || params.entities.subject,
    });
    if (recurringLocation) {
      locationRef = toAssetRef({
        id: recurringLocation.assetId,
        name: recurringLocation.assetName,
      });
    }
  }

  const worldRef = resolveWorldRef({
    characterRefs,
    locationRef,
    characters: params.characters,
    locations: params.locations,
    worlds: params.worlds,
  });

  const proposedCharacters: ProposedNewAsset[] = (() => {
    if (characterRefs.some((ref) => blocksReplacementAssetSuggestion(ref.identityProfile))) {
      return [];
    }
    if (characterRefs.length > 0) {
      return [];
    }
    const recurring = detectRecurringCharacter({
      idea: params.idea,
      characters: params.characters,
      memory: params.projectMemory,
      candidateName: params.entities.character || params.entities.subject,
    });
    if (recurring && !characterRefs.some((c) => c.existingId === recurring.assetId)) {
      characterRefs.push(toAssetRef({ id: recurring.assetId, name: recurring.assetName }));
      params.usedCharacterIds.add(recurring.assetId);
      return [];
    }
    if (libraryHasSimilarName(params.characters, params.entities.character || params.entities.subject)) {
      return [];
    }
    const suggested = suggestNewAsset("character", params.idea, params.sceneIndex, params.entities);
    return suggested ? [suggested] : [];
  })();

  const proposedLocation: ProposedNewAsset | null =
    locationRef ? null : suggestNewAsset("location", params.idea, params.sceneIndex, params.entities);
  const proposedProps: ProposedNewAsset[] =
    propRefs.length === 0 ?
      (suggestNewAsset("prop", params.idea, params.sceneIndex, params.entities) ?
          [suggestNewAsset("prop", params.idea, params.sceneIndex, params.entities)!]
        : [])
    : [];

  return {
    characterRefs,
    proposedCharacters,
    locationRef,
    proposedLocation,
    propRefs,
    proposedProps,
    worldRef,
  };
}

function buildProposalVoiceSummary(params: {
  mockStoryboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  storyLanguage: string;
  storyVoiceProfile: string;
  storyVoiceProfileLabelKey: string;
  locationNames: string[];
  projectMemory?: StudioProjectMemorySnapshot;
}): DirectorProposalVoiceSummary {
  const identityPlan = buildVoiceIdentityPlan(params.mockStoryboard);
  const storyCharacters = params.mockStoryboard.scenes.flatMap((s) => s.characters);
  const uniqueById = new Map<string, StudioCharacterListItem>();
  for (const c of [...storyCharacters, ...params.characters]) {
    if (!uniqueById.has(c.id)) {
      uniqueById.set(c.id, c);
    }
  }

  const characterVoices = [...uniqueById.values()]
    .filter((c) => storyCharacters.some((sc) => sc.id === c.id))
    .map((character) => {
      const identity = resolveCharacterVoiceIdentity({
        character,
        language: params.storyLanguage,
        attemptedOverrideProfile: params.storyVoiceProfile,
      });
      const voiceProfileLabelKey = voiceProfileLabelKeyForPlanning(identity.voiceProfile);
      let status: "ready" | "missing" | "inconsistent" = "ready";
      let recommendationKey: string | undefined;
      if (!identity.voiceEnabled) {
        status = "missing";
        recommendationKey = "studio.directorProposal.voice.rec.enableCharacter";
      } else if (identity.voiceLock && params.storyVoiceProfile && identity.voiceProfile !== params.storyVoiceProfile) {
        status = "inconsistent";
        recommendationKey = "studio.directorProposal.voice.rec.respectLock";
      }
      return {
        characterId: character.id,
        characterName: character.name,
        voiceProfile: identity.voiceProfile,
        voiceProfileLabelKey,
        voiceEnabled: identity.voiceEnabled,
        voiceLock: identity.voiceLock,
        status,
        recommendationKey,
      };
    });

  const voiceSuggestions = buildDirectorVoiceSuggestions({
    locationNames: params.locationNames,
  }).map((suggestion) => ({
    locationName: suggestion.matchedLocation,
    accentLabelKey: suggestion.accentLabelKey,
    personaPresetLabelKeys: suggestion.personaPresets.map((preset) => preset.labelKey),
    recommendedVoiceNames: suggestion.recommendedVoices.map((voice) => voice.voiceName),
  }));

  const frequentCloneAdvisories = buildFrequentCloneAdvisories(params.projectMemory);

  return {
    storyVoiceProfile: params.storyVoiceProfile,
    storyVoiceProfileLabelKey: params.storyVoiceProfileLabelKey,
    characterVoices,
    warningKeys: identityPlan.warnings.slice(0, 4).map((w) => w.messageKey),
    voiceSuggestions,
    frequentCloneAdvisories,
  };
}

function buildProposalTextSummary(params: {
  subject: string;
  focus: string;
  scenes: ProposedScene[];
  narrationScriptPreview: string;
}): DirectorProposalTextSummary {
  const beatParams = {
    topic: params.subject,
    focus: params.focus,
    subject: params.subject,
  };
  const sceneOverlays = params.scenes.flatMap((scene) =>
    scene.overlayKeys.map((overlayKey, index) => ({
      sceneOrder: scene.order,
      overlayKey,
      overlayParams: scene.overlayParams[index] ?? beatParams,
    }))
  );

  return {
    openingHookKey: "studio.directorProposal.textBeat.hook",
    openingHookParams: beatParams,
    coreMessageKey: "studio.directorProposal.textBeat.core",
    coreMessageParams: beatParams,
    ctaKey: "studio.directorProposal.textBeat.cta",
    ctaParams: beatParams,
    sceneOverlays,
    narrationScriptPreview: params.narrationScriptPreview,
  };
}

export function buildDirectorProposal(params: {
  idea: string;
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  styleStrength?: AiDirectorStyleStrength;
  projectMemory?: StudioProjectMemorySnapshot;
  productionPlan?: StudioProductionPlan;
  animationPlan?: import("@/types/studio-animation-plan").StudioAnimationPlan;
  productionBrief?: StudioProductionBrief;
  assetDecisionRegistry?: StudioAssetDecisionRegistry;
  /** Production orchestrator — scene count must match approved plan. */
  targetSceneCount?: number;
  t?: ProposalTextResolver;
}): StudioDirectorProposal | null {
  const idea = params.idea.trim();
  if (!idea) {
    return null;
  }

  const enrichedFromBrief =
    params.productionBrief ? enrichIdeaWithProductionBrief(idea, params.productionBrief) : idea;

  const decisionRegistry = loadDirectorDecisionRegistry(params.storyboard.id);
  if (params.storyboard.scenes?.length) {
    recordDirectorModificationsIfDrift({
      storyboardId: params.storyboard.id,
      storyboard: params.storyboard,
    });
  }
  const refreshedDecisionRegistry = loadDirectorDecisionRegistry(params.storyboard.id);

  const productionMemoryContext = buildProductionMemoryContext({
    memory: params.projectMemory ?? emptyProjectMemorySnapshot(),
    currentIdea: idea,
    libraries: {
      characters: params.characters,
      worlds: params.worlds ?? [],
    },
  });

  const enrichedFromMemory = enrichIdeaWithProductionMemory(
    enrichedFromBrief,
    productionMemoryContext
  );

  const creativeReviewContext = buildCreativeReviewContext({
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    currentIdea: idea,
  });

  const enrichedFromReview = enrichIdeaWithCreativeReview(
    enrichedFromMemory,
    creativeReviewContext
  );

  const creationAssistantContext = buildCreationAssistantContext({
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    currentIdea: idea,
    assetDecisionRegistry: params.assetDecisionRegistry,
  });

  const enrichedFromAssistant = enrichIdeaWithCreationAssistant(
    enrichedFromReview,
    creationAssistantContext
  );

  const timelineContext = buildProductionTimelineContext({
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    assetDecisionRegistry: params.assetDecisionRegistry,
    productionBrief: params.productionBrief,
    directorApplyAudits: refreshedDecisionRegistry.audits,
    directorApplyBaseline: refreshedDecisionRegistry.applyBaseline,
  });

  const enrichedFromTimeline = enrichIdeaWithProductionTimeline(
    enrichedFromAssistant,
    timelineContext
  );

  const productionPatternContext = buildProductionPatternContext({
    projectMemory: params.projectMemory,
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    assetDecisionRegistry: params.assetDecisionRegistry,
    currentIdea: idea,
  });

  const enrichedFromPatterns = enrichIdeaWithProductionPattern(
    enrichedFromTimeline,
    productionPatternContext
  );

  const snapshotContext = buildStudioSnapshotContext({
    storyboardId: params.storyboard.id,
    storyboardUpdatedAt: params.storyboard.updatedAt,
  });

  const enrichedFromSnapshot = enrichIdeaWithStudioSnapshot(
    enrichedFromPatterns,
    snapshotContext
  );

  const storyArchitecture = buildStoryArchitecture({
    userIdea: idea,
    productionBrief: params.productionBrief,
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    assetDecisionRegistry: params.assetDecisionRegistry,
    directorProfile: params.storyboard.directorProfile,
    styleProfile: params.storyboard.promptStyleProfile,
    plannedSceneCount:
      params.targetSceneCount ??
      ((params.storyboard.scenes?.length ?? 0) > 0 ?
        params.storyboard.scenes!.length
      : DEFAULT_PROPOSAL_SCENE_COUNT),
  });

  const storyArchitectureContext = {
    architecture: storyArchitecture,
    contextLines: storyArchitecture.directorContextLines,
    recommendationKeys: storyArchitecture.recommendationKeys,
  };

  const enrichedFromStoryArchitecture = enrichIdeaWithStoryArchitecture(
    enrichedFromSnapshot,
    storyArchitectureContext
  );

  const decisionMemoryContext = buildDirectorDecisionMemoryContext({
    storyboardId: params.storyboard.id,
    storyboard: params.storyboard,
    audits: refreshedDecisionRegistry.audits,
    applyBaseline: refreshedDecisionRegistry.applyBaseline,
  });

  const enrichedFromDecisionMemory = enrichIdeaWithDirectorDecisionMemory(
    enrichedFromStoryArchitecture,
    decisionMemoryContext
  );

  const insightSummaryContext = buildInsightsHubContext({
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    assetDecisionRegistry: params.assetDecisionRegistry,
    currentIdea: idea,
    productionTimeline: timelineContext.timeline,
  });

  const enrichedFromInsightsHub = enrichIdeaWithInsightsHub(
    enrichedFromDecisionMemory,
    insightSummaryContext
  );

  const mergedProductionMemoryContext = {
    ...productionMemoryContext,
    profile: mergeDecisionPatternsIntoProductionMemory(
      productionMemoryContext.profile,
      decisionMemoryContext.memory
    ),
  };

  const productionPlan =
    params.productionPlan ??
    buildStudioProductionPlan({
      storyboard: params.storyboard,
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds ?? [],
      projectMemory: params.projectMemory,
      productionBrief: params.productionBrief,
      assetDecisionRegistry: params.assetDecisionRegistry,
    });

  const enrichedIdea = enrichIdeaWithAnimationPlan(
    enrichIdeaWithProductionPlan(enrichedFromInsightsHub, productionPlan),
    params.animationPlan ??
      buildStudioAnimationPlan({
        storyboard: params.storyboard,
        productionPlan,
        characters: params.characters,
        locations: params.locations,
        props: params.props,
        worlds: params.worlds ?? [],
        projectMemory: params.projectMemory,
      })
  );

  const styleStrength = normalizeAiDirectorStyleStrength(
    params.styleStrength ?? params.storyboard.aiDirectorStyleStrength ?? DEFAULT_AI_DIRECTOR_STYLE_STRENGTH
  );
  const interpretation = interpretAiDirectorPrompt(enrichedIdea);
  const storyEntities = extractProposalStoryEntities({
    idea,
    productionBrief: params.productionBrief,
    architecture: storyArchitecture,
    promptTokens: tokenizeForAssetMatch(idea),
  });
  const topic = storyEntities.subject || extractProposalTopic(idea);
  const topicParams = { topic, subject: storyEntities.subject, focus: storyEntities.setting || storyEntities.subject };
  const promptTokens = tokenizeForAssetMatch(idea);

  const existingScenes = [...(params.storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const targetCount =
    existingScenes.length > 0
      ? existingScenes.length
      : Math.max(1, params.targetSceneCount ?? DEFAULT_PROPOSAL_SCENE_COUNT);
  const flowInput =
    existingScenes.length > 0 ? existingToFlow(existingScenes) : buildSyntheticFlow(targetCount, storyEntities.subject);

  const direction = buildAiDirectorDirection({
    scenes: flowInput,
    prompt: enrichedIdea,
    styleStrength,
  });

  const planBySceneId = new Map(direction.plan.map((row) => [row.sceneId, row]));
  const usedCharacterIds = new Set<string>();
  let usedLocationId: string | null = null;
  const usedPropIds = new Set<string>();

  let scenes: ProposedScene[] = flowInput.map((flowScene, index) => {
    const planRow = planBySceneId.get(flowScene.sceneId)!;
    const existing = existingScenes[index];
    const phase = planRow.arcPhase;
    const moment = pickStoryMomentForPhase(storyArchitecture, phase);
    const translated = translateStoryBeatForScene({
      architecture: storyArchitecture,
      moment,
      sceneIndex: index,
      sceneCount: flowInput.length,
      entities: storyEntities,
    });
    const sceneParams = translated.sceneParams;
    const textBeats = textBeatsForPhase(phase, sceneParams);
    const assets = assignAssetsToScene({
      idea,
      promptTokens,
      entities: storyEntities,
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds ?? [],
      sceneIndex: index,
      arcPhase: phase,
      usedCharacterIds,
      usedLocationId,
      usedPropIds,
      projectMemory: params.projectMemory,
    });
    usedLocationId = assets.locationRef?.existingId ?? usedLocationId;

    const keepTitle = Boolean(existing?.title?.trim());
    const keepDescription = Boolean(existing?.description?.trim());

    return {
      tempId: flowScene.sceneId,
      existingSceneId: existing?.id,
      order: index,
      arcPhase: phase,
      titleKey: keepTitle ? "" : translated.titleKey,
      titleParams: keepTitle ? { title: existing!.title.trim() } : sceneParams,
      descriptionKey: keepDescription ? "" : translated.descriptionKey,
      descriptionParams:
        keepDescription ? { description: existing!.description.trim() } : sceneParams,
      actionKey: translated.actionKey,
      actionParams: sceneParams,
      beatMomentId: moment.id,
      beatVariantIndex: translated.variantIndex,
      emotion: existing?.emotion?.trim() || EMOTION_BY_PHASE[phase] || "neutral",
      shotType: planRow.shotType,
      cameraMovement: planRow.cameraMovement,
      sceneEnergy: planRow.sceneEnergy,
      camera: planRow.legacyCamera,
      ...assets,
      sceneAudio: { ...EMPTY_SCENE_AUDIO },
      textBeatKeys: textBeats.keys,
      textBeatParams: textBeats.params,
      overlayKeys: textBeats.overlayKeys,
      overlayParams: textBeats.overlayParams,
      durationSeconds: existing?.durationSeconds ?? 6,
    };
  });

  const beatDedupeT = (key: string, p?: Record<string, string>) =>
    params.t
      ? params.t(key as Parameters<NonNullable<typeof params.t>>[0], p)
    : `${key}${p?.subject ? `: ${p.subject}` : p?.focus ? `: ${p.focus}` : ""}`;

  const dedupeResult = applySceneBeatDedupe({
    scenes: scenes.map((scene) => ({
      ...scene,
      momentId: scene.beatMomentId ?? "departure",
      variantIndex: scene.beatVariantIndex ?? 0,
    })),
    architecture: storyArchitecture,
    entities: storyEntities,
    t: beatDedupeT,
  });
  scenes = dedupeResult.scenes.map((scene) => {
    const { momentId, variantIndex, ...rest } = scene;
    return {
      ...rest,
      beatMomentId: momentId,
      beatVariantIndex: variantIndex,
    };
  });
  const beatTranslationWarnings = dedupeResult.warnings;

  const mockStoryboard = proposalMockStoryboard(
    params.storyboard,
    scenes,
    idea,
    params.characters,
    params.props,
    params.locations
  );

  if (params.t) {
    for (let i = 0; i < scenes.length; i++) {
      const mockScene = mockStoryboard.scenes[i];
      const proposalScene = scenes[i];
      if (!mockScene || !proposalScene) {
        continue;
      }
      try {
        const action = params.t(
          proposalScene.actionKey as Parameters<NonNullable<typeof params.t>>[0],
          proposalScene.actionParams
        );
        if (action) {
          mockScene.action = action;
        }
      } catch {
        /* keep proposalMockStoryboard fallback action */
      }
      try {
        const title = params.t(
          proposalScene.titleKey as Parameters<NonNullable<typeof params.t>>[0],
          proposalScene.titleParams
        );
        if (title) {
          mockScene.title = title;
        }
      } catch {
        /* keep fallback title */
      }
      try {
        const description = params.t(
          proposalScene.descriptionKey as Parameters<NonNullable<typeof params.t>>[0],
          proposalScene.descriptionParams
        );
        if (description) {
          mockScene.description = description;
        }
      } catch {
        /* keep fallback description */
      }
    }
  }

  const identityLibraries = {
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
  };

  for (const mockScene of mockStoryboard.scenes) {
    const sceneConsumption = buildSceneIdentityConsumption({
      scene: mockScene,
      libraries: identityLibraries,
    });
    const proposalScene = scenes.find(
      (s) => (s.existingSceneId ?? s.tempId) === mockScene.id
    );
    if (proposalScene?.shotType && sceneConsumption.shotHint) {
      proposalScene.shotType = biasShotTypeFromIdentity(
        proposalScene.shotType as StudioShotType,
        sceneConsumption.shotHint
      );
    }
  }

  const identityConsumption = buildStoryboardIdentityConsumption({
    storyboard: mockStoryboard,
    libraries: identityLibraries,
    memory: params.projectMemory,
  });
  const profileDirectorLines = collectIdentityProfileDirectorLines(identityLibraries);
  identityConsumption.directorContextLines = mergeDirectorContextLines(
    identityConsumption.directorContextLines,
    profileDirectorLines
  );
  const narrationMode = normalizeStudioNarrationMode(params.storyboard.narrationMode || "narrator");
  const voiceReport = analyzeVoiceDirector({
    ...mockStoryboard,
    voiceEnabled: true,
    narrationMode,
    voiceProfile:
      params.storyboard.voiceProfile?.trim() || profileIdForNarrationMode(narrationMode),
  });
  const musicPlan = buildMusicDirectorPlan(mockStoryboard);
  const soundPlan = buildSoundDirectorPlan(mockStoryboard);
  const musicProfile = resolveMusicProfileForDirector(interpretation.directorProfile);
  const soundProfile = resolveSoundProfileForDirector(interpretation.directorProfile);

  const musicCueBySceneId = new Map(musicPlan.sceneCues.map((cue) => [cue.sceneId, cue]));
  const soundCueBySceneId = new Map(soundPlan.sceneCues.map((cue) => [cue.sceneId, cue]));

  for (const scene of scenes) {
    const sceneId = scene.existingSceneId ?? scene.tempId;
    const musicCue = musicCueBySceneId.get(sceneId);
    const soundCue = soundCueBySceneId.get(sceneId);
    scene.sceneAudio = {
      musicCueType: musicCue?.cueType ?? "",
      musicEnergyTarget: musicCue?.energyTarget ?? "",
      soundEnvironment: soundCue?.environmentSounds?.join(", ") ?? "",
      soundAmbient: soundCue?.ambientRecommendation?.join(", ") ?? "",
    };
  }

  const storyLanguage = (params.storyboard.voiceLanguage ?? "nl").slice(0, 2);
  const locationNames = [
    ...new Set(
      scenes
        .map((scene) => scene.locationRef?.name ?? scene.proposedLocation?.name ?? "")
        .filter(Boolean)
    ),
  ];
  const voices = buildProposalVoiceSummary({
    mockStoryboard,
    characters: params.characters,
    storyLanguage,
    storyVoiceProfile: voiceReport.voiceProfile,
    storyVoiceProfileLabelKey: voiceReport.presetLabelKey,
    locationNames,
    projectMemory: params.projectMemory,
  });
  const text = buildProposalTextSummary({
    subject: storyEntities.subject,
    focus: storyEntities.setting || storyEntities.subject,
    scenes,
    narrationScriptPreview: voiceReport.script.fullNarration.slice(0, 1200),
  });

  const recommendationKeys = [
    ...musicPlan.recommendations.slice(0, 2),
    ...soundPlan.recommendations.slice(0, 2),
  ];

  const proposal: StudioDirectorProposal = {
    version: 2,
    ideaPrompt: idea,
    interpretation,
    styleStrength,
    directorQualityScore: direction.directorQualityScore,
    storyArc: {
      beginningKey: "studio.directorProposal.storyArc.beginning",
      middleKey: "studio.directorProposal.storyArc.middle",
      endKey: "studio.directorProposal.storyArc.end",
      topicParams,
    },
    scenes,
    beatTranslationWarnings,
    camera: {
      dominantShotType: dominantValue(scenes.map((s) => s.shotType)) || "medium",
      dominantMovement: dominantValue(scenes.map((s) => s.cameraMovement)) || "static",
      framingKey: interpretation.cameraLanguageKey,
    },
    emotion: {
      moodKeywords: interpretation.moodKeywords,
      energyProfileKey: interpretation.energyProfileKey,
      toneKey: interpretation.pacingKey,
    },
    audio: {
      voiceProfile: voiceReport.voiceProfile,
      voiceProfileLabelKey: voiceReport.presetLabelKey,
      narrationMode: voiceReport.narrationMode,
      voiceEnabled: true,
      musicProfile: musicPlan.profileId,
      musicProfileLabelKey: musicProfile.labelKey,
      musicIntensity: musicPlan.intensity,
      musicEnabled: true,
      soundProfile: soundPlan.profileId,
      soundProfileLabelKey: soundProfile.labelKey,
      soundDensity: soundPlan.density,
      soundEnabled: true,
      recommendationKeys,
    },
    text,
    voices,
    renderReadiness: { level: "needs_work", score: 0, checks: [], recommendationKeys: [] },
  };

  if (params.t) {
    proposal.renderReadiness = buildProposalRenderReadiness({
      proposal,
      baseStoryboard: params.storyboard,
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds ?? [],
      t: params.t,
    });
  } else {
    proposal.renderReadiness = buildProposalRenderReadiness({
      proposal,
      baseStoryboard: params.storyboard,
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds ?? [],
      t: (key, p) => `${key}${p?.topic ? `: ${p.topic}` : ""}`,
    });
  }

  const enriched = enrichDirectorProposalWithConsistency({
    proposal,
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    t: params.t ?? ((key, p) => `${key}${p?.topic ? `: ${p.topic}` : ""}`),
  });

  const memorySuggestions = buildDirectorMemorySuggestions({
    idea,
    proposal: enriched,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    memory: params.projectMemory,
  });

  const actionIntelligenceRaw = buildStoryboardActionIntelligence({
    storyboard: mockStoryboard,
    characters: params.characters,
    props: params.props,
    worlds: params.worlds ?? [],
  });

  const actionShotDistributionRaw = buildStoryboardActionShotDistribution({
    storyboard: mockStoryboard,
    characters: params.characters,
    props: params.props,
    worlds: params.worlds ?? [],
  });

  const renderStrategyPlanBuilt = buildStudioRenderStrategyPlan({
    storyboard: mockStoryboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
  });

  const animationPlan = buildStudioAnimationPlan({
    storyboard: mockStoryboard,
    productionPlan,
    renderStrategyPlan: renderStrategyPlanBuilt,
    actionShotDistributions: actionShotDistributionRaw,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
  });

  const generationPlan = buildSceneGenerationPlan({
    storyboard: mockStoryboard,
    productionPlan,
    animationPlan,
    renderStrategyPlan: renderStrategyPlanBuilt,
    actionShotDistributions: actionShotDistributionRaw,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    projectMemory: params.projectMemory,
    assetDecisionRegistry: params.assetDecisionRegistry,
  });

  const characterVoiceContext = buildCharacterVoiceOrchestrationContext({
    storyboard: mockStoryboard,
    characters: params.characters,
    language: storyLanguage,
    storyArchitecture,
    projectMemory: params.projectMemory,
  });

  const builtProposal: StudioDirectorProposal = {
    ...enriched,
    memorySuggestions,
    productionMemoryContext: mergedProductionMemoryContext,
    creativeReviewContext,
    creationAssistantContext,
    productionPatternContext,
    snapshotContext,
    storyArchitectureContext,
    decisionMemoryContext,
    insightSummaryContext,
    characterVoiceContext,
    productionPlan,
    animationPlan,
    animationPlanPreview: animationPlan.scenes.map((scene) => ({
      sceneOrder: scene.sceneOrder,
      sceneTitle: scene.sceneTitle,
      targetDuration: scene.targetDuration,
      shots: scene.shots.map((shot) => ({
        shotRole: shot.shotRole,
        startTime: shot.startTime,
        endTime: shot.endTime,
        motionIntentKey: shot.motionIntentKey,
        missingImage: shot.missingImage,
        actionBeat: shot.actionBeat,
      })),
    })),
    generationPlan,
    generationPlanPreview: [...generationPlan.requiredImages, ...generationPlan.recommendedImages]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .slice(0, 12)
      .map((item) => ({
        sceneOrder: item.sceneOrder,
        actionBeat: item.actionBeat,
        roleLabelKey: item.roleLabelKey,
        priority: item.priority,
        status: item.status,
        orderIndex: item.orderIndex,
      })),
    actionIntelligence: {
      characterPlans: actionIntelligenceRaw.characterPlans.map((plan) => ({
        characterId: plan.characterId,
        characterName: plan.characterName,
        expected: plan.expected,
        supported: plan.supported,
        possible: plan.possible,
      })),
      sceneSuggestions: actionIntelligenceRaw.sceneClassifications
        .filter(
          (c) =>
            c.dominantClassification === "unusual" || c.dominantClassification === "possible"
        )
        .map((c) => {
          const unusualAction = c.actions.find((a) => a.suggestionKey);
          return {
            sceneOrder: c.sceneOrder,
            classification: c.dominantClassification,
            suggestionKey: unusualAction?.suggestionKey,
            suggestionParams: unusualAction?.suggestionParams,
          };
        }),
    },
    actionShotDistribution: actionShotDistributionRaw.scenes
      .filter((d) => d.suggestsMultipleShots)
      .map((d) => ({
        sceneOrder: d.sceneOrder,
        sceneTitle: d.sceneTitle,
        recommendedShotCount: d.recommendedShotCount,
        suggestsMultipleShots: d.suggestsMultipleShots,
        distributionReasonKey: d.distributionReasonKey,
        durationAdviceKey: d.durationAdvice.adviceKey,
        durationAdviceParams: d.durationAdvice.adviceParams,
        beats: d.beats.map((b) => ({
          order: b.order,
          labelKey: b.labelKey,
          actionHint: b.actionHint,
          role: b.role,
          imageRole: b.imageRole,
          imageStatus: b.imageStatus,
        })),
        missingAssetKeys: d.actionChain.missingSupportingAssets.map((a) => a.reasonKey),
      })),
    identityConsumption: {
      directorContextLines: identityConsumption.directorContextLines,
      rationales: identityConsumption.rationales.map((r) => ({
        id: r.id,
        reasonKey: r.reasonKey,
        reasonParams: r.reasonParams,
        sourceKind: r.sourceKind,
        sourceName: r.sourceName,
      })),
      completenessWarnings: identityConsumption.completenessChecks
        .filter((c) => !c.passed)
        .map((c) => ({
          id: c.id,
          messageKey: c.messageKey,
          assetName: c.assetName,
          kind: c.kind,
        })),
    },
    renderStrategyPlan: toMotionRenderStrategyHandoffPlan(renderStrategyPlanBuilt),
  };

  if (params.assetDecisionRegistry) {
    return applyDecisionsToDirectorProposal(builtProposal, params.assetDecisionRegistry);
  }

  return builtProposal;
}

/** Exported for tests — ensures synthetic flow gets a shot plan when storyboard is empty. */
export function buildProposalShotPlanForEmptyStory(count: number, idea: string) {
  const topic = extractProposalTopic(idea);
  const flow = buildSyntheticFlow(count, topic);
  const interpretation = interpretAiDirectorPrompt(idea);
  return buildAutoShotPlan(flow, interpretation.directorProfile);
}
