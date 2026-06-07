/**
 * Studio V2 — Character Capabilities & Action Intelligence.
 * Derives what characters can logically do from existing identity data (no DB).
 */

import { parsePropStructuredKeywords } from "@/lib/studio-prop-identity-structured";
import { parseWorldVisualStructured } from "@/lib/studio-world-identity-structured";
import {
  countDistinctActionCapabilities,
  extractActionSteps,
  isUnusualActionFragment,
  matchActionFragmentToCapability,
} from "@/lib/studio-scene-action-extraction";
import type {
  CharacterCapabilitiesPlan,
  CharacterCapabilityEntry,
  CharacterCapabilityId,
  CharacterCapabilitySourceKind,
  CharacterCapabilityTier,
  ClassifiedSceneAction,
  ProjectActionMemoryTrend,
  SceneActionClassification,
  SceneActionClassificationLevel,
  StoryboardActionIntelligence,
} from "@/types/studio-character-capabilities";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

const CAPABILITY_LABEL_KEYS: Record<CharacterCapabilityId, string> = {
  cook: "studio.characterCapabilities.action.cook",
  taste: "studio.characterCapabilities.action.taste",
  serve: "studio.characterCapabilities.action.serve",
  explain: "studio.characterCapabilities.action.explain",
  greet: "studio.characterCapabilities.action.greet",
  plant: "studio.characterCapabilities.action.plant",
  harvest: "studio.characterCapabilities.action.harvest",
  water: "studio.characterCapabilities.action.water",
  carry: "studio.characterCapabilities.action.carry",
  draw: "studio.characterCapabilities.action.draw",
  create: "studio.characterCapabilities.action.create",
  sew: "studio.characterCapabilities.action.sew",
  present: "studio.characterCapabilities.action.present",
  run: "studio.characterCapabilities.action.run",
  jump: "studio.characterCapabilities.action.jump",
  kick: "studio.characterCapabilities.action.kick",
  celebrate: "studio.characterCapabilities.action.celebrate",
  deliver: "studio.characterCapabilities.action.deliver",
  sell: "studio.characterCapabilities.action.sell",
  shop: "studio.characterCapabilities.action.shop",
  work: "studio.characterCapabilities.action.work",
  talk: "studio.characterCapabilities.action.talk",
  walk: "studio.characterCapabilities.action.walk",
  point: "studio.characterCapabilities.action.point",
  observe: "studio.characterCapabilities.action.observe",
  design: "studio.characterCapabilities.action.design",
  learn: "studio.characterCapabilities.action.learn",
  play: "studio.characterCapabilities.action.play",
  travel: "studio.characterCapabilities.action.travel",
  stir: "studio.characterCapabilities.action.stir",
  hold: "studio.characterCapabilities.action.hold",
  shoot: "studio.characterCapabilities.action.shoot",
  cheer: "studio.characterCapabilities.action.cheer",
  collaborate: "studio.characterCapabilities.action.collaborate",
};

const UNIVERSAL_CAPABILITIES: CharacterCapabilityId[] = [
  "walk",
  "talk",
  "greet",
  "observe",
  "present",
];

const OUTFIT_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  chef: ["cook", "taste", "serve", "explain", "stir", "greet"],
  garden: ["plant", "harvest", "water", "carry"],
  designer: ["draw", "create", "sew", "present", "design"],
  delivery: ["deliver", "walk", "carry"],
  entrepreneur: ["present", "explain", "work", "sell"],
  casual: ["walk", "talk", "greet", "observe"],
  sporty: ["run", "jump", "kick", "celebrate", "hold"],
  presenter: ["present", "explain", "greet", "talk", "point"],
};

const ACCESSORY_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  spoon: ["cook", "stir", "taste"],
  basket: ["carry", "harvest"],
  needle: ["sew", "create"],
  phone: ["talk", "work"],
  package: ["deliver", "carry"],
  bicycle: ["travel", "deliver", "walk"],
  ball: ["kick", "hold", "play"],
  camera: ["present", "observe"],
  notebook: ["learn", "explain", "design"],
};

const WORLD_TYPE_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  food_universe: ["cook", "taste", "serve"],
  garden_universe: ["plant", "harvest", "water", "carry"],
  design_universe: ["draw", "create", "design", "present"],
  sports_universe: ["run", "jump", "kick", "celebrate", "hold", "shoot"],
  community_universe: ["greet", "talk", "collaborate", "work"],
  education_universe: ["explain", "learn", "present"],
  local_market_universe: ["shop", "sell", "carry"],
  lifestyle_universe: ["walk", "present", "talk"],
  horror: ["observe", "walk"],
  fantasy: ["run", "celebrate", "play"],
  cartoon_universe: ["play", "celebrate", "jump"],
};

const PROP_FUNCTION_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  cooking: ["cook", "stir", "taste", "serve"],
  delivery: ["deliver", "carry"],
  sports: ["kick", "run", "jump", "celebrate", "hold", "shoot"],
  presenting: ["present", "explain"],
  designing: ["draw", "create", "design"],
  harvest: ["harvest", "carry", "plant"],
  learning: ["learn", "explain"],
  entertainment: ["play", "celebrate"],
  selling: ["sell", "present"],
  travel: ["travel", "walk"],
};

const PERSONALITY_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  warm: ["greet", "talk"],
  energetic: ["run", "celebrate", "jump"],
  funny: ["play", "celebrate"],
  professional: ["present", "explain", "work"],
  calm: ["observe", "explain"],
  reliable: ["deliver", "work"],
  creative: ["create", "design", "draw"],
  adventurous: ["run", "travel", "jump"],
};

const ROLE_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  mascot: ["greet", "celebrate", "present", "jump"],
  animal: ["run", "jump", "observe", "play"],
  human: ["talk", "walk", "work"],
  object: ["present", "observe"],
};

const TYPE_CAPABILITIES: Record<string, CharacterCapabilityId[]> = {
  brand_character: ["present", "greet", "celebrate"],
  vehicle_character: ["travel", "deliver"],
  robot: ["work", "observe"],
};

function parseHcValue(raw: string, key: string): string {
  for (const part of raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
    if (part.startsWith(`hc:${key}=`)) {
      return part.slice(`hc:${key}=`.length);
    }
  }
  return "";
}

function haystack(character: StudioCharacterListItem): string {
  return [
    character.defaultClothing,
    character.defaultAccessories,
    character.visualKeywords,
    character.personality,
    character.description,
    character.appearanceMemory,
  ]
    .join(" ")
    .toLowerCase();
}

function detectOutfitPreset(character: StudioCharacterListItem): string | null {
  const text = haystack(character);
  for (const outfit of Object.keys(OUTFIT_CAPABILITIES)) {
    if (text.includes(outfit) || text.includes(outfit.replace("_", " "))) {
      return outfit;
    }
  }
  if (/\bchef\b|\bkok\b|\bkeuken\b|\bkitchen\b|\bapron\b|\bschort\b/.test(text)) {
    return "chef";
  }
  if (/\bgarden\b|\btuin\b|\bplant\b|\boogst\b|\bharvest\b/.test(text)) {
    return "garden";
  }
  if (/\bdesign\b|\bontwerp\b|\bfashion\b|\bnaai/.test(text)) {
    return "designer";
  }
  if (/\bdelivery\b|\bbezorg\b|\bcourier\b/.test(text)) {
    return "delivery";
  }
  if (/\bsport\b|\bmascot\b|\bvoetbal\b|\bfootball\b/.test(text)) {
    return "sporty";
  }
  if (/\bpresent\b|\bhost\b|\banchor\b/.test(text)) {
    return "presenter";
  }
  return null;
}

function detectAccessories(character: StudioCharacterListItem): string[] {
  const text = haystack(character);
  return Object.keys(ACCESSORY_CAPABILITIES).filter((acc) => text.includes(acc));
}

function resolveWorldType(
  character: StudioCharacterListItem,
  worlds: StudioWorldProfileListItem[]
): string | null {
  const profile =
    worlds.find((w) => w.id === character.worldProfileId) ??
    (character.worldProfile?.id
      ? worlds.find((w) => w.id === character.worldProfile!.id)
      : undefined);
  if (!profile) {
    return null;
  }
  const visual = parseWorldVisualStructured(profile.visualStyle);
  return visual.worldType || parseHcValue(profile.visualStyle, "world") || null;
}

function addCapabilities(
  map: Map<CharacterCapabilityId, CharacterCapabilityEntry>,
  ids: CharacterCapabilityId[],
  tier: CharacterCapabilityTier,
  kind: CharacterCapabilitySourceKind,
  label: string
) {
  for (const id of ids) {
    const existing = map.get(id);
    if (existing) {
      if (tierRank(tier) < tierRank(existing.tier)) {
        existing.tier = tier;
      }
      if (!existing.sources.some((s) => s.kind === kind && s.label === label)) {
        existing.sources.push({ kind, label });
      }
    } else {
      map.set(id, {
        id,
        labelKey: CAPABILITY_LABEL_KEYS[id],
        tier,
        sources: [{ kind, label }],
      });
    }
  }
}

function tierRank(tier: CharacterCapabilityTier): number {
  if (tier === "expected") return 0;
  if (tier === "supported") return 1;
  return 2;
}

export function buildCharacterCapabilities(params: {
  character: StudioCharacterListItem;
  worlds?: StudioWorldProfileListItem[];
  props?: StudioPropListItem[];
  scenePropIds?: string[];
}): CharacterCapabilitiesPlan {
  const { character } = params;
  const map = new Map<CharacterCapabilityId, CharacterCapabilityEntry>();

  addCapabilities(map, UNIVERSAL_CAPABILITIES, "possible", "role", "universal");

  const outfit = detectOutfitPreset(character);
  if (outfit && OUTFIT_CAPABILITIES[outfit]) {
    addCapabilities(map, OUTFIT_CAPABILITIES[outfit]!, "expected", "outfit", outfit);
  }

  for (const acc of detectAccessories(character)) {
    addCapabilities(map, ACCESSORY_CAPABILITIES[acc]!, "expected", "accessory", acc);
  }

  const charType =
    parseHcValue(character.visualKeywords, "type") ||
    (character.isMascot ? "brand_character" : character.role);
  if (TYPE_CAPABILITIES[charType]) {
    addCapabilities(map, TYPE_CAPABILITIES[charType]!, "supported", "type", charType);
  }
  if (ROLE_CAPABILITIES[character.role]) {
    addCapabilities(map, ROLE_CAPABILITIES[character.role]!, "supported", "role", character.role);
  }

  const personalityTokens = character.personality
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  for (const token of personalityTokens) {
    if (PERSONALITY_CAPABILITIES[token]) {
      addCapabilities(map, PERSONALITY_CAPABILITIES[token]!, "supported", "personality", token);
    }
  }

  const worldType = resolveWorldType(character, params.worlds ?? []);
  if (worldType && WORLD_TYPE_CAPABILITIES[worldType]) {
    addCapabilities(map, WORLD_TYPE_CAPABILITIES[worldType]!, "supported", "world", worldType);
  }

  const propIds = new Set(params.scenePropIds ?? []);
  for (const prop of params.props ?? []) {
    if (propIds.size > 0 && !propIds.has(prop.id)) {
      continue;
    }
    const structured = parsePropStructuredKeywords(prop.appearanceMemory);
    const func = structured.propFunction;
    if (func && PROP_FUNCTION_CAPABILITIES[func]) {
      addCapabilities(map, PROP_FUNCTION_CAPABILITIES[func]!, "supported", "prop", prop.name);
    }
  }

  const entries = [...map.values()].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  const expected = entries.filter((e) => e.tier === "expected").map((e) => e.id);
  const supported = entries
    .filter((e) => e.tier === "expected" || e.tier === "supported")
    .map((e) => e.id);
  const possible = entries.map((e) => e.id);

  return {
    characterId: character.id,
    characterName: character.name,
    expected,
    supported,
    possible,
    entries,
  };
}

function classifySingleAction(
  fragment: string,
  plan: CharacterCapabilitiesPlan,
  characterName: string
): ClassifiedSceneAction {
  if (isUnusualActionFragment(fragment)) {
    return {
      fragment,
      capabilityId: matchActionFragmentToCapability(fragment) as CharacterCapabilityId | null,
      classification: "unusual",
      suggestionKey: "studio.characterCapabilities.suggest.unusual",
      suggestionParams: { character: characterName, action: fragment },
    };
  }

  const capabilityId = matchActionFragmentToCapability(fragment) as CharacterCapabilityId | null;
  if (!capabilityId) {
    return {
      fragment,
      capabilityId: null,
      classification: "unsupported",
    };
  }

  if (plan.expected.includes(capabilityId)) {
    return { fragment, capabilityId, classification: "supported" };
  }
  if (plan.supported.includes(capabilityId)) {
    return { fragment, capabilityId, classification: "supported" };
  }
  if (plan.possible.includes(capabilityId) || UNIVERSAL_CAPABILITIES.includes(capabilityId)) {
    return {
      fragment,
      capabilityId,
      classification: "possible",
      suggestionKey: "studio.characterCapabilities.suggest.possible",
      suggestionParams: { character: characterName, action: fragment },
    };
  }

  return {
    fragment,
    capabilityId,
    classification: "unusual",
    suggestionKey: "studio.characterCapabilities.suggest.unusual",
    suggestionParams: { character: characterName, action: fragment },
  };
}

function dominantLevel(actions: ClassifiedSceneAction[]): SceneActionClassificationLevel {
  const order: SceneActionClassificationLevel[] = [
    "unusual",
    "unsupported",
    "possible",
    "supported",
  ];
  for (const level of order) {
    if (actions.some((a) => a.classification === level)) {
      return level;
    }
  }
  return "unsupported";
}

export function classifySceneActions(params: {
  scene: Pick<StudioSceneDetail, "id" | "order" | "action" | "description" | "title">;
  characterPlan: CharacterCapabilitiesPlan;
}): SceneActionClassification {
  const combined = [params.scene.action, params.scene.description, params.scene.title]
    .filter(Boolean)
    .join(" ");
  const steps = extractActionSteps(combined);
  const fragments = steps.length > 0 ? steps : combined.trim() ? [combined.trim()] : [];

  const actions = fragments.map((fragment) =>
    classifySingleAction(fragment, params.characterPlan, params.characterPlan.characterName)
  );

  return {
    sceneId: params.scene.id,
    sceneOrder: params.scene.order,
    characterId: params.characterPlan.characterId,
    characterName: params.characterPlan.characterName,
    actionText: params.scene.action.trim() || combined.trim(),
    actions,
    dominantClassification: dominantLevel(actions),
  };
}

const SHOT_HINT_BY_CAPABILITY: Partial<
  Record<CharacterCapabilityId, { shotKey: string; movementKey?: string; reasonKey: string }>
> = {
  cook: {
    shotKey: "studio.characterCapabilities.shot.detail",
    reasonKey: "studio.characterCapabilities.shot.reason.cook",
  },
  stir: {
    shotKey: "studio.characterCapabilities.shot.detail",
    reasonKey: "studio.characterCapabilities.shot.reason.cook",
  },
  taste: {
    shotKey: "studio.characterCapabilities.shot.close",
    reasonKey: "studio.characterCapabilities.shot.reason.taste",
  },
  run: {
    shotKey: "studio.characterCapabilities.shot.tracking",
    movementKey: "studio.characterCapabilities.shot.movement.tracking",
    reasonKey: "studio.characterCapabilities.shot.reason.run",
  },
  kick: {
    shotKey: "studio.characterCapabilities.shot.tracking",
    movementKey: "studio.characterCapabilities.shot.movement.tracking",
    reasonKey: "studio.characterCapabilities.shot.reason.sports",
  },
  shoot: {
    shotKey: "studio.characterCapabilities.shot.tracking",
    reasonKey: "studio.characterCapabilities.shot.reason.sports",
  },
  harvest: {
    shotKey: "studio.characterCapabilities.shot.medium",
    reasonKey: "studio.characterCapabilities.shot.reason.harvest",
  },
  plant: {
    shotKey: "studio.characterCapabilities.shot.medium",
    reasonKey: "studio.characterCapabilities.shot.reason.harvest",
  },
  celebrate: {
    shotKey: "studio.characterCapabilities.shot.wide",
    reasonKey: "studio.characterCapabilities.shot.reason.celebrate",
  },
  cheer: {
    shotKey: "studio.characterCapabilities.shot.wide",
    reasonKey: "studio.characterCapabilities.shot.reason.celebrate",
  },
  present: {
    shotKey: "studio.characterCapabilities.shot.medium",
    reasonKey: "studio.characterCapabilities.shot.reason.present",
  },
};

function buildVisualProductionHints(
  classifications: SceneActionClassification[],
  plans: CharacterCapabilitiesPlan[]
): StoryboardActionIntelligence["visualProductionHints"] {
  const hints: StoryboardActionIntelligence["visualProductionHints"] = [];
  for (const plan of plans.slice(0, 2)) {
    if (plan.expected.length > 0) {
      hints.push({
        messageKey: "studio.characterCapabilities.visual.expectedFor",
        messageParams: { character: plan.characterName },
      });
    }
  }
  if (classifications.some((c) => c.dominantClassification === "unusual")) {
    hints.push({ messageKey: "studio.characterCapabilities.visual.unusualActions" });
  }
  if (classifications.some((c) => c.actions.length >= 2)) {
    hints.push({ messageKey: "studio.characterCapabilities.visual.multiAction" });
  }
  return hints.slice(0, 5);
}

export function buildStoryboardActionIntelligence(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
}): StoryboardActionIntelligence {
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const characterById = new Map(params.characters.map((c) => [c.id, c]));

  const characterPlans: CharacterCapabilitiesPlan[] = [];
  const seenCharIds = new Set<string>();

  for (const scene of scenes) {
    for (const sc of scene.characters) {
      const lib = characterById.get(sc.id);
      if (!lib || seenCharIds.has(lib.id)) continue;
      seenCharIds.add(lib.id);
      characterPlans.push(
        buildCharacterCapabilities({
          character: lib,
          worlds: params.worlds,
          props: params.props,
          scenePropIds: scenes.flatMap((s) => s.props.map((p) => p.id)),
        })
      );
    }
  }

  if (characterPlans.length === 0 && params.characters.length > 0) {
    for (const c of params.characters.slice(0, 3)) {
      characterPlans.push(
        buildCharacterCapabilities({
          character: c,
          worlds: params.worlds,
          props: params.props,
        })
      );
    }
  }

  const sceneClassifications: SceneActionClassification[] = [];
  const shotHints: StoryboardActionIntelligence["shotHints"] = [];

  for (const scene of scenes) {
    const primaryChar =
      scene.characters[0]?.id ?
        characterPlans.find((p) => p.characterId === scene.characters[0]!.id)
      : characterPlans[0];
    if (!primaryChar) continue;

    const classification = classifySceneActions({ scene, characterPlan: primaryChar });
    sceneClassifications.push(classification);

    for (const action of classification.actions) {
      if (!action.capabilityId) continue;
      const hint = SHOT_HINT_BY_CAPABILITY[action.capabilityId];
      if (hint) {
        shotHints.push({
          sceneId: scene.id,
          capabilityId: action.capabilityId,
          shotPreferenceKey: hint.shotKey,
          movementPreferenceKey: hint.movementKey,
          reasonKey: hint.reasonKey,
        });
      }
    }
  }

  let renderComplexityBoost = 0;
  for (const scene of scenes) {
    const text = [scene.action, scene.description, scene.title].filter(Boolean).join(" ");
    renderComplexityBoost = Math.max(renderComplexityBoost, countDistinctActionCapabilities(text));
  }

  return {
    characterPlans,
    sceneClassifications,
    shotHints,
    visualProductionHints: buildVisualProductionHints(sceneClassifications, characterPlans),
    renderComplexityBoost,
  };
}

export function buildProjectActionMemoryTrends(
  storyboards: StudioStoryboardDetail[]
): ProjectActionMemoryTrend[] {
  const counts = new Map<CharacterCapabilityId, number>();

  for (const storyboard of storyboards) {
    for (const scene of storyboard.scenes) {
      const text = [scene.action, scene.description].filter(Boolean).join(" ");
      const steps = extractActionSteps(text);
      const fragments = steps.length > 0 ? steps : text.trim() ? [text] : [];
      const seenInScene = new Set<CharacterCapabilityId>();
      for (const fragment of fragments) {
        const id = matchActionFragmentToCapability(fragment) as CharacterCapabilityId | null;
        if (id && !seenInScene.has(id)) {
          seenInScene.add(id);
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([capabilityId, sceneCount]) => ({
      capabilityId,
      labelKey: CAPABILITY_LABEL_KEYS[capabilityId],
      sceneCount,
    }));
}

export function capabilityLabelKey(id: CharacterCapabilityId): string {
  return CAPABILITY_LABEL_KEYS[id];
}

export { CAPABILITY_LABEL_KEYS };
