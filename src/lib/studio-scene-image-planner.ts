/**
 * Studio V27 — scene image planner (requirements, continuity, prompts, readiness).
 * Planning layer only — no image provider or video generation.
 */

import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { buildSceneImageGenerationPrompt } from "@/lib/studio-scene-image-prompt";
import { shortShotLabel } from "@/lib/studio-intelligence-timeline-chips";
import {
  buildStyleProfilePrompt,
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import { normalizeStudioDirectorProfile, type StudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  resolveSceneShotType,
  type StudioShotType,
} from "@/lib/studio-scene-director";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import {
  studioSceneDetailToPromptInput,
  studioSceneDetailToSnapshot,
} from "@/lib/studio-scene-to-prompt-input";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type SceneImagePlannerWarningCode =
  | "character_disappears"
  | "character_clothing_shift"
  | "mascot_disappears"
  | "location_jump"
  | "prop_drops"
  | "character_not_introduced"
  | "location_unassigned"
  | "scene_missing_characters";

export type SceneImagePlannerWarning = {
  code: SceneImagePlannerWarningCode | string;
  messageKey: string;
  sceneIds: string[];
  params?: Record<string, string | number>;
};

export type SceneImageRequirements = {
  sceneId: string;
  order: number;
  title: string;
  characterNames: string[];
  locationName: string | null;
  objectNames: string[];
  visualMood: string;
  timeOfDay: string;
  cameraFraming: string;
  arcPhase: StoryArcPhase;
};

export type ScenePromptExports = {
  imageGenerationPrompt: string;
  viduContextPrompt: string;
  storyboardVisualPrompt: string;
};

export type RegistryEntry = {
  id: string;
  name: string;
  sceneCount: number;
  sceneOrders: number[];
  isMascot?: boolean;
};

export type StoryboardAssetRegistries = {
  characters: RegistryEntry[];
  locations: RegistryEntry[];
  props: RegistryEntry[];
};

export type SceneImagePlannerScenePlan = {
  requirements: SceneImageRequirements;
  aiSceneDescription: string;
  exports: ScenePromptExports;
};

export type StoryboardImageReadiness = "ready" | "needs_attention" | "not_ready";

export type SceneImagePlannerReport = {
  registries: StoryboardAssetRegistries;
  scenes: SceneImagePlannerScenePlan[];
  warnings: SceneImagePlannerWarning[];
  visualConsistencyScore: number;
  readiness: StoryboardImageReadiness;
  readinessLabelKey: string;
  consistencyFactors: {
    characterConsistency: number;
    locationConsistency: number;
    propConsistency: number;
    transitionConsistency: number;
  };
};

const TIME_OF_DAY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(night|midnight|evening|dusk|sunset)\b/i, label: "Evening" },
  { pattern: /\b(morning|sunrise|dawn)\b/i, label: "Morning" },
  { pattern: /\b(golden\s*hour)\b/i, label: "Golden hour" },
  { pattern: /\b(daylight|daytime|afternoon|midday|noon)\b/i, label: "Daylight" },
];

const CLOTHING_HINT_WORDS = [
  "suit",
  "uniform",
  "casual",
  "jacket",
  "coat",
  "dress",
  "hoodie",
  "apron",
  "chef",
  "overalls",
  "formal",
  "sportswear",
] as const;

const TRANSITION_HINTS =
  /\b(cut to|later|meanwhile|travel|arrive|enter|leave|transition|next day)\b/i;

function orderedScenes(storyboard: StudioStoryboardDetail): StudioSceneDetail[] {
  return [...storyboard.scenes].sort((a, b) => a.order - b.order);
}

function sceneTextBlob(scene: StudioSceneDetail): string {
  return [scene.title, scene.description, scene.action, scene.emotion].join(" ").toLowerCase();
}

export function inferTimeOfDay(scene: StudioSceneDetail): string {
  const blob = sceneTextBlob(scene);
  for (const { pattern, label } of TIME_OF_DAY_PATTERNS) {
    if (pattern.test(blob)) {
      return label;
    }
  }
  const env = scene.location?.environmentKeywords?.trim() ?? "";
  if (/\bnight\b/i.test(env)) {
    return "Evening";
  }
  if (/\b(day|outdoor|sun)\b/i.test(env)) {
    return "Daylight";
  }
  return "Daylight";
}

export function inferVisualMood(
  scene: StudioSceneDetail,
  styleProfile: StudioPromptStyleProfile
): string {
  const emotion = scene.emotion.trim();
  const energy = scene.sceneEnergy;
  const styleHint = buildStyleProfilePrompt(styleProfile).split(".")[0]?.trim() ?? "";
  const parts: string[] = [];
  if (emotion) {
    parts.push(emotion);
  }
  if (energy === "intense") {
    parts.push("high energy");
  } else if (energy === "calm") {
    parts.push("calm");
  } else if (energy === "dynamic") {
    parts.push("dynamic");
  }
  if (styleHint && !parts.some((p) => styleHint.toLowerCase().includes(p.toLowerCase()))) {
    parts.push(styleHint);
  }
  return parts.length > 0 ? parts.join(", ") : "Neutral, cinematic";
}

export function buildSceneImageRequirements(
  scene: StudioSceneDetail,
  arcPhase: StoryArcPhase,
  styleProfile: StudioPromptStyleProfile
): SceneImageRequirements {
  const shot = resolveSceneShotType(scene.shotType, scene.camera) || "medium";
  return {
    sceneId: scene.id,
    order: scene.order,
    title: scene.title.trim() || `Scene ${scene.order + 1}`,
    characterNames: scene.characters.map((c) => c.name.trim()).filter(Boolean),
    locationName: scene.location?.name.trim() || null,
    objectNames: scene.props.map((p) => p.name.trim()).filter(Boolean),
    visualMood: inferVisualMood(scene, styleProfile),
    timeOfDay: inferTimeOfDay(scene),
    cameraFraming: shortShotLabel(shot),
    arcPhase,
  };
}

export function buildStoryboardAssetRegistries(
  storyboard: StudioStoryboardDetail
): StoryboardAssetRegistries {
  const scenes = orderedScenes(storyboard);
  const charMap = new Map<string, RegistryEntry>();
  const locMap = new Map<string, RegistryEntry>();
  const propMap = new Map<string, RegistryEntry>();

  for (const scene of scenes) {
    for (const c of scene.characters) {
      const existing = charMap.get(c.id);
      if (existing) {
        existing.sceneCount += 1;
        existing.sceneOrders.push(scene.order);
      } else {
        charMap.set(c.id, {
          id: c.id,
          name: c.name,
          sceneCount: 1,
          sceneOrders: [scene.order],
          isMascot: c.isMascot,
        });
      }
    }
    if (scene.location) {
      const loc = scene.location;
      const existing = locMap.get(loc.id);
      if (existing) {
        existing.sceneCount += 1;
        existing.sceneOrders.push(scene.order);
      } else {
        locMap.set(loc.id, {
          id: loc.id,
          name: loc.name,
          sceneCount: 1,
          sceneOrders: [scene.order],
        });
      }
    }
    for (const p of scene.props) {
      const existing = propMap.get(p.id);
      if (existing) {
        existing.sceneCount += 1;
        existing.sceneOrders.push(scene.order);
      } else {
        propMap.set(p.id, {
          id: p.id,
          name: p.name,
          sceneCount: 1,
          sceneOrders: [scene.order],
        });
      }
    }
  }

  const sortByName = (a: RegistryEntry, b: RegistryEntry) => a.name.localeCompare(b.name);

  return {
    characters: [...charMap.values()].sort(sortByName),
    locations: [...locMap.values()].sort(sortByName),
    props: [...propMap.values()].sort(sortByName),
  };
}

function extractClothingHints(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const word of CLOTHING_HINT_WORDS) {
    if (lower.includes(word)) {
      found.add(word);
    }
  }
  return found;
}

function clothingHintsForCharacter(scene: StudioSceneDetail, characterId: string): Set<string> {
  const char = scene.characters.find((c) => c.id === characterId);
  const hints = extractClothingHints(sceneTextBlob(scene));
  if (char?.defaultClothing.trim()) {
    for (const word of CLOTHING_HINT_WORDS) {
      if (char.defaultClothing.toLowerCase().includes(word)) {
        hints.add(word);
      }
    }
  }
  return hints;
}

export function analyzeSceneImageContinuity(
  storyboard: StudioStoryboardDetail
): SceneImagePlannerWarning[] {
  const scenes = orderedScenes(storyboard);
  const warnings: SceneImagePlannerWarning[] = [];

  if (scenes.length === 0) {
    return warnings;
  }

  const charAppearances = new Map<
    string,
    { name: string; isMascot: boolean; orders: number[]; sceneIds: string[] }
  >();

  for (const scene of scenes) {
    for (const c of scene.characters) {
      const row = charAppearances.get(c.id) ?? {
        name: c.name,
        isMascot: c.isMascot,
        orders: [],
        sceneIds: [],
      };
      row.orders.push(scene.order);
      row.sceneIds.push(scene.id);
      charAppearances.set(c.id, row);
    }
  }

  for (const [, row] of charAppearances) {
    if (row.orders.length < 2) {
      continue;
    }
    const sorted = [...row.orders].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const gap = sorted[i + 1]! - sorted[i]!;
      if (gap > 1) {
        const fromScene = scenes.find((s) => s.order === sorted[i]);
        const toScene = scenes.find((s) => s.order === sorted[i + 1]);
        warnings.push({
          code: row.isMascot ? "mascot_disappears" : "character_disappears",
          messageKey: row.isMascot
            ? "studio.imagePlanner.warning.mascotDisappears"
            : "studio.imagePlanner.warning.characterDisappears",
          sceneIds: [fromScene?.id, toScene?.id].filter((id): id is string => Boolean(id)),
          params: {
            character: row.name,
            sceneA: (sorted[i] ?? 0) + 1,
            sceneB: (sorted[i + 1] ?? 0) + 1,
          },
        });
      }
    }
  }

  for (let i = 0; i < scenes.length - 1; i += 1) {
    const a = scenes[i]!;
    const b = scenes[i + 1]!;
    const shared = a.characters.filter((c) => b.characters.some((bc) => bc.id === c.id));
    for (const c of shared) {
      const hintsA = clothingHintsForCharacter(a, c.id);
      const hintsB = clothingHintsForCharacter(b, c.id);
      if (hintsA.size > 0 && hintsB.size > 0) {
        const overlap = [...hintsA].filter((h) => hintsB.has(h));
        if (overlap.length === 0) {
          warnings.push({
            code: "character_clothing_shift",
            messageKey: "studio.imagePlanner.warning.clothingShift",
            sceneIds: [a.id, b.id],
            params: { character: c.name, sceneA: a.order + 1, sceneB: b.order + 1 },
          });
        }
      }
    }

    const locA = a.location?.id ?? null;
    const locB = b.location?.id ?? null;
    if (locA && locB && locA !== locB) {
      const transition = a.transitionToNext.trim();
      if (!TRANSITION_HINTS.test(transition) && !TRANSITION_HINTS.test(sceneTextBlob(b))) {
        warnings.push({
          code: "location_jump",
          messageKey: "studio.imagePlanner.warning.locationJump",
          sceneIds: [a.id, b.id],
          params: {
            locationA: a.location?.name ?? "",
            locationB: b.location?.name ?? "",
            sceneA: a.order + 1,
            sceneB: b.order + 1,
          },
        });
      }
    }
  }

  for (const [, row] of charAppearances) {
    const first = row.orders[0] ?? 0;
    if (first >= 2 && row.orders.length >= 2) {
      warnings.push({
        code: "character_not_introduced",
        messageKey: "studio.imagePlanner.warning.characterNotIntroduced",
        sceneIds: [row.sceneIds[0] ?? ""].filter(Boolean),
        params: { character: row.name, scene: first + 1 },
      });
    }
  }

  for (const scene of scenes) {
    if (scene.characters.length === 0 && scene.description.trim().length > 20) {
      warnings.push({
        code: "scene_missing_characters",
        messageKey: "studio.imagePlanner.warning.sceneMissingCharacters",
        sceneIds: [scene.id],
        params: { scene: scene.order + 1 },
      });
    }
    if (!scene.location && scene.description.trim().length > 30) {
      warnings.push({
        code: "location_unassigned",
        messageKey: "studio.imagePlanner.warning.locationUnassigned",
        sceneIds: [scene.id],
        params: { scene: scene.order + 1 },
      });
    }
  }

  const propMap = new Map<string, { name: string; orders: number[]; sceneIds: string[] }>();
  for (const scene of scenes) {
    for (const p of scene.props) {
      const row = propMap.get(p.id) ?? { name: p.name, orders: [], sceneIds: [] };
      row.orders.push(scene.order);
      row.sceneIds.push(scene.id);
      propMap.set(p.id, row);
    }
  }
  for (const [, row] of propMap) {
    if (row.orders.length < 2) {
      continue;
    }
    const sorted = [...row.orders].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i + 1]! - sorted[i]! > 1) {
        warnings.push({
          code: "prop_drops",
          messageKey: "studio.imagePlanner.warning.propDrops",
          sceneIds: row.sceneIds,
          params: {
            prop: row.name,
            sceneA: sorted[i]! + 1,
            sceneB: sorted[i + 1]! + 1,
          },
        });
        break;
      }
    }
  }

  return warnings;
}

export function detectMissingSceneReferences(
  storyboard: StudioStoryboardDetail
): SceneImagePlannerWarning[] {
  const scenes = orderedScenes(storyboard);
  const warnings: SceneImagePlannerWarning[] = [];
  if (scenes.length === 0) {
    return warnings;
  }

  const arc = buildStoryArc(
    scenes.map((s) => ({
      sceneId: s.id,
      order: s.order,
      title: s.title,
      shotType: s.shotType,
      cameraMovement: s.cameraMovement,
      sceneEnergy: s.sceneEnergy,
      camera: s.camera,
    }))
  );
  const arcById = new Map(arc.map((e) => [e.sceneId, e.phase]));

  const registryLocations = buildStoryboardAssetRegistries(storyboard).locations;
  for (const loc of registryLocations) {
    if (loc.sceneCount === 1 && scenes.length >= 4) {
      const onlyScene = scenes.find((s) => s.order === loc.sceneOrders[0]);
      const phase = onlyScene ? arcById.get(onlyScene.id) : null;
      if (phase === "climax" || phase === "outro") {
        warnings.push({
          code: "location_unassigned",
          messageKey: "studio.imagePlanner.warning.locationRarelyShown",
          sceneIds: onlyScene ? [onlyScene.id] : [],
          params: { location: loc.name },
        });
      }
    }
  }

  const climaxScene = scenes.find((s) => arcById.get(s.id) === "climax");
  if (climaxScene && climaxScene.characters.length === 0) {
    const cast = buildStoryboardAssetRegistries(storyboard).characters.filter((c) => c.sceneCount >= 2);
    if (cast.length > 0) {
      warnings.push({
        code: "character_not_introduced",
        messageKey: "studio.imagePlanner.warning.climaxMissingCast",
        sceneIds: [climaxScene.id],
        params: { scene: climaxScene.order + 1 },
      });
    }
  }

  return warnings;
}

export function buildAiSceneDescription(requirements: SceneImageRequirements): string {
  const parts: string[] = [];
  if (requirements.locationName) {
    parts.push(requirements.locationName);
  }
  if (requirements.characterNames.length > 0) {
    parts.push(requirements.characterNames.join(", "));
  }
  if (requirements.objectNames.length > 0) {
    parts.push(`with ${requirements.objectNames.join(", ")}`);
  }
  const subject =
    parts.length > 0 ? parts.join(", ") : requirements.title;
  return `${subject}, ${requirements.timeOfDay.toLowerCase()}, ${requirements.visualMood.toLowerCase()}, ${requirements.cameraFraming.toLowerCase()} shot.`.replace(
    /\s+/g,
    " "
  );
}

export function buildScenePromptExports(
  scene: StudioSceneDetail,
  styleProfile: StudioPromptStyleProfile,
  directorProfile: StudioDirectorProfile
): ScenePromptExports {
  const promptInput = studioSceneDetailToPromptInput(scene, styleProfile, directorProfile);
  const promptOutput = buildScenePromptFromInput(promptInput);
  const snapshot = studioSceneDetailToSnapshot(scene);
  const imageGenerationPrompt = buildSceneImageGenerationPrompt(snapshot, promptOutput);

  const requirements = buildSceneImageRequirements(
    scene,
    "build_up",
    styleProfile
  );
  const viduContextPrompt = buildAiSceneDescription(requirements);

  const storyboardVisualPrompt = [
    promptOutput.sections.sceneContext,
    promptOutput.sections.characters,
    promptOutput.sections.location,
    promptOutput.sections.action,
    promptOutput.sections.emotion,
    promptOutput.sections.camera,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(". ");

  return {
    imageGenerationPrompt,
    viduContextPrompt,
    storyboardVisualPrompt,
  };
}

export function computeVisualConsistencyScore(params: {
  storyboard: StudioStoryboardDetail;
  warnings: SceneImagePlannerWarning[];
}): {
  score: number;
  factors: SceneImagePlannerReport["consistencyFactors"];
} {
  const scenes = orderedScenes(params.storyboard);
  if (scenes.length === 0) {
    return {
      score: 0,
      factors: {
        characterConsistency: 0,
        locationConsistency: 0,
        propConsistency: 0,
        transitionConsistency: 0,
      },
    };
  }

  const registries = buildStoryboardAssetRegistries(params.storyboard);
  const disappearWarnings = params.warnings.filter(
    (w) =>
      w.code === "character_disappears" ||
      w.code === "mascot_disappears" ||
      w.code === "character_clothing_shift"
  ).length;
  const locationJumpWarnings = params.warnings.filter((w) => w.code === "location_jump").length;

  const scenesWithChars = scenes.filter((s) => s.characters.length > 0).length;
  const characterConsistency = Math.max(
    0,
    Math.min(100, Math.round((scenesWithChars / scenes.length) * 100) - disappearWarnings * 12)
  );

  const scenesWithLoc = scenes.filter((s) => s.location).length;
  const locationConsistency = Math.max(
    0,
    Math.min(100, Math.round((scenesWithLoc / scenes.length) * 100) - locationJumpWarnings * 15)
  );

  const scenesWithProps = scenes.filter((s) => s.props.length > 0).length;
  const propCoverage =
    registries.props.length === 0 ? 100 : Math.round((scenesWithProps / scenes.length) * 100);
  const propDrops = params.warnings.filter((w) => w.code === "prop_drops").length;
  const propConsistency = Math.max(0, Math.min(100, propCoverage - propDrops * 10));

  const transitionConsistency = Math.max(0, Math.min(100, 100 - locationJumpWarnings * 20));

  const score = Math.round(
    characterConsistency * 0.35 +
      locationConsistency * 0.3 +
      propConsistency * 0.15 +
      transitionConsistency * 0.2
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    factors: {
      characterConsistency,
      locationConsistency,
      propConsistency,
      transitionConsistency,
    },
  };
}

export function resolveStoryboardImageReadiness(params: {
  visualConsistencyScore: number;
  warnings: SceneImagePlannerWarning[];
  sceneCount: number;
}): { readiness: StoryboardImageReadiness; labelKey: string } {
  if (params.sceneCount === 0) {
    return {
      readiness: "not_ready",
      labelKey: "studio.imagePlanner.readiness.notReady",
    };
  }
  const critical =
    params.visualConsistencyScore < 45 ||
    params.warnings.some((w) => w.code === "scene_missing_characters");
  if (critical) {
    return {
      readiness: "not_ready",
      labelKey: "studio.imagePlanner.readiness.notReady",
    };
  }
  if (params.visualConsistencyScore < 72 || params.warnings.length > 0) {
    return {
      readiness: "needs_attention",
      labelKey: "studio.imagePlanner.readiness.needsAttention",
    };
  }
  return {
    readiness: "ready",
    labelKey: "studio.imagePlanner.readiness.ready",
  };
}

export function analyzeSceneImagePlanner(params: {
  storyboard: StudioStoryboardDetail;
  styleProfile?: StudioPromptStyleProfile | string;
  directorProfile?: StudioDirectorProfile | string;
}): SceneImagePlannerReport {
  const styleProfile = normalizeStudioPromptStyleProfile(
    params.styleProfile ?? params.storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    params.directorProfile ?? params.storyboard.directorProfile
  );
  const scenes = orderedScenes(params.storyboard);
  const arc = buildStoryArc(
    scenes.map((s) => ({
      sceneId: s.id,
      order: s.order,
      title: s.title,
      shotType: s.shotType,
      cameraMovement: s.cameraMovement,
      sceneEnergy: s.sceneEnergy,
      camera: s.camera,
    }))
  );
  const arcById = new Map(arc.map((e) => [e.sceneId, e.phase]));

  const continuityWarnings = analyzeSceneImageContinuity(params.storyboard);
  const missingWarnings = detectMissingSceneReferences(params.storyboard);
  const warnings = [...continuityWarnings, ...missingWarnings];

  const { score: visualConsistencyScore, factors: consistencyFactors } =
    computeVisualConsistencyScore({
      storyboard: params.storyboard,
      warnings,
    });

  const { readiness, labelKey: readinessLabelKey } = resolveStoryboardImageReadiness({
    visualConsistencyScore,
    warnings,
    sceneCount: scenes.length,
  });

  const scenePlans: SceneImagePlannerScenePlan[] = scenes.map((scene) => {
    const phase = arcById.get(scene.id) ?? "build_up";
    const requirements = buildSceneImageRequirements(scene, phase, styleProfile);
    return {
      requirements,
      aiSceneDescription: buildAiSceneDescription(requirements),
      exports: buildScenePromptExports(scene, styleProfile, directorProfile),
    };
  });

  return {
    registries: buildStoryboardAssetRegistries(params.storyboard),
    scenes: scenePlans,
    warnings,
    visualConsistencyScore,
    readiness,
    readinessLabelKey,
    consistencyFactors,
  };
}
