/**
 * Studio V2 — build in-memory AI Director proposals from user ideas + asset libraries.
 * Uses existing heuristic engines (no LLM, no new providers).
 */

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
import { profileIdForNarrationMode, normalizeStudioNarrationMode } from "@/lib/studio-voice-profiles";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { type StoryArcPhase } from "@/lib/studio-story-arc";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type {
  ProposedAssetRef,
  ProposedNewAsset,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

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
  promptTokens: string[]
): number {
  const haystack = `${name} ${description ?? ""} ${category ?? ""}`.toLowerCase();
  let score = 0;
  for (const token of promptTokens) {
    if (haystack.includes(token)) {
      score += token.length >= 5 ? 3 : 2;
    }
  }
  return score;
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

function toAssetRef(item: { id: string; name: string }): ProposedAssetRef {
  return { existingId: item.id, name: item.name };
}

function suggestNewAsset(
  type: "character" | "location" | "prop",
  idea: string,
  index: number
): ProposedNewAsset | null {
  const rule = ENTITY_KEYWORDS.find((r) => r.type === type);
  if (!rule || !rule.patterns.some((p) => p.test(idea))) {
    return null;
  }
  const topic = extractProposalTopic(idea);
  return {
    tempId: `new-${type}-${index}`,
    name: topic.slice(0, 80) || type,
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

function textBeatsForPhase(phase: StoryArcPhase, topic: string): { keys: string[]; params: Record<string, string>[] } {
  if (phase === "opening") {
    return {
      keys: ["studio.directorProposal.textBeat.hook"],
      params: [{ topic }],
    };
  }
  if (phase === "climax") {
    return {
      keys: ["studio.directorProposal.textBeat.highlight"],
      params: [{ topic }],
    };
  }
  if (phase === "resolution") {
    return {
      keys: ["studio.directorProposal.textBeat.cta"],
      params: [{ topic }],
    };
  }
  return { keys: [], params: [] };
}

function buildSyntheticFlow(count: number, topic: string): StoryFlowSceneInput[] {
  const phases = PROPOSAL_PHASES.slice(0, Math.min(count, PROPOSAL_PHASES.length));
  while (phases.length < count) {
    phases.push("build_up");
  }
  return phases.map((_phase, order) => ({
    sceneId: `proposal-${order}`,
    order,
    title: `${topic} ${order + 1}`,
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
  idea: string
): StudioStoryboardDetail {
  const interpretation = interpretAiDirectorPrompt(idea);
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
      title: scene.titleParams.topic ?? `Scene ${index + 1}`,
      description: "",
      action: "",
      emotion: scene.emotion,
      camera: scene.camera,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: normalizeStudioSceneEnergy(scene.sceneEnergy),
      transitionToNext: "",
      musicCueType: "",
      musicEnergyTarget: "",
      musicTransitionType: "",
      musicStartBehavior: "",
      musicEndBehavior: "",
      soundEnvironmentOverride: "",
      soundCharacterOverride: "",
      soundPropOverride: "",
      soundTransitionOverride: "",
      soundAmbientOverride: "",
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
      location: null,
      characters: [],
      props: [],
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
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  sceneIndex: number;
  usedCharacterIds: Set<string>;
  usedLocationId: string | null;
  usedPropIds: Set<string>;
}): Pick<
  ProposedScene,
  "characterRefs" | "proposedCharacters" | "locationRef" | "proposedLocation" | "propRefs" | "proposedProps"
> {
  const character =
    pickBestAsset(params.characters, (c) =>
      scoreAssetMatch(c.name, c.description, c.role, params.promptTokens)
    ) ??
    pickBestAsset(
      params.characters.filter((c) => !params.usedCharacterIds.has(c.id)),
      (c) => scoreAssetMatch(c.name, c.description, c.role, params.promptTokens)
    );

  const location =
    pickBestAsset(params.locations, (l) =>
      scoreAssetMatch(l.name, l.description, l.category, params.promptTokens)
    ) ??
    (params.usedLocationId ?
      params.locations.find((l) => l.id === params.usedLocationId) ?? null
    : null);

  const prop = pickBestAsset(params.props, (p) =>
    scoreAssetMatch(p.name, p.description, p.category, params.promptTokens)
  );

  const characterRefs: ProposedAssetRef[] = [];
  if (character && !params.usedCharacterIds.has(character.id)) {
    characterRefs.push(toAssetRef(character));
    params.usedCharacterIds.add(character.id);
  } else if (character) {
    characterRefs.push(toAssetRef(character));
  }

  const propRefs: ProposedAssetRef[] = [];
  if (prop && !params.usedPropIds.has(prop.id)) {
    propRefs.push(toAssetRef(prop));
    params.usedPropIds.add(prop.id);
  } else if (prop) {
    propRefs.push(toAssetRef(prop));
  }

  const locationRef = location ? toAssetRef(location) : null;

  const proposedCharacters: ProposedNewAsset[] =
    characterRefs.length === 0 ?
      (suggestNewAsset("character", params.idea, params.sceneIndex) ? [suggestNewAsset("character", params.idea, params.sceneIndex)!] : [])
    : [];
  const proposedLocation: ProposedNewAsset | null =
    locationRef ? null : suggestNewAsset("location", params.idea, params.sceneIndex);
  const proposedProps: ProposedNewAsset[] =
    propRefs.length === 0 ?
      (suggestNewAsset("prop", params.idea, params.sceneIndex) ? [suggestNewAsset("prop", params.idea, params.sceneIndex)!] : [])
    : [];

  return {
    characterRefs,
    proposedCharacters,
    locationRef,
    proposedLocation,
    propRefs,
    proposedProps,
  };
}

export function buildDirectorProposal(params: {
  idea: string;
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  styleStrength?: AiDirectorStyleStrength;
}): StudioDirectorProposal | null {
  const idea = params.idea.trim();
  if (!idea) {
    return null;
  }

  const styleStrength = normalizeAiDirectorStyleStrength(
    params.styleStrength ?? params.storyboard.aiDirectorStyleStrength ?? DEFAULT_AI_DIRECTOR_STYLE_STRENGTH
  );
  const interpretation = interpretAiDirectorPrompt(idea);
  const topic = extractProposalTopic(idea);
  const topicParams = { topic };
  const promptTokens = tokenizeForAssetMatch(idea);

  const existingScenes = [...(params.storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const targetCount =
    existingScenes.length > 0 ? existingScenes.length : DEFAULT_PROPOSAL_SCENE_COUNT;
  const flowInput =
    existingScenes.length > 0 ? existingToFlow(existingScenes) : buildSyntheticFlow(targetCount, topic);

  const direction = buildAiDirectorDirection({
    scenes: flowInput,
    prompt: idea,
    styleStrength,
  });

  const planBySceneId = new Map(direction.plan.map((row) => [row.sceneId, row]));
  const usedCharacterIds = new Set<string>();
  let usedLocationId: string | null = null;
  const usedPropIds = new Set<string>();

  const scenes: ProposedScene[] = flowInput.map((flowScene, index) => {
    const planRow = planBySceneId.get(flowScene.sceneId)!;
    const existing = existingScenes[index];
    const phase = planRow.arcPhase;
    const templates = sceneTemplateKeys(phase);
    const textBeats = textBeatsForPhase(phase, topic);
    const assets = assignAssetsToScene({
      idea,
      promptTokens,
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      sceneIndex: index,
      usedCharacterIds,
      usedLocationId,
      usedPropIds,
    });
    usedLocationId = assets.locationRef?.existingId ?? usedLocationId;

    const keepTitle = Boolean(existing?.title?.trim());
    const keepDescription = Boolean(existing?.description?.trim());

    return {
      tempId: flowScene.sceneId,
      existingSceneId: existing?.id,
      order: index,
      arcPhase: phase,
      titleKey: keepTitle ? "" : templates.titleKey,
      titleParams: keepTitle ? { title: existing!.title.trim() } : topicParams,
      descriptionKey: keepDescription ? "" : templates.descriptionKey,
      descriptionParams:
        keepDescription ? { description: existing!.description.trim() } : topicParams,
      actionKey: templates.actionKey,
      actionParams: topicParams,
      emotion: existing?.emotion?.trim() || EMOTION_BY_PHASE[phase] || "neutral",
      shotType: planRow.shotType,
      cameraMovement: planRow.cameraMovement,
      sceneEnergy: planRow.sceneEnergy,
      camera: planRow.legacyCamera,
      ...assets,
      textBeatKeys: textBeats.keys,
      textBeatParams: textBeats.params,
      durationSeconds: existing?.durationSeconds ?? 6,
    };
  });

  const mockStoryboard = proposalMockStoryboard(params.storyboard, scenes, idea);
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

  const recommendationKeys = [
    ...musicPlan.recommendations.slice(0, 2),
    ...soundPlan.recommendations.slice(0, 2),
  ];

  return {
    version: 1,
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
  };
}

/** Exported for tests — ensures synthetic flow gets a shot plan when storyboard is empty. */
export function buildProposalShotPlanForEmptyStory(count: number, idea: string) {
  const topic = extractProposalTopic(idea);
  const flow = buildSyntheticFlow(count, topic);
  const interpretation = interpretAiDirectorPrompt(idea);
  return buildAutoShotPlan(flow, interpretation.directorProfile);
}
