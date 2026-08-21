/**
 * S2A — Unified Production Context resolver.
 * Loads from existing StudioStoryboardDetail (batch, no N+1).
 */

import { parseIdentityContinuityNotes } from "@/lib/studio-character-identity-fields";
import { parseCharacterReferencesBundle } from "@/lib/studio-character-canonical-references";
import {
  fingerprintMediaPointer,
  hashProductionFingerprint,
} from "@/lib/studio-production-fingerprint";
import { buildDirectorProfilePrompt } from "@/lib/studio-director-profiles";
import { buildStyleProfilePrompt, normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type {
  CompactProductionContextSnapshot,
  ProductionExactness,
  ProductionMissingIssue,
  ProductionReferenceAsset,
  SceneContinuityState,
  UnifiedProductionContext,
  UpcAudioPlan,
  UpcCharacter,
  UpcLocation,
  UpcProp,
  UpcScene,
  UpcStyleWorld,
} from "@/types/studio-unified-production-context";
import { UPC_VERSION } from "@/types/studio-unified-production-context";

export type ResolveUpcInput = {
  storyboard: StudioStoryboardDetail;
  worlds?: StudioWorldProfileListItem[];
  worldPicks?: Array<{
    id: string;
    name: string;
    description?: string | null;
    visualStyle?: string | null;
    tone?: string | null;
    continuityRules?: string | null;
    continuityStrength?: string | null;
  }>;
  source?: UnifiedProductionContext["source"];
  experienceId?: string | null;
  aspectRatio?: string | null;
  directorContribution?: {
    styleHint?: string | null;
    sceneIntents?: Record<string, string>;
  } | null;
};

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function parseForbidden(notes: string): string {
  return parseIdentityContinuityNotes(notes).forbiddenElements?.trim() ?? "";
}

function supportingUrlsFromCharacter(character: StudioCharacterListItem): Array<{ role: string; url: string }> {
  const { bundle } = parseCharacterReferencesBundle(character.referenceNotes);
  return bundle.supporting
    .filter((ref) => ref.status === "active" && ref.imageUrl.trim())
    .slice(0, 4)
    .map((ref) => ({ role: ref.role, url: ref.imageUrl.trim() }));
}

function propKind(category: string): UpcProp["kind"] {
  if (category === "brand_asset") {
    return "logo";
  }
  if (category === "packaging" || category === "food" || category === "drink") {
    return "product";
  }
  return "prop";
}

function propExactness(prop: StudioPropListItem): ProductionExactness {
  if (prop.category === "brand_asset" || prop.brandingRules.trim()) {
    return "MUST_PRESERVE";
  }
  if (prop.referenceImageUrl.trim()) {
    return "SHOULD_MATCH";
  }
  return "STYLE_REFERENCE_ONLY";
}

function pixelPreservedStill(scene: StudioSceneDetail, prop: StudioPropListItem): boolean {
  return scene.sceneImages.some(
    (image) =>
      image.status === "completed" &&
      (image.provider === "production_logo" || image.provider === "production_product") &&
      (image.generationSettings?.referenceAssets?.props ?? []).some((entry) => entry.id === prop.id)
  );
}

function mapCharacter(character: StudioCharacterListItem): UpcCharacter {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    textIdentity: {
      description: character.description,
      appearanceMemory: character.appearanceMemory,
      visualKeywords: character.visualKeywords,
      defaultClothing: character.defaultClothing,
      defaultAccessories: character.defaultAccessories,
      personality: character.personality,
      forbidden: parseForbidden(character.continuityNotes),
    },
    referenceIdentity: {
      primaryUrl: character.referenceImageUrl.trim() || null,
      supportingUrls: supportingUrlsFromCharacter(character),
    },
    voiceIdentity: {
      enabled: character.voiceEnabled,
      locked: character.voiceLock,
      provider: character.voiceProvider,
      profile: character.voiceProfile,
      language: character.voiceLanguage,
    },
    identityStrength: character.identityStrength,
    continuityStrength: character.continuityStrength,
    worldId: character.worldProfileId,
  };
}

function mapLocation(location: StudioLocationListItem): UpcLocation {
  return {
    id: location.id,
    name: location.name,
    category: location.category,
    visualIdentity: location.visualIdentity,
    environmentKeywords: location.environmentKeywords,
    worldMemory: location.worldMemory,
    forbidden: parseForbidden(location.continuityNotes),
    referenceUrl: location.referenceImageUrl.trim() || null,
    continuityStrength: location.continuityStrength,
  };
}

function mapProp(prop: StudioPropListItem, scenes: StudioSceneDetail[]): UpcProp {
  return {
    id: prop.id,
    name: prop.name,
    category: prop.category,
    kind: propKind(prop.category),
    visualDescription: [prop.description, prop.appearanceMemory].filter(Boolean).join(" ").trim(),
    brandingRules: prop.brandingRules,
    referenceUrl: prop.referenceImageUrl.trim() || null,
    exactness: propExactness(prop),
    pixelPreservedStill: scenes.some((scene) => pixelPreservedStill(scene, prop)),
    continuityStrength: prop.continuityStrength,
  };
}

function resolveWorld(
  storyboard: StudioStoryboardDetail,
  worlds: StudioWorldProfileListItem[] | undefined,
  worldPicks: ResolveUpcInput["worldPicks"]
): StudioWorldProfileListItem | null {
  const ids = uniq(
    [
      ...storyboard.scenes.flatMap((scene) => scene.characters.map((c) => c.worldProfileId)),
      ...storyboard.scenes.map((scene) => scene.location?.worldProfileId ?? null),
      ...storyboard.scenes.flatMap((scene) => scene.props.map((p) => p.worldProfileId)),
    ].filter((id): id is string => Boolean(id))
  );
  if (ids.length === 0) {
    return null;
  }
  const fromList = worlds?.find((world) => world.id === ids[0]);
  if (fromList) {
    return fromList;
  }
  const pick = worldPicks?.find((world) => world.id === ids[0]);
  if (pick) {
    return {
      id: pick.id,
      ownerId: storyboard.ownerId,
      name: pick.name,
      slug: pick.name.toLowerCase(),
      description: pick.description?.trim() ?? "",
      visualStyle: pick.visualStyle?.trim() ?? "",
      tone: pick.tone?.trim() ?? "",
      continuityRules: pick.continuityRules?.trim() ?? "",
      continuityStrength: (pick.continuityStrength as StudioWorldProfileListItem["continuityStrength"]) || "strong",
      createdAt: storyboard.createdAt,
      updatedAt: storyboard.updatedAt,
    };
  }
  const summary = storyboard.scenes
    .flatMap((scene) => [
      ...scene.characters.map((c) => c.worldProfile),
      scene.location?.worldProfile ?? null,
      ...scene.props.map((p) => p.worldProfile),
    ])
    .find((world) => world?.id === ids[0]);
  if (!summary) {
    return null;
  }
  return {
    id: summary.id,
    ownerId: storyboard.ownerId,
    name: summary.name,
    slug: summary.name.toLowerCase(),
    description: "",
    visualStyle: "",
    tone: "",
    continuityRules: "",
    continuityStrength: "strong",
    createdAt: storyboard.createdAt,
    updatedAt: storyboard.updatedAt,
  };
}

/**
 * Precedence: world visual identity > storyboard style > director profile > optional director hint.
 * Preset adjectives never override explicit storyboard/world fields.
 */
export function resolveUpcStyleWorld(input: {
  storyboard: StudioStoryboardDetail;
  world: StudioWorldProfileListItem | null;
  directorStyleHint?: string | null;
}): UpcStyleWorld {
  const storyboardStyleProfile = normalizeStudioPromptStyleProfile(input.storyboard.promptStyleProfile);
  const directorProfile = normalizeStudioDirectorProfile(input.storyboard.directorProfile);
  const worldVisualStyle = input.world?.visualStyle.trim() ?? "";
  const worldTone = input.world?.tone.trim() ?? "";
  const worldContinuityRules = input.world?.continuityRules.trim() ?? "";
  const forbiddenVisuals = worldContinuityRules
    ? worldContinuityRules
        .split(/[.;\n]/)
        .map((part) => part.trim())
        .filter((part) => /^(no |never |forbidden|avoid )/i.test(part))
    : [];

  const parts: string[] = [];
  const precedence: string[] = [];
  if (worldVisualStyle) {
    parts.push(worldVisualStyle);
    precedence.push("world.visualStyle");
  }
  if (worldTone) {
    parts.push(`Tone: ${worldTone}`);
    precedence.push("world.tone");
  }
  parts.push(buildStyleProfilePrompt(storyboardStyleProfile));
  precedence.push("storyboard.promptStyleProfile");
  parts.push(buildDirectorProfilePrompt(directorProfile));
  precedence.push("storyboard.directorProfile");
  if (input.directorStyleHint?.trim() && !worldVisualStyle) {
    parts.push(input.directorStyleHint.trim());
    precedence.push("director.hint");
  }

  return {
    storyboardStyleProfile,
    directorProfile,
    worldId: input.world?.id ?? null,
    worldName: input.world?.name ?? null,
    worldVisualStyle,
    worldTone,
    worldContinuityRules,
    forbiddenVisuals,
    resolvedSummary: parts.filter(Boolean).join(" "),
    precedence,
  };
}

function mentionsPlacement(text: string, propName: string): boolean {
  const hay = text.toLowerCase();
  const name = propName.toLowerCase();
  if (!hay.includes(name)) {
    return false;
  }
  return /\b(place|places|placed|put|puts|sets?|on the (counter|table|desk))\b/.test(hay);
}

function mentionsCarry(text: string, propName: string): boolean {
  const hay = text.toLowerCase();
  const name = propName.toLowerCase();
  if (!hay.includes(name)) {
    return false;
  }
  return /\b(hold|holds|holding|carry|carries|carrying|with)\b/.test(hay);
}

function mentionsClothingChange(text: string): boolean {
  return /\b(changes? (into|outfit|clothes|clothing)|new (outfit|jacket|dress)|wardrobe)\b/i.test(
    text
  );
}

function sceneText(scene: StudioSceneDetail): string {
  return [scene.title, scene.description, scene.action].filter(Boolean).join(" ");
}

function inferHeldProps(
  scene: StudioSceneDetail,
  previous: SceneContinuityState | null
): Record<string, string> {
  const held: Record<string, string> = { ...(previous?.heldPropByCharacterId ?? {}) };
  const text = sceneText(scene);
  const primaryCharacter = scene.characters[0];
  for (const prop of scene.props) {
    if (mentionsPlacement(text, prop.name) && primaryCharacter) {
      delete held[primaryCharacter.id];
      continue;
    }
    if (mentionsCarry(text, prop.name) && primaryCharacter) {
      held[primaryCharacter.id] = prop.id;
    }
  }
  return held;
}

export function inferSceneContinuity(params: {
  scene: StudioSceneDetail;
  previous: SceneContinuityState | null;
  previousScene: StudioSceneDetail | null;
  charactersById: Map<string, UpcCharacter>;
  propsById: Map<string, UpcProp>;
  locationsById: Map<string, UpcLocation>;
}): SceneContinuityState {
  const { scene, previous, previousScene } = params;
  const characterIds = scene.characters.map((c) => c.id);
  const locationId = scene.locationId ?? scene.location?.id ?? null;
  const sameLocation = Boolean(
    previous?.locationId && locationId && previous.locationId === locationId
  );
  const overlappingChars = characterIds.filter((id) => previous?.characterIds.includes(id));
  const continuesFromPrevious = Boolean(previous && (sameLocation || overlappingChars.length > 0));

  const wardrobeByCharacterId: Record<string, string> = {};
  for (const character of scene.characters) {
    const mapped = params.charactersById.get(character.id);
    const clothing = mapped?.textIdentity.defaultClothing.trim() ?? character.defaultClothing.trim();
    if (!clothing) {
      continue;
    }
    if (mentionsClothingChange(sceneText(scene))) {
      wardrobeByCharacterId[character.id] = clothing;
    } else if (previous?.wardrobeByCharacterId[character.id]) {
      wardrobeByCharacterId[character.id] = previous.wardrobeByCharacterId[character.id]!;
    } else {
      wardrobeByCharacterId[character.id] = clothing;
    }
  }

  const linkedPropIds = scene.props.map((p) => p.id);
  const carriedFromPrevious = (previous?.carriedPropIds ?? []).filter((id) =>
    linkedPropIds.includes(id)
  );
  const held = inferHeldProps(scene, previous);
  const carriedPropIds = uniq([
    ...carriedFromPrevious,
    ...linkedPropIds.filter((id) => Object.values(held).includes(id)),
  ]);

  const enteringNotes: string[] = [];
  if (continuesFromPrevious && previousScene) {
    enteringNotes.push(`Continues from previous scene (${previousScene.title || previousScene.id}).`);
  }
  if (sameLocation && locationId) {
    const loc = params.locationsById.get(locationId);
    enteringNotes.push(`Same location: ${loc?.name ?? locationId}.`);
  }
  for (const characterId of overlappingChars) {
    const character = params.charactersById.get(characterId);
    const wardrobe = wardrobeByCharacterId[characterId];
    if (character && wardrobe && !mentionsClothingChange(sceneText(scene))) {
      enteringNotes.push(`${character.name} wears the same ${wardrobe}.`);
    }
  }
  for (const [characterId, propId] of Object.entries(previous?.heldPropByCharacterId ?? {})) {
    if (!characterIds.includes(characterId)) {
      continue;
    }
    const character = params.charactersById.get(characterId);
    const prop = params.propsById.get(propId);
    if (!character || !prop) {
      continue;
    }
    if (mentionsPlacement(sceneText(scene), prop.name)) {
      enteringNotes.push(`${character.name} still has ${prop.name} from the previous scene.`);
    } else if (linkedPropIds.includes(propId)) {
      enteringNotes.push(`${character.name} still holds ${prop.name}.`);
    }
  }

  const exitingNotes: string[] = [];
  for (const [characterId, propId] of Object.entries(held)) {
    const character = params.charactersById.get(characterId);
    const prop = params.propsById.get(propId);
    if (character && prop) {
      if (mentionsPlacement(sceneText(scene), prop.name)) {
        exitingNotes.push(`${prop.name} is placed and remains in this location.`);
      } else {
        exitingNotes.push(`${character.name} holds ${prop.name}.`);
      }
    }
  }
  if (locationId) {
    const loc = params.locationsById.get(locationId);
    exitingNotes.push(`Location remains ${loc?.name ?? locationId}.`);
  }

  return {
    enteringNotes,
    exitingNotes,
    carriedPropIds,
    characterIds,
    wardrobeByCharacterId,
    heldPropByCharacterId: held,
    locationId,
    continuesFromPrevious,
  };
}

function sceneHashPayload(scene: UpcScene): unknown {
  return {
    sceneId: scene.sceneId,
    order: scene.order,
    title: scene.title,
    description: scene.description,
    action: scene.action,
    emotion: scene.emotion,
    camera: scene.camera,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    locationId: scene.locationId,
    characterIds: scene.characterIds,
    propIds: scene.propIds,
    continuity: scene.continuity,
    selectedImageId: scene.selectedImageId,
  };
}

function collectReferences(
  characters: UpcCharacter[],
  locations: UpcLocation[],
  props: UpcProp[]
): ProductionReferenceAsset[] {
  const refs: ProductionReferenceAsset[] = [];
  for (const character of characters) {
    refs.push({
      entityId: character.id,
      entityKind: "character",
      label: character.name,
      role: "primary",
      url: character.referenceIdentity.primaryUrl,
      exactness: "SHOULD_MATCH",
    });
    for (const supporting of character.referenceIdentity.supportingUrls) {
      refs.push({
        entityId: character.id,
        entityKind: "character",
        label: character.name,
        role: supporting.role,
        url: supporting.url,
        exactness: "STYLE_REFERENCE_ONLY",
      });
    }
  }
  for (const location of locations) {
    refs.push({
      entityId: location.id,
      entityKind: "location",
      label: location.name,
      role: "primary",
      url: location.referenceUrl,
      exactness: "SHOULD_MATCH",
    });
  }
  for (const prop of props) {
    refs.push({
      entityId: prop.id,
      entityKind: prop.kind === "logo" ? "logo" : prop.kind === "product" ? "product" : "prop",
      label: prop.name,
      role: "primary",
      url: prop.referenceUrl,
      exactness: prop.exactness,
    });
  }
  return refs.filter((ref) => ref.url);
}

export function resolveUnifiedProductionContext(input: ResolveUpcInput): UnifiedProductionContext {
  const storyboard = input.storyboard;
  const scenesSorted = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const characters = new Map<string, UpcCharacter>();
  const locations = new Map<string, UpcLocation>();
  const props = new Map<string, UpcProp>();
  const issues: ProductionMissingIssue[] = [];

  for (const scene of scenesSorted) {
    for (const character of scene.characters) {
      if (!characters.has(character.id)) {
        characters.set(character.id, mapCharacter(character));
      }
    }
    if (scene.location) {
      if (!locations.has(scene.location.id)) {
        locations.set(scene.location.id, mapLocation(scene.location));
      }
    } else if (scene.locationId) {
      issues.push({
        class: "HARD_MISSING",
        entityKind: "location",
        entityId: scene.locationId,
        sceneId: scene.id,
        message: "Scene references a location that is not loaded.",
      });
    }
    for (const prop of scene.props) {
      if (!props.has(prop.id)) {
        props.set(prop.id, mapProp(prop, scenesSorted));
      }
    }
  }

  const world = resolveWorld(storyboard, input.worlds, input.worldPicks);
  const style = resolveUpcStyleWorld({
    storyboard,
    world,
    directorStyleHint: input.directorContribution?.styleHint,
  });

  let previousContinuity: SceneContinuityState | null = null;
  let previousScene: StudioSceneDetail | null = null;
  const upcScenes: UpcScene[] = [];

  for (const scene of scenesSorted) {
    const continuity = inferSceneContinuity({
      scene,
      previous: previousContinuity,
      previousScene,
      charactersById: characters,
      propsById: props,
      locationsById: locations,
    });
    const sceneIssues: ProductionMissingIssue[] = [];
    if (scene.locationId && !scene.location) {
      sceneIssues.push({
        class: "HARD_MISSING",
        entityKind: "location",
        entityId: scene.locationId,
        sceneId: scene.id,
        message: "Linked location is missing from the scene payload.",
      });
    }
    for (const character of scene.characters) {
      if (!character.referenceImageUrl.trim()) {
        sceneIssues.push({
          class: "OPTIONAL_MISSING",
          entityKind: "character",
          entityId: character.id,
          sceneId: scene.id,
          message: `${character.name} has no primary reference image.`,
        });
      }
    }

    const selected = scene.sceneImages.find((image) => image.id === scene.selectedSceneImageId)
      ?? scene.sceneImages.find((image) => image.status === "completed")
      ?? null;

    const upcScene: UpcScene = {
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      description: scene.description,
      action: scene.action,
      emotion: scene.emotion,
      camera: scene.camera,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: scene.sceneEnergy,
      durationSeconds: scene.durationSeconds,
      dialogue: storyboard.voiceNarrationScript.trim() && scene.order === 0
        ? storyboard.voiceNarrationScript
        : "",
      locationId: scene.locationId ?? scene.location?.id ?? null,
      characterIds: scene.characters.map((c) => c.id),
      propIds: scene.props.map((p) => p.id),
      transitionToNext: scene.transitionToNext,
      selectedImageId: selected?.id ?? scene.selectedSceneImageId,
      selectedImageUrl: selected?.imageUrl?.trim() || null,
      generatedPrompt: selected?.generatedPrompt?.trim() || null,
      promptVersion: selected?.promptVersion ?? null,
      generationVersion: selected?.generationVersion ?? null,
      continuity,
      sceneContextHash: "",
      issues: sceneIssues,
    };
    upcScene.sceneContextHash = hashProductionFingerprint(sceneHashPayload(upcScene));
    upcScenes.push(upcScene);
    previousContinuity = {
      ...continuity,
      exitingNotes: continuity.exitingNotes,
    };
    previousScene = scene;
    issues.push(...sceneIssues);
  }

  const audioPlan: UpcAudioPlan = {
    voiceEnabled: storyboard.voiceEnabled,
    voiceLanguage: storyboard.voiceLanguage,
    voiceProfile: storyboard.voiceProfile,
    musicEnabled: storyboard.musicEnabled,
    musicStyle: storyboard.musicStyle,
    soundEnabled: storyboard.soundEnabled,
    soundStyle: storyboard.soundStyle,
    mixSemantics: "static_beds_not_timeline",
  };

  const characterList = [...characters.values()];
  const locationList = [...locations.values()];
  const propList = [...props.values()];
  const references = collectReferences(characterList, locationList, propList);

  const durationIntentSeconds = upcScenes.reduce((sum, scene) => sum + (scene.durationSeconds || 0), 0);

  const context: UnifiedProductionContext = {
    version: UPC_VERSION,
    upcHash: "",
    project: {
      storyboardId: storyboard.id,
      title: storyboard.title,
      description: storyboard.description,
      language: storyboard.voiceLanguage || "en",
      experienceId: input.experienceId ?? null,
      intendedOutput: "storyboard_video",
      durationIntentSeconds: durationIntentSeconds || null,
      aspectRatio: input.aspectRatio ?? null,
      commercialContext: propList.some((prop) => prop.kind === "logo" || prop.kind === "product"),
    },
    style,
    characters: characterList,
    locations: locationList,
    props: propList,
    scenes: upcScenes,
    audioPlan,
    references,
    issues,
    source: input.source ?? "workspace",
  };

  context.upcHash = hashProductionFingerprint({
    version: context.version,
    project: context.project,
    style: {
      storyboardStyleProfile: style.storyboardStyleProfile,
      directorProfile: style.directorProfile,
      worldId: style.worldId,
      worldVisualStyle: style.worldVisualStyle,
    },
    characters: characterList.map((c) => ({
      id: c.id,
      clothing: c.textIdentity.defaultClothing,
      appearance: c.textIdentity.appearanceMemory,
      ref: fingerprintMediaPointer(c.referenceIdentity.primaryUrl),
    })),
    locations: locationList.map((l) => ({
      id: l.id,
      visual: l.visualIdentity,
      ref: fingerprintMediaPointer(l.referenceUrl),
    })),
    props: propList.map((p) => ({
      id: p.id,
      kind: p.kind,
      exactness: p.exactness,
      ref: fingerprintMediaPointer(p.referenceUrl),
    })),
    scenes: upcScenes.map((s) => s.sceneContextHash),
    audio: audioPlan,
  });

  return context;
}

export function compactProductionContextSnapshot(
  upc: UnifiedProductionContext
): CompactProductionContextSnapshot {
  return {
    productionContextVersion: upc.version,
    upcHash: upc.upcHash,
    storyboardId: upc.project.storyboardId,
    scenes: upc.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      order: scene.order,
      sceneContextHash: scene.sceneContextHash,
      characterIds: scene.characterIds,
      locationId: scene.locationId,
      propIds: scene.propIds,
      carriedPropIds: scene.continuity.carriedPropIds,
      referenceEntityIds: upc.references
        .filter((ref) => {
          if (ref.entityKind === "character") {
            return scene.characterIds.includes(ref.entityId);
          }
          if (ref.entityKind === "location") {
            return scene.locationId === ref.entityId;
          }
          return scene.propIds.includes(ref.entityId);
        })
        .map((ref) => ref.entityId),
    })),
  };
}

export function isSceneContextStale(params: {
  storedUpcHash?: string | null;
  storedSceneContextHash?: string | null;
  current: UnifiedProductionContext;
  sceneId: string;
}): boolean {
  const scene = params.current.scenes.find((entry) => entry.sceneId === params.sceneId);
  if (!scene) {
    return true;
  }
  if (params.storedSceneContextHash && params.storedSceneContextHash !== scene.sceneContextHash) {
    return true;
  }
  if (params.storedUpcHash && params.storedUpcHash !== params.current.upcHash) {
    return true;
  }
  return false;
}

export function getUpcScene(upc: UnifiedProductionContext, sceneId: string): UpcScene | null {
  return upc.scenes.find((scene) => scene.sceneId === sceneId) ?? null;
}
