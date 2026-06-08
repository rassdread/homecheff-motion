import { buildDirectorProfilePrompt } from "@/lib/studio-director-profiles";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  buildCameraMovementPrompt,
  buildDirectorCameraPrompt,
  buildSceneEnergyPrompt,
  buildShotTypePrompt,
} from "@/lib/studio-scene-director";
import { buildCharactersPrompt } from "@/lib/studio-prompt-character-builder";
import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import { buildLocationPrompt } from "@/lib/studio-prompt-location-builder";
import { buildPropsPrompt } from "@/lib/studio-prompt-prop-builder";
import {
  buildCharacterMemoryPromptLines,
  buildLocationMemoryPromptLines,
  buildPropMemoryPromptLines,
  buildWorldMemoryPromptLines,
} from "@/lib/studio-memory-prompt";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type {
  StudioExecutionReadiness,
  StudioExecutionReadinessTier,
  StudioExecutionWarning,
  StudioSceneExecutionPackage,
  StudioStoryExecutionPackage,
} from "@/types/studio-scene-execution";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

const EXECUTION_PROMPT_MAX_CHARS = 2800;

function joinBlocks(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

function truncateExecutionPrompt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= EXECUTION_PROMPT_MAX_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, EXECUTION_PROMPT_MAX_CHARS - 3)}...`;
}

export function buildWorldRulesForExecution(
  world: SceneMemoryBundle["world"],
  directorProfile: string
): string {
  const worldLines = buildWorldMemoryPromptLines(world);
  const directorLine = buildDirectorProfilePrompt(normalizeStudioDirectorProfile(directorProfile));
  return joinBlocks([...worldLines, directorLine]);
}

export function buildCharacterRulesForExecution(
  scene: MotionHandoffScene,
  storyCharacters: SceneMemoryBundle["characters"]
): string {
  const sceneNames = new Set(scene.characters.map((c) => c.name.trim().toLowerCase()));
  const memoryMatches = storyCharacters.filter((c) =>
    sceneNames.has(c.name.trim().toLowerCase())
  );
  if (memoryMatches.length > 0) {
    return buildCharacterMemoryPromptLines(memoryMatches).join("\n");
  }
  return buildCharactersPrompt(scene.characters);
}

export function buildLocationRulesForExecution(
  scene: MotionHandoffScene,
  locationMemory: SceneMemoryBundle["location"]
): string {
  if (locationMemory && scene.location?.id === locationMemory.id) {
    return buildLocationMemoryPromptLines(locationMemory).join("\n");
  }
  return buildLocationPrompt(scene.location);
}

export function buildPropRulesForExecution(
  scene: MotionHandoffScene,
  propMemory: SceneMemoryBundle["props"],
  storyCharacters: SceneMemoryBundle["characters"] = []
): string {
  const scenePropIds = new Set(scene.props.map((p) => p.id));
  const memoryMatches = propMemory.filter((p) => scenePropIds.has(p.id));
  if (memoryMatches.length > 0) {
    const characterNamesById = new Map(
      storyCharacters.map((character) => [character.id, character.name])
    );
    return buildPropMemoryPromptLines(memoryMatches, { characterNamesById }).join("\n");
  }
  return buildPropsPrompt(scene.props);
}

export function buildSceneExecutionPackage(
  scene: MotionHandoffScene,
  options: {
    directorProfile: string;
    storyMemory: SceneMemoryBundle;
    aiDirectorNotes?: string;
  }
): StudioSceneExecutionPackage {
  const bundle: SceneMemoryBundle = {
    characters: options.storyMemory.characters,
    location: options.storyMemory.location,
    props: options.storyMemory.props,
    world: options.storyMemory.world,
    continuityStrength: options.storyMemory.continuityStrength,
  };

  return {
    sceneId: scene.sceneId,
    prompt: scene.generatedPrompt.trim(),
    shotType: scene.shotType?.trim() ?? scene.studioContext.shotType?.trim() ?? "",
    cameraMovement:
      scene.cameraMovement?.trim() ?? scene.studioContext.cameraMovement?.trim() ?? "",
    sceneEnergy: scene.sceneEnergy?.trim() ?? scene.studioContext.sceneEnergy?.trim() ?? "",
    worldRules: buildWorldRulesForExecution(bundle.world, options.directorProfile),
    characterRules: buildCharacterRulesForExecution(scene, options.storyMemory.characters),
    locationRules: buildLocationRulesForExecution(scene, options.storyMemory.location),
    propRules: buildPropRulesForExecution(
      scene,
      options.storyMemory.props,
      options.storyMemory.characters
    ),
    continuityRules:
      scene.continuityPrompt.trim() ||
      buildContinuityPrompt({
        characters: scene.characters,
        location: scene.location,
        props: scene.props,
        memoryBundle: bundle,
      }),
    aiDirectorNotes: options.aiDirectorNotes?.trim() ?? "",
  };
}

/** Final Vidu-facing execution block — reuses Studio prompt output, adds explicit director/constraint layers. */
export function buildFinalExecutionPrompt(pkg: StudioSceneExecutionPackage): string {
  const directorBlock = buildDirectorCameraPrompt({
    shotType: pkg.shotType,
    cameraMovement: pkg.cameraMovement,
    sceneEnergy: pkg.sceneEnergy,
  });
  const directorEmphasis = [
    pkg.shotType ? buildShotTypePrompt(pkg.shotType) : "",
    pkg.cameraMovement ? buildCameraMovementPrompt(pkg.cameraMovement) : "",
    pkg.sceneEnergy ? buildSceneEnergyPrompt(pkg.sceneEnergy) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const constraintParts = [
    directorBlock || directorEmphasis
      ? `Director execution: ${directorBlock || directorEmphasis}`
      : "",
    pkg.worldRules ? `World: ${pkg.worldRules}` : "",
    pkg.characterRules ? `Characters: ${pkg.characterRules}` : "",
    pkg.locationRules ? `Location: ${pkg.locationRules}` : "",
    pkg.propRules ? `Props: ${pkg.propRules}` : "",
    pkg.continuityRules ? `Continuity: ${pkg.continuityRules}` : "",
    pkg.aiDirectorNotes ? `AI director: ${pkg.aiDirectorNotes}` : "",
  ].filter(Boolean);

  const primary = pkg.prompt.trim();
  if (!primary && constraintParts.length === 0) {
    return "";
  }
  if (!primary) {
    return truncateExecutionPrompt(constraintParts.join("\n\n"));
  }
  return truncateExecutionPrompt(
    joinBlocks([primary, ...constraintParts])
  );
}

export function buildStoryExecutionPackage(
  payload: MotionHandoffPayload
): StudioStoryExecutionPackage {
  const characterIds = new Set<string>();
  for (const scene of payload.scenes) {
    for (const ch of scene.characters) {
      characterIds.add(ch.id);
    }
  }
  return {
    worldName: payload.worldMemory?.name ?? null,
    directorProfile: payload.directorProfile,
    promptStyleProfile: payload.promptStyleProfile,
    characterCount: characterIds.size || payload.characterMemory.length,
    locationName: payload.locationMemory?.name ?? null,
    propCount: payload.propMemory.length,
    sceneCount: payload.scenes.length,
    aiDirectorNotes: "",
  };
}

export function attachExecutionToHandoffPayload(
  payload: MotionHandoffPayload,
  options?: { aiDirectorNotes?: string }
): MotionHandoffPayload {
  const storyMemory: SceneMemoryBundle = {
    characters: payload.characterMemory,
    location: payload.locationMemory,
    props: payload.propMemory,
    world: payload.worldMemory,
    continuityStrength: payload.continuityStrength,
  };
  const aiNotes = options?.aiDirectorNotes?.trim() ?? "";
  const executionPackage = {
    ...buildStoryExecutionPackage(payload),
    aiDirectorNotes: aiNotes,
  };

  const scenes = payload.scenes.map((scene) => {
    const sceneExecutionPackage = buildSceneExecutionPackage(scene, {
      directorProfile: payload.directorProfile,
      storyMemory,
      aiDirectorNotes: aiNotes,
    });
    const executionPrompt = buildFinalExecutionPrompt(sceneExecutionPackage);
    return {
      ...scene,
      sceneExecutionPackage,
      executionPrompt,
    };
  });

  const executionWarnings = validateStudioExecutionContinuity({
    ...payload,
    scenes,
  });
  const executionReadiness = computeExecutionReadiness({
    ...payload,
    scenes,
    executionPackage,
    executionWarnings,
  });

  return {
    ...payload,
    executionPackage,
    executionReadiness,
    executionWarnings,
    scenes,
  };
}

export function validateStudioExecutionContinuity(
  payload: MotionHandoffPayload
): StudioExecutionWarning[] {
  const warnings: StudioExecutionWarning[] = [];
  const sorted = [...payload.scenes].sort((a, b) => a.order - b.order);

  const outfitByCharacter = new Map<string, string>();
  const locationStyleById = new Map<string, string>();

  for (const scene of sorted) {
    for (const ch of scene.characters) {
      const key = ch.id;
      const outfit = [ch.description, ch.personality].filter(Boolean).join("|").trim();
      const prev = outfitByCharacter.get(key);
      if (prev && outfit && prev !== outfit) {
        warnings.push({
          code: "character_appearance_drift",
          message: `${ch.name} appearance notes differ from earlier scenes — verify outfit and face consistency.`,
          severity: "medium",
          sceneId: scene.sceneId,
        });
      } else if (outfit) {
        outfitByCharacter.set(key, outfit);
      }
      if (ch.role === "mascot" && !ch.description.trim()) {
        warnings.push({
          code: "mascot_description_missing",
          message: `${ch.name} mascot has no visual description — branding may drift.`,
          severity: "high",
          sceneId: scene.sceneId,
        });
      }
    }

    if (scene.location) {
      const locKey = scene.location.id;
      const style = scene.location.description.trim();
      const prev = locationStyleById.get(locKey);
      if (prev && style && prev !== style) {
        warnings.push({
          code: "location_style_drift",
          message: `Location "${scene.location.name}" description differs from earlier scenes.`,
          severity: "low",
          sceneId: scene.sceneId,
        });
      } else if (style) {
        locationStyleById.set(locKey, style);
      }
    }

    if (!scene.generatedPrompt.trim() && !scene.executionPrompt?.trim()) {
      warnings.push({
        code: "missing_execution_prompt",
        message: `Scene "${scene.title.trim() || scene.sceneId}" has no Studio execution prompt.`,
        severity: "high",
        sceneId: scene.sceneId,
      });
    }
  }

  if (!payload.worldMemory?.visualStyle?.trim()) {
    warnings.push({
      code: "world_style_missing",
      message: "World profile has no visual style — global tone may be inconsistent.",
      severity: "medium",
    });
  }

  for (const drift of payload.characterDriftWarnings.slice(0, 6)) {
    warnings.push({
      code: "studio_character_drift",
      message: drift,
      severity: "high",
    });
  }

  return warnings;
}

function tierFromScore(score: number): StudioExecutionReadinessTier {
  if (score >= 85) {
    return "strong";
  }
  if (score >= 70) {
    return "good";
  }
  if (score >= 50) {
    return "needs_review";
  }
  return "poor";
}

export function computeExecutionReadiness(payload: {
  scenes: MotionHandoffScene[];
  executionPackage?: StudioStoryExecutionPackage | null;
  executionWarnings?: StudioExecutionWarning[];
  worldMemory?: MotionHandoffPayload["worldMemory"];
  characterMemory?: MotionHandoffPayload["characterMemory"];
}): StudioExecutionReadiness {
  const scenes = payload.scenes;
  const sceneCount = Math.max(scenes.length, 1);

  const withPrompt = scenes.filter(
    (s) => s.generatedPrompt.trim().length > 40 || (s.executionPrompt?.trim().length ?? 0) > 40
  ).length;
  const promptQuality = Math.round((withPrompt / sceneCount) * 100);

  const withDirector = scenes.filter(
    (s) =>
      (s.shotType?.trim() || s.studioContext.shotType?.trim()) &&
      (s.cameraMovement?.trim() || s.studioContext.cameraMovement?.trim() || s.shotType?.trim())
  ).length;
  const directorCompleteness = Math.round((withDirector / sceneCount) * 100);

  const withCharacters = scenes.filter((s) => s.characters.length > 0).length;
  const memoryChars = payload.characterMemory?.length ?? 0;
  const characterCompleteness = Math.round(
    ((withCharacters / sceneCount) * 60 + (memoryChars > 0 ? 40 : 0))
  );

  const world = payload.worldMemory ?? null;
  const worldFields = [
    world?.visualStyle,
    world?.tone,
    world?.continuityRules,
    world?.name,
  ].filter((v) => v?.trim()).length;
  const worldCompleteness = Math.round((worldFields / 4) * 100);

  const continuitySignals =
    scenes.filter((s) => s.continuityPrompt.trim().length > 20).length +
    (payload.executionWarnings?.filter((w) => w.code.includes("drift")).length === 0 ? 1 : 0);
  const continuity = Math.min(
    100,
    Math.round((continuitySignals / (sceneCount + 1)) * 100)
  );

  const warningPenalty = Math.min(25, (payload.executionWarnings?.length ?? 0) * 3);
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        promptQuality * 0.3 +
          directorCompleteness * 0.2 +
          characterCompleteness * 0.2 +
          worldCompleteness * 0.15 +
          continuity * 0.15 -
          warningPenalty
      )
    )
  );

  return {
    score,
    tier: tierFromScore(score),
    promptQuality,
    continuity,
    directorCompleteness,
    characterCompleteness,
    worldCompleteness,
  };
}

export function resolveExecutionPromptsBySceneIndex(
  handoff: MotionHandoffPayload | null | undefined,
  sceneCount: number
): Array<string | null> {
  if (!handoff || handoff.version < 11) {
    return Array.from({ length: sceneCount }, () => null);
  }
  const sorted = [...handoff.scenes].sort((a, b) => a.order - b.order);
  return Array.from({ length: sceneCount }, (_, i) => {
    const scene = sorted[i];
    if (!scene) {
      return null;
    }
    const prompt =
      scene.executionPrompt?.trim() ||
      (scene.sceneExecutionPackage
        ? buildFinalExecutionPrompt(scene.sceneExecutionPackage)
        : "");
    return prompt || null;
  });
}

export function parseStoredMotionHandoffExecution(
  raw: unknown
): Pick<
  MotionHandoffPayload,
  "version" | "executionPackage" | "executionReadiness" | "executionWarnings" | "scenes"
> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const version =
    typeof row.version === "number" && Number.isFinite(row.version) ? row.version : 0;
  if (version < 11) {
    return null;
  }
  const scenes = Array.isArray(row.scenes) ? row.scenes : [];
  return {
    version: version as MotionHandoffPayload["version"],
    executionPackage: row.executionPackage as MotionHandoffPayload["executionPackage"],
    executionReadiness: row.executionReadiness as MotionHandoffPayload["executionReadiness"],
    executionWarnings: Array.isArray(row.executionWarnings)
      ? (row.executionWarnings as StudioExecutionWarning[])
      : [],
    scenes: scenes as MotionHandoffScene[],
  };
}
