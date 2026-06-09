import {
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromLocation,
  extractAssetSemanticRecordFromProp,
  extractAssetSemanticRecordFromWorld,
  hashSemanticText,
  variantAuditScoresFromRecord,
} from "@/lib/studio-asset-semantic-record";
import {
  formatBodySummary,
  formatCharacterConstructionSummary,
  formatPostureSummary,
} from "@/lib/studio-asset-animation-readiness";
import { formatPlacementSummary } from "@/lib/studio-asset-reference-placement";
import { scoreMotionCharacterReferencePreference } from "@/lib/studio-asset-character-evolution";
import { resolveIdentityProfileMotionGuidance } from "@/lib/studio-asset-identity-profile";
import { formatIdentityFingerprintSummary } from "@/lib/studio-asset-identity-preservation";
import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { StudioStoryboardSceneRow } from "@/server/studio/studio-storyboard-service";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import {
  SCENE_SEMANTIC_RECIPE_VERSION,
  type SceneCrossAssetRelation,
  type ScenePromptLineage,
  type SceneSemanticRecipe,
  type SceneSemanticRecipeAssetRef,
} from "@/types/studio-scene-semantic-recipe";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

function toCharacterRef(
  character: StudioStoryboardSceneRow["characters"][number]["character"]
): SceneSemanticRecipeAssetRef {
  const record = extractAssetSemanticRecordFromCharacter(character);
  return {
    assetId: character.id,
    kind: "character",
    name: character.name,
    objectType: record.objectType,
    brandIdentity: record.brandIdentity,
    visualStyle: record.visualStyle,
    shapeDna: record.shapeDna?.join(", "),
    keyFeatures: record.keyFeatures,
    preserveRules: record.preserveRules,
    continuityNotes: record.continuityNotes,
    assetFamily: record.assetFamily,
    identityFingerprintSummary: record.identityFingerprint
      ? formatIdentityFingerprintSummary(record.identityFingerprint)
      : undefined,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
    ...variantAuditScoresFromRecord(record),
    animationReadinessScore: record.animationReadinessScore,
    characterConstructionSummary: formatCharacterConstructionSummary(record.characterConstructionProfile),
    postureSummary: formatPostureSummary(record.characterConstructionProfile),
    bodySummary: formatBodySummary(record.characterConstructionProfile),
    referencePlacementSummary: record.referencePlacements?.length
      ? record.referencePlacements.map(formatPlacementSummary).join("; ")
      : undefined,
  };
}

function toPropRef(prop: StudioStoryboardSceneRow["props"][number]["prop"]): SceneSemanticRecipeAssetRef {
  const record = extractAssetSemanticRecordFromProp(prop);
  return {
    assetId: prop.id,
    kind: "prop",
    name: prop.name,
    brandIdentity: record.brandIdentity,
    visualStyle: record.visualStyle,
    keyFeatures: record.keyFeatures,
    preserveRules: record.preserveRules,
    assetFamily: record.assetFamily,
    identityFingerprintSummary: record.identityFingerprint
      ? formatIdentityFingerprintSummary(record.identityFingerprint)
      : undefined,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
    variantIdentityScore: record.variantIdentityScore ?? record.variantFidelityOverall,
    variantFamilyScore: record.variantFamilyScore,
    variantBrandScore: record.variantBrandScore,
    variantShapeMarkerScore: record.variantShapeMarkerScore,
  };
}

function toLocationRef(
  location: NonNullable<StudioStoryboardSceneRow["location"]>
): SceneSemanticRecipeAssetRef {
  const record = extractAssetSemanticRecordFromLocation(location);
  return {
    assetId: location.id,
    kind: "location",
    name: location.name,
    visualStyle: record.visualStyle,
    keyFeatures: record.keyFeatures,
    preserveRules: record.preserveRules,
    continuityNotes: record.continuityNotes,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
    ...variantAuditScoresFromRecord(record),
  };
}

function toWorldRef(
  world: NonNullable<StudioStoryboardSceneRow["location"]>["worldProfile"] | null | undefined
): SceneSemanticRecipeAssetRef | undefined {
  if (!world) {
    return undefined;
  }
  const record = extractAssetSemanticRecordFromWorld(world);
  return {
    assetId: world.id,
    kind: "world",
    name: world.name,
    visualStyle: record.visualStyle ?? world.visualStyle,
    preserveRules: record.preserveRules,
    continuityNotes: world.continuityRules,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
    ...variantAuditScoresFromRecord(record),
  };
}

function buildCrossAssetRelations(params: {
  characters: SceneSemanticRecipeAssetRef[];
  props: SceneSemanticRecipeAssetRef[];
  location?: SceneSemanticRecipeAssetRef;
  world?: SceneSemanticRecipeAssetRef;
}): SceneCrossAssetRelation[] {
  const relations: SceneCrossAssetRelation[] = [];
  for (const character of params.characters) {
    for (const prop of params.props) {
      relations.push({
        type: "character_prop",
        fromId: character.assetId,
        toId: prop.assetId,
        label: `${character.name} with ${prop.name}`,
      });
      if (prop.brandIdentity) {
        relations.push({
          type: "prop_brand",
          fromId: prop.assetId,
          toId: character.assetId,
          label: prop.brandIdentity,
        });
      }
    }
    if (params.location) {
      relations.push({
        type: "character_location",
        fromId: character.assetId,
        toId: params.location.assetId,
        label: `${character.name} in ${params.location.name}`,
      });
    }
    if (params.world) {
      relations.push({
        type: "character_world",
        fromId: character.assetId,
        toId: params.world.assetId,
        label: `${character.name} in ${params.world.name} world`,
      });
    }
  }
  if (params.location && params.world) {
    relations.push({
      type: "location_world",
      fromId: params.location.assetId,
      toId: params.world.assetId,
      label: `${params.location.name} in ${params.world.name}`,
    });
  }
  return relations;
}

export function buildScenePromptLineage(params: {
  sceneId: string;
  selectedSceneImageId: string | null;
  generatedPrompt: string;
  promptVersion: number | null;
  summarySource: ScenePromptLineage["summarySource"];
}): ScenePromptLineage {
  return {
    selectedSceneImageId: params.selectedSceneImageId,
    promptHash: hashSemanticText(`${params.sceneId}:${params.generatedPrompt}`),
    promptVersion: params.promptVersion,
    semanticRecipeVersion: SCENE_SEMANTIC_RECIPE_VERSION,
    summarySource: params.summarySource,
    handoffVersion: MOTION_HANDOFF_PAYLOAD_VERSION,
  };
}

export function buildSceneSemanticRecipe(params: {
  row: StudioStoryboardSceneRow;
  memoryBundle?: SceneMemoryBundle | null;
  generatedPrompt: string;
  promptLineage: ScenePromptLineage;
  visualStyleProfile?: string;
}): SceneSemanticRecipe {
  const { row, memoryBundle, generatedPrompt, promptLineage, visualStyleProfile } = params;

  const characters = row.characters
    .map((link) => ({
      ref: toCharacterRef(link.character),
      preference: scoreMotionCharacterReferencePreference(
        extractAssetSemanticRecordFromCharacter(link.character)
      ),
    }))
    .sort((a, b) => b.preference - a.preference)
    .map((entry) => entry.ref);
  const props = row.props.map((link) => toPropRef(link.prop));
  const location = row.location ? toLocationRef(row.location) : undefined;
  const worldProfile =
    row.location?.worldProfile ?? row.characters[0]?.character.worldProfile ?? null;
  const world = toWorldRef(worldProfile);

  const assetRefs: Array<SceneSemanticRecipeAssetRef | undefined> = [
    ...characters,
    ...props,
    location,
    world,
  ];
  const preserveRules = [
    ...new Set(
      assetRefs.flatMap((ref) => ref?.preserveRules ?? []).filter(Boolean)
    ),
  ];

  const recipeCore = {
    version: SCENE_SEMANTIC_RECIPE_VERSION,
    sceneId: row.id,
    narrativeGoal: [row.title, row.description, row.action].filter(Boolean).join(" — "),
    emotion: row.emotion,
    visualStyle: visualStyleProfile,
    preserveRules,
    continuityRules: memoryBundle?.world?.continuityRules ?? world?.continuityNotes,
    keyFeatures: [
      ...characters.flatMap((c) => c.keyFeatures ?? []),
      ...props.flatMap((p) => p.keyFeatures ?? []),
    ].slice(0, 8),
    characters,
    props,
    location,
    world,
    audio: {
      sceneEmotion: row.emotion,
      sceneEnergy: row.sceneEnergy,
      voiceIdentity: row.voicePriority || undefined,
      narrativeImportance: row.audioFocus || undefined,
    },
    crossAssetRelations: buildCrossAssetRelations({ characters, props, location, world }),
    promptLineage,
    assetFamily: characters[0]?.assetFamily ?? props[0]?.assetFamily,
    brandIdentity: characters[0]?.brandIdentity ?? props[0]?.brandIdentity,
    identityFingerprintSummary: characters[0]?.identityFingerprintSummary,
  };

  return {
    ...recipeCore,
    recipeId: hashSemanticText(JSON.stringify(recipeCore) + generatedPrompt.slice(0, 200)),
  };
}

function collectRecipeAssetRefs(recipe: SceneSemanticRecipe): SceneSemanticRecipeAssetRef[] {
  return [
    ...recipe.characters,
    ...recipe.props,
    ...(recipe.location ? [recipe.location] : []),
    ...(recipe.world ? [recipe.world] : []),
  ];
}

function collectIdentityProfileMotionGuidance(recipe: SceneSemanticRecipe): string[] {
  const profiles = new Map<string, IdentityProfileLevel>();
  for (const ref of collectRecipeAssetRefs(recipe)) {
    if (ref.identityProfile) {
      profiles.set(ref.identityProfile, ref.identityProfile as IdentityProfileLevel);
    }
  }
  return [...profiles.values()]
    .map((level) => resolveIdentityProfileMotionGuidance(level))
    .filter(Boolean)
    .map((guidance) => `Profile guidance: ${guidance}`);
}

function collectAnimationReadinessMotionLines(recipe: SceneSemanticRecipe): string[] {
  const lines: string[] = [];
  const scores = collectRecipeAssetRefs(recipe)
    .filter((ref) => typeof ref.animationReadinessScore === "number")
    .map((ref) => `${ref.name}=${ref.animationReadinessScore}%`);
  if (scores.length) {
    lines.push(`Animation readiness: ${scores.join(", ")}.`);
  }
  for (const ref of collectRecipeAssetRefs(recipe)) {
    const summary = [
      ref.characterConstructionSummary,
      ref.bodySummary ? `Body: ${ref.bodySummary}` : "",
      ref.postureSummary ? `Posture: ${ref.postureSummary}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (summary) {
      lines.push(`Character construction (${ref.name}): ${summary}.`);
    }
  }
  return lines.filter(Boolean);
}

function formatRecipeIdentityAssetTypes(recipe: SceneSemanticRecipe): string {
  const refs = collectRecipeAssetRefs(recipe).filter((ref) => ref.identityAssetType?.trim());
  if (refs.length === 0) {
    return "";
  }
  return `Asset types: ${refs.map((ref) => `${ref.name}=${ref.identityAssetType}`).join(", ")}.`;
}

export function formatSceneSemanticRecipeForMotion(recipe: SceneSemanticRecipe): string {
  const lines = [
    recipe.narrativeGoal ? `Goal: ${recipe.narrativeGoal}.` : "",
    recipe.emotion ? `Emotion: ${recipe.emotion}.` : "",
    recipe.visualStyle ? `Style: ${recipe.visualStyle}.` : "",
    recipe.characters.length
      ? `Characters: ${recipe.characters.map((c) => [c.name, c.brandIdentity, c.visualStyle].filter(Boolean).join(" / ")).join("; ")}.`
      : "",
    recipe.location ? `Location: ${recipe.location.name}${recipe.location.visualStyle ? ` (${recipe.location.visualStyle})` : ""}.` : "",
    recipe.world ? `World: ${recipe.world.name}.` : "",
    recipe.props.length ? `Props: ${recipe.props.map((p) => p.name).join(", ")}.` : "",
    recipe.preserveRules?.length ? `Preserve: ${recipe.preserveRules.join(", ")}.` : "",
    recipe.brandIdentity ? `Brand identity: ${recipe.brandIdentity}.` : "",
    recipe.assetFamily ? `Asset family: ${recipe.assetFamily}.` : "",
    recipe.identityFingerprintSummary ? `Identity: ${recipe.identityFingerprintSummary}.` : "",
    collectRecipeAssetRefs(recipe).some((ref) => ref.identityProfile)
      ? `Identity profile: ${collectRecipeAssetRefs(recipe)
          .filter((ref) => ref.identityProfile)
          .map((ref) => `${ref.name}=${ref.identityProfile}`)
          .join(", ")}.`
      : "",
    collectRecipeAssetRefs(recipe).some((ref) => ref.identityImportance)
      ? `Identity importance: ${collectRecipeAssetRefs(recipe)
          .filter((ref) => ref.identityImportance)
          .map((ref) => `${ref.name}=${ref.identityImportance}`)
          .join(", ")}.`
      : "",
    recipe.characters.some((c) => c.referencePlacementSummary)
      ? `Reference placements: ${recipe.characters
          .filter((c) => c.referencePlacementSummary)
          .map((c) => `${c.name}: ${c.referencePlacementSummary}`)
          .join("; ")}. Exact brand placements must remain visible and undistorted.`
      : "",
    formatRecipeIdentityAssetTypes(recipe),
    ...collectAnimationReadinessMotionLines(recipe),
    ...collectIdentityProfileMotionGuidance(recipe),
    recipe.continuityRules ? `Continuity: ${recipe.continuityRules}.` : "",
    recipe.keyFeatures?.length ? `Key features: ${recipe.keyFeatures.join(", ")}.` : "",
    recipe.audio?.sceneEnergy ? `Energy: ${recipe.audio.sceneEnergy}.` : "",
  ].filter(Boolean);
  return lines.join(" ");
}
