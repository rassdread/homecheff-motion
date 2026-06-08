/**
 * Studio → Motion Vidu prompt enrichment — compact per-scene motion direction
 * from handoff intelligence (blocking, composition, placement, arc, performance).
 */

import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import {
  buildCameraMovementPrompt,
  buildSceneEnergyPrompt,
  buildShotTypePrompt,
  normalizeStudioCameraMovement,
  normalizeStudioSceneEnergy,
  normalizeStudioShotType,
  resolveSceneShotType,
} from "@/lib/studio-scene-director";
import {
  buildCharacterMemoryPromptChunks,
  buildLocationMemoryPromptChunks,
  buildPropMemoryPromptChunks,
  buildWorldMemoryPromptChunks,
  type MemoryPromptPriority,
  type PrioritizedMemoryChunk,
} from "@/lib/studio-memory-prompt";
import { worldProfilePickToListItem } from "@/lib/studio-prompt-source-entities";
import {
  buildWorldIdentityRenderStrategyHints,
  resolveWorldIdentityShotHint,
} from "@/lib/studio-world-identity-visual-hints";
import { formatSceneSemanticRecipeForMotion } from "@/lib/build-scene-semantic-recipe";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { CharacterAction } from "@/types/studio-character-blocking";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

export const STUDIO_MOTION_INSTRUCTION_MAX_CHARS = 520;

const AUDIO_ONLY_SCENE_FIELDS = [
  "musicCue",
  "soundCue",
  "audioProduction",
  "sceneAudioAssetPackage",
  "voiceSegment",
] as const;

const ACTION_PHRASES: Record<CharacterAction, string> = {
  STANDING: "stands naturally",
  WALKING: "walks with purpose",
  RUNNING: "moves quickly",
  TALKING: "speaks to camera or another character",
  PRESENTING: "presents proudly toward camera",
  POINTING: "points to emphasize the subject",
  LOOKING: "looks attentively at the focus point",
  LISTENING: "listens and reacts subtly",
  COOKING: "works actively with food",
  SHOPPING: "browses and selects items",
  WORKING: "works on a task",
  SITTING: "sits calmly in scene",
  WAVING: "waves in a friendly greeting",
  HANDSHAKE: "shares a handshake moment",
  CELEBRATING: "celebrates with visible energy",
  HOLDING_ITEM: "holds an item clearly visible",
  USING_PHONE: "uses a phone naturally",
  OBSERVING: "observes quietly in the background",
};

const INTERACTION_PHRASES: Record<string, string> = {
  CONVERSATION: "Characters converse naturally with clear spacing.",
  HANDSHAKE: "Include a brief handshake or greeting beat.",
  TEAMWORK: "Characters collaborate as a team.",
  EXCHANGE: "Characters exchange an item or idea.",
  DEMONSTRATION: "One character demonstrates while others observe.",
  GROUP_ACTIVITY: "Group activity with readable individual silhouettes.",
};

const COMPOSITION_PHRASES: Record<string, string> = {
  close_up: "Intimate close-up — face and expression lead the frame.",
  medium_shot: "Balanced medium framing with subject and context.",
  wide_shot: "Wide framing — show environment and placement.",
  group_shot: "Group shot — keep each character visually distinct.",
  hero_shot: "Hero moment — primary subject dominates the frame.",
  conversation: "Conversation framing — eyelines and spacing matter.",
  establishing: "Establish the location before character motion.",
  product_focus: "Product or prop should stay readable in frame.",
  community_scene: "Community energy — multiple subjects, no crowding.",
};

const ARC_PHRASES: Record<string, string> = {
  opening: "Opening beat — introduce mood and subject gently.",
  discovery: "Discovery beat — curiosity and forward momentum.",
  build_up: "Build-up — rising energy toward the story peak.",
  transition: "Transition beat — bridge pacing smoothly to the next moment.",
  climax: "Climax — peak energy and decisive motion.",
  resolution: "Resolution — warm payoff and clarity.",
  outro: "Outro — calm landing and brand-safe finish.",
};

export type StudioSceneMotionInstructionInput = {
  scene: MotionHandoffScene;
  sceneIndex: number;
  sceneCount: number;
  aiDirectorNotes?: string;
  /** Story-level memory from handoff — compact render context. */
  storyMemory?: Pick<SceneMemoryBundle, "characters" | "location" | "props" | "world">;
};

export type StudioSceneMotionInstructions = {
  lines: string[];
  text: string;
  usedFields: string[];
  ignoredFields: string[];
};

function trimSentence(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1).trim()}…`;
}

function zoneToPlain(zone: string): string {
  return zone
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\btop\b/g, "upper")
    .replace(/\bbottom\b/g, "lower");
}

function emotionPhrase(emotion: string): string {
  const e = emotion.trim().toLowerCase();
  if (!e) {
    return "";
  }
  if (e.includes("warm") || e.includes("happy") || e.includes("invit")) {
    return `Warm, inviting, ${e.replace(/_/g, " ")} energy.`;
  }
  if (e.includes("proud") || e.includes("confident")) {
    return `Proud, confident, ${e.replace(/_/g, " ")} tone.`;
  }
  if (e.includes("excit") || e.includes("celebrat")) {
    return `Excited, celebratory ${e.replace(/_/g, " ")} energy.`;
  }
  return `${e.charAt(0).toUpperCase()}${e.slice(1).replace(/_/g, " ")} mood.`;
}

function buildCharacterActionLine(scene: MotionHandoffScene): string | null {
  const blocking = scene.characterBlocking;
  if (blocking?.characterActions.length) {
    const primary =
      blocking.characterActions.find((a) => a.isActiveSpeaker) ??
      blocking.characterActions.find((a) => a.engagementLevel === "high") ??
      blocking.characterActions[0];
    if (primary) {
      const verb = ACTION_PHRASES[primary.action] ?? primary.action.toLowerCase().replace(/_/g, " ");
      return `Character action: ${primary.characterName} ${verb}.`;
    }
  }
  const action = scene.action.trim();
  if (action) {
    const names = scene.characters.map((c) => c.name).filter(Boolean);
    const subject = names[0] ?? "The subject";
    return `Character action: ${subject} — ${trimSentence(action, 100)}`;
  }
  return null;
}

function buildBlockingLine(scene: MotionHandoffScene): string | null {
  const parts: string[] = [];
  const blocking = scene.characterBlocking;
  if (blocking?.blockingSummary.trim()) {
    parts.push(trimSentence(blocking.blockingSummary, 90));
  }
  const placement = scene.assetPlacement;
  if (placement?.characterPlacements.length) {
    const layout = placement.characterPlacements
      .slice(0, 3)
      .map((p) => `${p.characterName} ${zoneToPlain(p.zone).replace(/ center /g, " center ")}`)
      .join("; ");
    parts.push(layout);
  } else if (scene.sceneComposition?.foregroundEntities.length) {
    parts.push(`Foreground: ${scene.sceneComposition.foregroundEntities.slice(0, 3).join(", ")}`);
  }
  const interaction = blocking?.interaction;
  if (interaction && interaction.interactionType !== "NONE") {
    const phrase = INTERACTION_PHRASES[interaction.interactionType];
    if (phrase) {
      parts.push(phrase);
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return `Blocking: ${trimSentence(parts.join(" "), 120)}`;
}

function buildCameraLine(scene: MotionHandoffScene): string | null {
  const shot =
    normalizeStudioShotType(scene.shotType) ||
    resolveSceneShotType(scene.studioContext.shotType, scene.studioContext.camera);
  const movement = normalizeStudioCameraMovement(
    scene.cameraMovement || scene.studioContext.cameraMovement
  );
  const energy = normalizeStudioSceneEnergy(scene.sceneEnergy || scene.studioContext.sceneEnergy);

  const parts: string[] = [];
  const shotLine = shot ? buildShotTypePrompt(shot) : "";
  const moveLine = movement ? buildCameraMovementPrompt(movement) : "";
  const energyLine = energy !== "neutral" ? buildSceneEnergyPrompt(energy) : "";

  if (shotLine) {
    parts.push(shotLine.replace(/\.$/, ""));
  }
  if (moveLine) {
    parts.push(moveLine.replace(/\.$/, ""));
  }
  if (energyLine) {
    parts.push(energyLine.replace(/\.$/, ""));
  }
  const transition = scene.transitionToNext.trim().toLowerCase();
  if (transition && transition !== "cut" && transition !== "none") {
    parts.push(`transition to next: ${transition.replace(/_/g, " ")}`);
  }
  if (parts.length === 0) {
    return null;
  }
  return `Camera: ${trimSentence(parts.join("; "), 120)}`;
}

function buildEmotionLine(scene: MotionHandoffScene): string | null {
  const emotion = scene.emotion.trim() || scene.studioContext.emotion.trim();
  const perf = scene.speakerPerformance;
  const chunks: string[] = [];
  if (emotion) {
    chunks.push(emotionPhrase(emotion));
  }
  if (perf?.activeSpeaker && perf.emotion.trim()) {
    chunks.push(`Performance: readable ${perf.emotion.replace(/_/g, " ")} reactions.`);
  } else if (perf?.activeSpeaker) {
    chunks.push("Performance: natural facial acting on the active speaker.");
  }
  if (chunks.length === 0) {
    return null;
  }
  return `Emotion: ${trimSentence(chunks.join(" "), 100)}`;
}

function buildPropsLine(scene: MotionHandoffScene): string | null {
  const propNames = scene.props.map((p) => p.name.trim()).filter(Boolean);
  if (propNames.length === 0) {
    return null;
  }
  const placementNames = new Set(
    (scene.assetPlacement?.propPlacements ?? []).map((p) => p.propName.trim())
  );
  const focusProps =
    placementNames.size > 0 ?
      propNames.filter((n) => placementNames.has(n))
    : propNames;
  const list = (focusProps.length > 0 ? focusProps : propNames).slice(0, 3).join(", ");
  return `Props: Keep ${list} visible and readable when on screen.`;
}

function buildWorldStrategyMotionLine(
  storyMemory?: StudioSceneMotionInstructionInput["storyMemory"]
): string | null {
  if (!storyMemory?.world) {
    return null;
  }
  const worldItem = worldProfilePickToListItem({
    id: storyMemory.world.id,
    name: storyMemory.world.name,
    description: storyMemory.world.description,
    visualStyle: storyMemory.world.visualStyle,
    tone: storyMemory.world.tone,
    continuityRules: storyMemory.world.continuityRules,
    continuityStrength: storyMemory.world.continuityStrength,
  });
  const strategies = buildWorldIdentityRenderStrategyHints(worldItem);
  const shotHint = resolveWorldIdentityShotHint(worldItem);
  const chunks: string[] = [];
  if (strategies.length > 0) {
    chunks.push(strategies.join(" "));
  }
  if (shotHint?.pacing) {
    chunks.push(`Pacing: ${shotHint.pacing}.`);
  }
  if (shotHint?.preferredShotTypes.length) {
    chunks.push(
      `Camera intent: ${shotHint.preferredShotTypes.slice(0, 2).join(", ").replace(/_/g, " ")}.`
    );
  }
  if (chunks.length === 0) {
    return null;
  }
  return `World: ${trimSentence(chunks.join(" "), 140)}`;
}

const MEMORY_IDENTITY_MAX_CHARS = 220;
const MEMORY_PRIORITY_ORDER: MemoryPromptPriority[] = ["high", "medium", "low"];

function packPrioritizedMemoryChunks(
  chunks: PrioritizedMemoryChunk[],
  maxChars: number
): string {
  const parts: string[] = [];
  let total = 0;
  for (const tier of MEMORY_PRIORITY_ORDER) {
    for (const chunk of chunks) {
      if (chunk.priority !== tier || !chunk.text.trim()) {
        continue;
      }
      const text = chunk.text.trim();
      const next = total === 0 ? text.length : total + 1 + text.length;
      if (next > maxChars) {
        const remaining = maxChars - total - (total > 0 ? 1 : 0);
        if (remaining > 24) {
          parts.push(`${text.slice(0, remaining - 1).trim()}…`);
        }
        return parts.join(" ");
      }
      parts.push(text);
      total = next;
    }
  }
  return parts.join(" ");
}

function buildMemoryContextLine(
  scene: MotionHandoffScene,
  storyMemory?: StudioSceneMotionInstructionInput["storyMemory"]
): string | null {
  if (!storyMemory) {
    return null;
  }
  const sceneNames = new Set(scene.characters.map((c) => c.name.trim().toLowerCase()));
  const characterNamesById = new Map(storyMemory.characters.map((c) => [c.id, c.name]));
  const sceneCharacters = storyMemory.characters.filter((c) =>
    sceneNames.has(c.name.trim().toLowerCase())
  );
  const sceneProps = storyMemory.props.filter((p) =>
    new Set(scene.props.map((row) => row.id)).has(p.id)
  );
  const sceneLocation =
    storyMemory.location && scene.location?.id === storyMemory.location.id
      ? storyMemory.location
      : null;
  // Motion path: characters first so outfit/forbidden survive the identity budget.
  const chunks = [
    ...buildCharacterMemoryPromptChunks(sceneCharacters),
    ...buildWorldMemoryPromptChunks(storyMemory.world),
    ...buildLocationMemoryPromptChunks(sceneLocation),
    ...buildPropMemoryPromptChunks(sceneProps, { characterNamesById }),
  ];
  const combined = packPrioritizedMemoryChunks(chunks, MEMORY_IDENTITY_MAX_CHARS).trim();
  if (!combined) {
    return null;
  }
  return `Identity: ${combined}`;
}

function buildLocationLine(scene: MotionHandoffScene): string | null {
  const loc = scene.location;
  if (!loc?.name.trim()) {
    return null;
  }
  const mood = loc.description.trim();
  if (mood) {
    return `Location: ${loc.name} — ${trimSentence(mood, 80)}`;
  }
  return `Location: Maintain ${loc.name} atmosphere and continuity.`;
}

function buildCompositionLine(scene: MotionHandoffScene): string | null {
  const comp = scene.sceneComposition;
  if (!comp) {
    return null;
  }
  const typePhrase = COMPOSITION_PHRASES[comp.compositionType] ?? "";
  const focus = comp.visualFocus.entityName?.trim();
  const chunks: string[] = [];
  if (typePhrase) {
    chunks.push(typePhrase);
  }
  if (focus) {
    chunks.push(`Visual focus on ${focus}.`);
  }
  if (chunks.length === 0) {
    return null;
  }
  return trimSentence(chunks.join(" "), 120);
}

function buildStoryArcLine(sceneIndex: number, sceneCount: number): string | null {
  if (sceneCount <= 1) {
    return null;
  }
  const phase = detectArcPhaseForIndex(sceneIndex, sceneCount);
  const phrase = ARC_PHRASES[phase];
  return phrase ? `Story arc: ${phrase}` : null;
}

function buildSafetyLine(scene: MotionHandoffScene): string {
  const brands =
    scene.assetPlacement?.brandPlacements.map((b) => b.brandName).filter(Boolean) ?? [];
  const chunks = ["Do not cover faces, logos, or baked UI text in source frames."];
  if (brands.length > 0) {
    chunks.push(`Keep ${brands.slice(0, 2).join(" and ")} branding visible.`);
  }
  return `Safety: ${chunks.join(" ")}`;
}

function collectIgnoredAudioFields(scene: MotionHandoffScene): string[] {
  const ignored: string[] = [];
  for (const key of AUDIO_ONLY_SCENE_FIELDS) {
    if (scene[key as keyof MotionHandoffScene]) {
      ignored.push(key);
    }
  }
  return ignored;
}

type MotionInstructionCandidate = {
  line: string;
  field: string;
  /** Lower drops first when budget is tight — identity tiers stay. */
  dropPriority: number;
};

function packLines(candidates: MotionInstructionCandidate[], maxChars: number): {
  lines: string[];
  text: string;
} {
  const sorted = [...candidates].sort((a, b) => a.dropPriority - b.dropPriority);
  const kept: string[] = [];
  let total = 0;
  for (const row of sorted) {
    const next = total === 0 ? row.line.length : total + 1 + row.line.length;
    if (next > maxChars) {
      continue;
    }
    kept.push(row.line);
    total = next;
  }
  return { lines: kept, text: kept.join("\n") };
}

/** Build compact Vidu-facing motion instructions for one handoff scene. */
export function buildStudioSceneMotionInstructions(
  input: StudioSceneMotionInstructionInput
): StudioSceneMotionInstructions {
  const { scene, sceneIndex, sceneCount, aiDirectorNotes, storyMemory } = input;
  const usedFields: string[] = [];
  const ignoredFields = collectIgnoredAudioFields(scene);

  const candidateLines: MotionInstructionCandidate[] = [];

  const semanticRecipe = scene.semanticRecipe;
  if (semanticRecipe) {
    const recipeLine = trimSentence(
      `Semantic: ${formatSceneSemanticRecipeForMotion(semanticRecipe)}`,
      200
    );
    if (recipeLine) {
      candidateLines.push({
        line: recipeLine,
        field: "semanticRecipe",
        dropPriority: 0,
      });
    }
  }

  const worldStrategyLine = buildWorldStrategyMotionLine(storyMemory);
  if (worldStrategyLine) {
    candidateLines.push({
      line: worldStrategyLine,
      field: "worldRenderStrategy,worldMemory",
      dropPriority: 1,
    });
  }

  const memoryLine = buildMemoryContextLine(scene, storyMemory);
  if (memoryLine) {
    candidateLines.push({
      line: memoryLine,
      field: "characterMemory,worldMemory,locationMemory,propMemory",
      dropPriority: 1,
    });
  }

  const actionLine = buildCharacterActionLine(scene);
  if (actionLine) {
    candidateLines.push({
      line: actionLine,
      field: scene.characterBlocking ? "characterBlocking" : "action",
      dropPriority: 3,
    });
  } else if (scene.characterBlocking) {
    ignoredFields.push("characterBlocking");
  }

  const blockingLine = buildBlockingLine(scene);
  if (blockingLine) {
    candidateLines.push({
      line: blockingLine,
      field: scene.assetPlacement ? "assetPlacement" : "characterBlocking",
      dropPriority: 4,
    });
  }

  const compositionLine = buildCompositionLine(scene);
  if (compositionLine) {
    candidateLines.push({ line: compositionLine, field: "sceneComposition", dropPriority: 5 });
  } else if (scene.sceneComposition) {
    ignoredFields.push("sceneComposition");
  }

  const cameraLine = buildCameraLine(scene);
  if (cameraLine) {
    candidateLines.push({
      line: cameraLine,
      field: "shotType,cameraMovement,sceneEnergy",
      dropPriority: 3,
    });
  }

  const emotionLine = buildEmotionLine(scene);
  if (emotionLine) {
    candidateLines.push({
      line: emotionLine,
      field: scene.speakerPerformance ? "emotion,speakerPerformance" : "emotion",
      dropPriority: 4,
    });
  }

  const propsLine = buildPropsLine(scene);
  if (propsLine) {
    candidateLines.push({ line: propsLine, field: "props,assetPlacement", dropPriority: 4 });
  } else if (scene.props.length > 0) {
    ignoredFields.push("props");
  }

  const locationLine = buildLocationLine(scene);
  if (locationLine) {
    candidateLines.push({ line: locationLine, field: "location", dropPriority: 4 });
  } else if (scene.location) {
    ignoredFields.push("location");
  }

  const arcLine = buildStoryArcLine(sceneIndex, sceneCount);
  if (arcLine) {
    candidateLines.push({ line: arcLine, field: "storyIntelligence", dropPriority: 6 });
  }

  if (sceneIndex === 0 && aiDirectorNotes?.trim()) {
    candidateLines.push({
      line: `Director note: ${trimSentence(aiDirectorNotes.trim(), 100)}`,
      field: "aiDirectorNotes",
      dropPriority: 5,
    });
  } else if (aiDirectorNotes?.trim()) {
    ignoredFields.push("aiDirectorNotes");
  }

  candidateLines.push({ line: buildSafetyLine(scene), field: "safety", dropPriority: 2 });

  for (const row of candidateLines) {
    for (const part of row.field.split(",")) {
      const key = part.trim();
      if (key && !usedFields.includes(key)) {
        usedFields.push(key);
      }
    }
  }

  const packed = packLines(candidateLines, STUDIO_MOTION_INSTRUCTION_MAX_CHARS);

  return {
    lines: packed.lines,
    text: packed.text,
    usedFields,
    ignoredFields: [...new Set(ignoredFields)],
  };
}

export function resolveStudioMotionInstructionsBySceneIndex(
  handoff: MotionHandoffPayload | null | undefined,
  sceneCount: number
): Array<StudioSceneMotionInstructions | null> {
  if (!handoff || handoff.version < 11 || handoff.scenes.length === 0) {
    return Array.from({ length: sceneCount }, () => null);
  }
  const sorted = [...handoff.scenes].sort((a, b) => a.order - b.order);
  const aiNotes = handoff.executionPackage?.aiDirectorNotes?.trim() ?? "";
  return Array.from({ length: sceneCount }, (_, i) => {
    const scene = sorted[i];
    if (!scene) {
      return null;
    }
    const built = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: i,
      sceneCount: Math.max(sceneCount, sorted.length),
      aiDirectorNotes: aiNotes,
      storyMemory: handoff
        ? {
            characters: handoff.characterMemory ?? [],
            location: handoff.locationMemory ?? null,
            props: handoff.propMemory ?? [],
            world: handoff.worldMemory ?? null,
          }
        : undefined,
    });
    return built.text.trim() ? built : null;
  });
}

export function resolveStudioMotionInstructionTextsBySceneIndex(
  handoff: MotionHandoffPayload | null | undefined,
  sceneCount: number
): Array<string | null> {
  return resolveStudioMotionInstructionsBySceneIndex(handoff, sceneCount).map((row) =>
    row?.text.trim() ? row.text : null
  );
}

export function resolveStudioSemanticRecipeTextsBySceneIndex(
  handoff: MotionHandoffPayload | null | undefined,
  sceneCount: number
): Array<string | null> {
  if (!handoff || handoff.version < 26 || handoff.scenes.length === 0) {
    return Array.from({ length: sceneCount }, () => null);
  }
  const sorted = [...handoff.scenes].sort((a, b) => a.order - b.order);
  return Array.from({ length: sceneCount }, (_, i) => {
    const recipe = sorted[i]?.semanticRecipe;
    if (!recipe) {
      return null;
    }
    const text = formatSceneSemanticRecipeForMotion(recipe).trim();
    return text || null;
  });
}
