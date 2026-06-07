/**
 * Studio V2 — Action To Shot Distribution.
 * Converts action chains into concrete shot beats (planning only, no render).
 */

import {
  buildCharacterCapabilities,
  classifySceneActions,
} from "@/lib/studio-character-capabilities";
import type { CharacterCapabilitiesPlan } from "@/types/studio-character-capabilities";
import { parsePropStructuredKeywords } from "@/lib/studio-prop-identity-structured";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import {
  countDistinctActionCapabilities,
  extractActionSteps,
  matchActionFragmentToCapability,
} from "@/lib/studio-scene-action-extraction";
import type { ActionComplexityLevel } from "@/types/studio-render-strategy";
import type { CharacterCapabilityId } from "@/types/studio-character-capabilities";
import type {
  ActionChainStep,
  ActionChainStepId,
  ActionDistributionBeat,
  ActionDistributionBeatRole,
  ActionDistributionImageRole,
  MissingSupportingAsset,
  SceneActionChain,
  SceneActionShotDistribution,
  SceneDurationAdvice,
  StoryboardActionShotDistribution,
} from "@/types/studio-action-shot-distribution";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

const STEP_LABEL_KEYS: Record<ActionChainStepId, string> = {
  ball_control: "studio.actionSequence.step.ballControl",
  juggle: "studio.actionSequence.step.juggle",
  shoot: "studio.actionSequence.step.shoot",
  celebrate: "studio.actionSequence.step.celebrate",
  run: "studio.actionSequence.step.run",
  opening: "studio.actionSequence.step.opening",
  setup: "studio.actionSequence.step.setup",
  cook: "studio.actionSequence.step.cook",
  stir: "studio.actionSequence.step.stir",
  taste: "studio.actionSequence.step.taste",
  serve: "studio.actionSequence.step.serve",
  pickup: "studio.actionSequence.step.pickup",
  travel: "studio.actionSequence.step.travel",
  handoff: "studio.actionSequence.step.handoff",
  plant: "studio.actionSequence.step.plant",
  water: "studio.actionSequence.step.water",
  harvest: "studio.actionSequence.step.harvest",
  present: "studio.actionSequence.step.present",
  explain: "studio.actionSequence.step.explain",
  greet: "studio.actionSequence.step.greet",
  work: "studio.actionSequence.step.work",
  generic_action: "studio.actionSequence.step.generic",
};

const CAPABILITY_TO_STEP: Partial<Record<CharacterCapabilityId, ActionChainStepId>> = {
  hold: "juggle",
  kick: "ball_control",
  shoot: "shoot",
  celebrate: "celebrate",
  run: "run",
  cook: "cook",
  stir: "stir",
  taste: "taste",
  serve: "serve",
  deliver: "handoff",
  carry: "pickup",
  walk: "travel",
  travel: "travel",
  plant: "plant",
  water: "water",
  harvest: "harvest",
  present: "present",
  explain: "explain",
  greet: "greet",
  work: "work",
};

const SPORTS_PATTERN = /\b(bal|ball|voetbal|football|mascot|sport|veld|field|goal)\b/i;
const KITCHEN_PATTERN = /\b(kook|kitchen|keuken|chef|gerecht|dish|pan|fornuis)\b/i;
const GARDEN_PATTERN = /\b(tuin|garden|plant|oogst|harvest|moestuin)\b/i;
const DELIVERY_PATTERN = /\b(bezorg|deliver|package|pakket|courier|fiets|bicycle)\b/i;

function sceneActionText(scene: Pick<StudioSceneDetail, "action" | "description" | "title">): string {
  return [scene.action, scene.description, scene.title].filter(Boolean).join(" ").trim();
}

function resolveStepId(fragment: string, capabilityId: CharacterCapabilityId | null): ActionChainStepId {
  const lower = fragment.toLowerCase();
  if (/\b(hoog|hooghouden|juggle|balans|balance)\b/i.test(lower)) {
    return "juggle";
  }
  if (/\b(bal|ball)\b/i.test(lower) && /\b(voet|foot|control|controle)\b/i.test(lower)) {
    return "ball_control";
  }
  if (/\b(ophalen|pick\s*up|grab|pakken)\b/i.test(lower)) {
    return "pickup";
  }
  if (/\b(overhandig|handover|bezorg|deliver)\b/i.test(lower)) {
    return "handoff";
  }
  if (capabilityId && CAPABILITY_TO_STEP[capabilityId]) {
    return CAPABILITY_TO_STEP[capabilityId]!;
  }
  return "generic_action";
}

function complexityFromStepCount(count: number): ActionComplexityLevel {
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function detectMissingAssets(params: {
  scene: StudioSceneDetail;
  steps: ActionChainStep[];
  combinedText: string;
}): MissingSupportingAsset[] {
  const missing: MissingSupportingAsset[] = [];
  const { scene, steps, combinedText } = params;

  if (scene.characters.length === 0) {
    missing.push({
      kind: "character",
      reasonKey: "studio.actionSequence.missing.character",
    });
  }

  const needsBall = steps.some((s) => s.id === "ball_control" || s.id === "juggle" || s.id === "shoot");
  if (needsBall) {
    const hasBallProp = scene.props.some((p) => {
      const hay = `${p.name} ${p.appearanceMemory}`.toLowerCase();
      return /\b(bal|ball|voetbal|football|sport)\b/.test(hay);
    });
    if (!hasBallProp) {
      missing.push({
        kind: "prop",
        reasonKey: "studio.actionSequence.missing.ballProp",
      });
    }
  }

  const needsKitchen =
    steps.some((s) => ["cook", "stir", "taste", "serve"].includes(s.id)) ||
    KITCHEN_PATTERN.test(combinedText);
  if (needsKitchen && !scene.locationId && !scene.location) {
    missing.push({
      kind: "location",
      reasonKey: "studio.actionSequence.missing.kitchenLocation",
    });
  }

  for (const prop of scene.props) {
    const func = parsePropStructuredKeywords(prop.appearanceMemory).propFunction;
    if (func === "sports" && needsBall) continue;
    if (func === "cooking" && needsKitchen) continue;
  }

  if (GARDEN_PATTERN.test(combinedText) && !scene.locationId && !scene.location) {
    missing.push({
      kind: "location",
      reasonKey: "studio.actionSequence.missing.gardenLocation",
    });
  }

  if (DELIVERY_PATTERN.test(combinedText) && scene.props.length === 0) {
    missing.push({
      kind: "prop",
      reasonKey: "studio.actionSequence.missing.packageProp",
    });
  }

  return missing.slice(0, 4);
}

function buildOrderedFragments(combinedText: string): string[] {
  const sequential = extractActionSteps(combinedText);
  if (sequential.length >= 2) {
    return sequential;
  }
  const distinctCount = countDistinctActionCapabilities(combinedText);
  if (distinctCount >= 2) {
    const fragments: string[] = [];
    for (const part of combinedText.split(/[,;]+/).map((p) => p.trim()).filter((p) => p.length >= 3)) {
      if (matchActionFragmentToCapability(part)) {
        fragments.push(part);
      }
    }
    if (fragments.length >= 2) {
      return fragments;
    }
  }
  if (combinedText.trim()) {
    return [combinedText.trim()];
  }
  return [];
}

export function buildSceneActionChain(params: {
  scene: StudioSceneDetail;
  characterPlan?: CharacterCapabilitiesPlan | null;
}): SceneActionChain {
  const combinedText = sceneActionText(params.scene);
  const fragments = buildOrderedFragments(combinedText);

  const steps: ActionChainStep[] = fragments.map((fragment) => {
    const capabilityId = matchActionFragmentToCapability(fragment) as CharacterCapabilityId | null;
    const id = resolveStepId(fragment, capabilityId);
    return {
      id,
      capabilityId,
      sourceFragment: fragment,
      labelKey: STEP_LABEL_KEYS[id],
    };
  });

  const isSports = SPORTS_PATTERN.test(combinedText);
  if (isSports && steps.length >= 2 && !steps.some((s) => s.id === "ball_control")) {
    steps.unshift({
      id: "ball_control",
      capabilityId: "hold",
      sourceFragment: combinedText,
      labelKey: STEP_LABEL_KEYS.ball_control,
    });
  }

  const complexity = complexityFromStepCount(steps.length);
  const recommendedShotCount = Math.max(steps.length, complexity === "high" ? steps.length + 1 : steps.length);

  if (params.characterPlan) {
    for (const step of steps) {
      if (!step.capabilityId) continue;
      const classification = classifySceneActions({
        scene: params.scene,
        characterPlan: params.characterPlan,
      });
      const unusual = classification.actions.some((a) => a.classification === "unusual");
      if (unusual && step.capabilityId) {
        /* advice-only — chain still built */
      }
    }
  }

  return {
    sceneId: params.scene.id,
    sceneOrder: params.scene.order,
    actionText: params.scene.action.trim() || combinedText,
    steps,
    complexity,
    recommendedShotCount,
    actionLabelKeys: steps.map((s) => s.labelKey),
    missingSupportingAssets: detectMissingAssets({
      scene: params.scene,
      steps,
      combinedText,
    }),
  };
}

function beatRoleForStep(params: {
  step: ActionChainStep;
  index: number;
  total: number;
  context: "sports" | "kitchen" | "garden" | "delivery" | "generic";
}): ActionDistributionBeatRole {
  const { step, index, total, context } = params;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  if (step.id === "run" && isLast) return "closing";
  if (step.id === "celebrate" && isLast) return "payoff";
  if (step.id === "celebrate") return "payoff";
  if (step.id === "run") return "closing";

  if (isFirst && context === "sports") return "opening";
  if (isFirst && step.id === "ball_control") return "opening";
  if (step.id === "setup" || (index === 1 && context === "sports" && step.id === "juggle")) {
    return index === 0 ? "opening" : "setup";
  }
  if (isFirst && ["present", "greet", "explain"].includes(step.id)) return "opening";
  if (isFirst) return "opening";
  if (isLast && ["serve", "handoff", "harvest", "present"].includes(step.id)) return "payoff";
  if (isLast) return "closing";

  return "action";
}

function imageRoleForBeat(role: ActionDistributionBeatRole, stepId: ActionChainStepId): ActionDistributionImageRole {
  if (role === "opening") return "start_pose";
  if (role === "setup") return "start_pose";
  if (role === "payoff") return "payoff_pose";
  if (role === "closing") return "end_pose";
  if (["cook", "stir", "taste", "juggle", "shoot"].includes(stepId)) return "action_pose";
  return "action_pose";
}

function detectContext(combinedText: string): "sports" | "kitchen" | "garden" | "delivery" | "generic" {
  if (SPORTS_PATTERN.test(combinedText)) return "sports";
  if (KITCHEN_PATTERN.test(combinedText)) return "kitchen";
  if (GARDEN_PATTERN.test(combinedText)) return "garden";
  if (DELIVERY_PATTERN.test(combinedText)) return "delivery";
  return "generic";
}

export function buildDurationAdvice(params: {
  stepCount: number;
  beatCount: number;
  currentSeconds: number;
}): SceneDurationAdvice {
  const { stepCount, beatCount, currentSeconds } = params;
  const effectiveSteps = Math.max(stepCount, beatCount, 1);
  const recommendedMinSeconds = effectiveSteps * 4;
  const recommendedMaxSeconds = effectiveSteps * 6;

  let level: SceneDurationAdvice["level"] = "good";
  let adviceKey = "studio.actionSequence.duration.good";

  if (currentSeconds < recommendedMinSeconds * 0.75) {
    level = "too_short";
    adviceKey = "studio.actionSequence.duration.tooShort";
  } else if (currentSeconds > recommendedMaxSeconds * 1.35) {
    level = "too_long";
    adviceKey = "studio.actionSequence.duration.tooLong";
  }

  return {
    level,
    currentSeconds,
    recommendedMinSeconds,
    recommendedMaxSeconds,
    stepCount: effectiveSteps,
    adviceKey,
    adviceParams: {
      min: String(recommendedMinSeconds),
      max: String(recommendedMaxSeconds),
      current: String(currentSeconds),
      steps: String(effectiveSteps),
    },
  };
}

export function buildActionShotDistribution(params: {
  scene: StudioSceneDetail;
  actionChain: SceneActionChain;
}): SceneActionShotDistribution {
  const { scene, actionChain } = params;
  const combinedText = sceneActionText(scene);
  const context = detectContext(combinedText);
  const hasImage = sceneHasCompletedImage(scene);

  const beats: ActionDistributionBeat[] = actionChain.steps.map((step, index) => {
    const role = beatRoleForStep({
      step,
      index,
      total: actionChain.steps.length,
      context,
    });
    const imageRole = imageRoleForBeat(role, step.id);
    let imageStatus: ActionDistributionBeat["imageStatus"] = "recommended";
    if (hasImage && (role === "opening" || index === 0)) {
      imageStatus = "present";
    } else if (!hasImage) {
      imageStatus = "missing";
    }

    return {
      role,
      order: index + 1,
      stepId: step.id,
      labelKey: step.labelKey,
      actionHint: step.sourceFragment.trim().slice(0, 120) || step.labelKey,
      imageRole,
      imageStatus,
    };
  });

  if (context === "sports" && beats.length >= 3 && beats[0]!.role !== "opening") {
    beats[0]!.role = "opening";
  }

  const durationAdvice = buildDurationAdvice({
    stepCount: actionChain.steps.length,
    beatCount: beats.length,
    currentSeconds: scene.durationSeconds > 0 ? scene.durationSeconds : 5,
  });

  const suggestsMultipleShots =
    actionChain.steps.length >= 2 || actionChain.complexity !== "low";

  return {
    sceneId: scene.id,
    sceneOrder: scene.order,
    sceneTitle: scene.title,
    actionChain,
    beats,
    recommendedShotCount: Math.max(actionChain.recommendedShotCount, beats.length),
    durationAdvice,
    suggestsMultipleShots,
    distributionReasonKey: suggestsMultipleShots
      ? "studio.actionSequence.reason.multipleShots"
      : undefined,
  };
}

export function buildSceneActionShotDistribution(params: {
  scene: StudioSceneDetail;
  characterPlan?: CharacterCapabilitiesPlan | null;
}): SceneActionShotDistribution {
  const actionChain = buildSceneActionChain(params);
  return buildActionShotDistribution({ scene: params.scene, actionChain });
}

export function buildStoryboardActionShotDistribution(params: {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
}): StoryboardActionShotDistribution {
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const characterById = new Map((params.characters ?? []).map((c) => [c.id, c]));
  const planByCharId = new Map<string, CharacterCapabilitiesPlan>();

  for (const scene of scenes) {
    for (const sc of scene.characters) {
      const lib = characterById.get(sc.id);
      if (lib && !planByCharId.has(lib.id)) {
        planByCharId.set(
          lib.id,
          buildCharacterCapabilities({
            character: lib,
            worlds: params.worlds,
            props: params.props,
            scenePropIds: scenes.flatMap((s) => s.props.map((p) => p.id)),
          })
        );
      }
    }
  }

  const distributions = scenes.map((scene) => {
    const primaryChar = scene.characters[0];
    const characterPlan = primaryChar ? planByCharId.get(primaryChar.id) ?? null : null;
    return buildSceneActionShotDistribution({ scene, characterPlan });
  });

  let totalRecommendedMinSeconds = 0;
  let totalRecommendedMaxSeconds = 0;
  let scenesNeedingSplit = 0;

  for (const dist of distributions) {
    totalRecommendedMinSeconds += dist.durationAdvice.recommendedMinSeconds;
    totalRecommendedMaxSeconds += dist.durationAdvice.recommendedMaxSeconds;
    if (dist.suggestsMultipleShots && dist.durationAdvice.level === "too_short") {
      scenesNeedingSplit += 1;
    }
  }

  return {
    scenes: distributions,
    totalRecommendedMinSeconds,
    totalRecommendedMaxSeconds,
    scenesNeedingSplit,
  };
}

export { STEP_LABEL_KEYS };
