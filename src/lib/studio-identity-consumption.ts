/**
 * Studio V2 — Identity Consumption Layer.
 * Reads existing Identity Spec Engine output and feeds downstream planners (no new engine).
 */

import {
  buildCharacterIdentityVisualProductionLines,
  resolveCharacterIdentityShotHintFromCharacter,
} from "@/lib/studio-character-identity-visual-hints";
import {
  buildLocationIdentityVisualProductionLines,
  resolveLocationIdentityShotHintFromLocation,
} from "@/lib/studio-location-identity-visual-hints";
import {
  buildPropIdentityVisualProductionLines,
  resolvePropIdentityShotHintFromProp,
} from "@/lib/studio-prop-identity-visual-hints";
import {
  buildWorldIdentityAudioProductionLines,
  buildWorldIdentityRulePresence,
  buildWorldIdentityVisualProductionLines,
  resolveWorldIdentityShotHint,
} from "@/lib/studio-world-identity-visual-hints";
import {
  collectSceneIdentitySpecs,
  identityCompleteness,
  toIdentitySpec,
  type SceneIdentitySpecBundle,
} from "@/lib/studio-identity-spec-engine";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { IdentitySpec, IdentitySpecKind } from "@/types/studio-identity-spec";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

export type IdentityConsumptionCompletenessStatus = "complete" | "almost" | "missing";

export type IdentityConsumptionAssetSummary = {
  id: string;
  kind: IdentitySpecKind;
  name: string;
  completenessScore: number;
  completenessStatus: IdentityConsumptionCompletenessStatus;
  ruleCount: number;
};

export type IdentityConsumptionRationale = {
  id: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
  sourceKind: IdentitySpecKind;
  sourceName: string;
  tool?: StudioToolId;
};

export type IdentityConsumptionConsistencyCheck = {
  id: string;
  kind: IdentitySpecKind;
  name: string;
  status: "pass" | "partial" | "missing";
  messageKey: string;
};

export type IdentityConsumptionTrend = {
  id: string;
  messageKey: string;
  label: string;
  count: number;
};

export type SceneIdentityConsumption = {
  sceneId: string;
  sceneOrder: number;
  shotHint: {
    preferredShotTypes: StudioShotType[];
    rationaleKey: string;
    sourceName: string;
    sourceKind: IdentitySpecKind;
  } | null;
  visualLines: string[];
  audioLines: string[];
  rationales: IdentityConsumptionRationale[];
  assets: IdentityConsumptionAssetSummary[];
};

export type StoryboardIdentityConsumption = {
  dominantWorldName: string | null;
  assetSummaries: IdentityConsumptionAssetSummary[];
  completenessChecks: Array<{
    id: string;
    messageKey: string;
    passed: boolean;
    assetName: string;
    kind: IdentitySpecKind;
  }>;
  consistencyChecks: IdentityConsumptionConsistencyCheck[];
  trends: IdentityConsumptionTrend[];
  sceneConsumptions: SceneIdentityConsumption[];
  directorContextLines: string[];
  visualProductionLines: string[];
  audioProductionLines: string[];
  rationales: IdentityConsumptionRationale[];
};

export type IdentityConsumptionLibraries = {
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
};

const COMPLETENESS_ALMOST = 50;
const COMPLETENESS_COMPLETE = 85;

export function completenessStatusFromScore(
  score: number
): IdentityConsumptionCompletenessStatus {
  if (score >= COMPLETENESS_COMPLETE) return "complete";
  if (score >= COMPLETENESS_ALMOST) return "almost";
  return "missing";
}

export function summarizeIdentitySpec(spec: IdentitySpec): IdentityConsumptionAssetSummary {
  const score = identityCompleteness(spec);
  const visualLines =
    spec.kind === "character" ? buildCharacterIdentityVisualProductionLines(spec)
    : spec.kind === "location" ? buildLocationIdentityVisualProductionLines(spec)
    : spec.kind === "prop" ? buildPropIdentityVisualProductionLines(spec)
    : buildWorldIdentityVisualProductionLines(spec);

  return {
    id: spec.id,
    kind: spec.kind,
    name: spec.name,
    completenessScore: score,
    completenessStatus: completenessStatusFromScore(score),
    ruleCount: visualLines.length,
  };
}

function entityForSpec(
  spec: IdentitySpec,
  libraries: IdentityConsumptionLibraries
): StudioCharacterListItem | StudioLocationListItem | StudioPropListItem | StudioWorldProfileListItem | null {
  switch (spec.kind) {
    case "character":
      return libraries.characters.find((c) => c.id === spec.id) ?? null;
    case "location":
      return libraries.locations.find((l) => l.id === spec.id) ?? null;
    case "prop":
      return libraries.props.find((p) => p.id === spec.id) ?? null;
    case "world":
      return libraries.worlds.find((w) => w.id === spec.id) ?? null;
  }
}

export function resolveSceneIdentityShotBias(params: {
  bundle: SceneIdentitySpecBundle;
  libraries: IdentityConsumptionLibraries;
}): SceneIdentityConsumption["shotHint"] {
  const { bundle, libraries } = params;

  for (const worldSpec of bundle.worlds) {
    const world = libraries.worlds.find((w) => w.id === worldSpec.id);
    const hint = resolveWorldIdentityShotHint(world ?? null);
    if (hint) {
      return {
        preferredShotTypes: hint.preferredShotTypes,
        rationaleKey: hint.rationaleKey,
        sourceName: worldSpec.name,
        sourceKind: "world",
      };
    }
  }

  if (bundle.location) {
    const location = libraries.locations.find((l) => l.id === bundle.location!.id);
    const hint = resolveLocationIdentityShotHintFromLocation(location ?? null);
    if (hint) {
      return {
        preferredShotTypes: hint.preferredShotTypes,
        rationaleKey: hint.rationaleKey,
        sourceName: bundle.location.name,
        sourceKind: "location",
      };
    }
  }

  for (const characterSpec of bundle.characters) {
    const character = libraries.characters.find((c) => c.id === characterSpec.id);
    const hint = resolveCharacterIdentityShotHintFromCharacter(character ?? null);
    if (hint) {
      return {
        preferredShotTypes: hint.preferredShotTypes,
        rationaleKey: hint.rationaleKey,
        sourceName: characterSpec.name,
        sourceKind: "character",
      };
    }
  }

  for (const propSpec of bundle.props) {
    const prop = libraries.props.find((p) => p.id === propSpec.id);
    const hint = resolvePropIdentityShotHintFromProp(prop ?? null);
    if (hint) {
      return {
        preferredShotTypes: hint.preferredShotTypes,
        rationaleKey: hint.rationaleKey,
        sourceName: propSpec.name,
        sourceKind: "prop",
      };
    }
  }

  return null;
}

export function identityConsumptionRationaleKeyForKind(
  kind: IdentitySpecKind
): string {
  switch (kind) {
    case "character":
      return "studio.identityConsumption.rationale.characterIdentity";
    case "location":
      return "studio.identityConsumption.rationale.locationIdentity";
    case "prop":
      return "studio.identityConsumption.rationale.propAction";
    case "world":
      return "studio.identityConsumption.rationale.worldRules";
  }
}

function buildRationale(
  id: string,
  reasonKey: string,
  sourceKind: IdentitySpecKind,
  sourceName: string,
  reasonParams?: Record<string, string>,
  tool?: StudioToolId
): IdentityConsumptionRationale {
  return { id, reasonKey, reasonParams, sourceKind, sourceName, tool };
}

function buildSceneVisualLines(bundle: SceneIdentitySpecBundle): string[] {
  const lines: string[] = [];
  for (const world of bundle.worlds) {
    lines.push(...buildWorldIdentityVisualProductionLines(world));
  }
  if (bundle.location) {
    lines.push(...buildLocationIdentityVisualProductionLines(bundle.location));
  }
  for (const character of bundle.characters) {
    lines.push(...buildCharacterIdentityVisualProductionLines(character));
  }
  for (const prop of bundle.props) {
    lines.push(...buildPropIdentityVisualProductionLines(prop));
  }
  return lines;
}

function buildSceneAudioLines(bundle: SceneIdentitySpecBundle): string[] {
  const lines: string[] = [];
  for (const world of bundle.worlds) {
    lines.push(...buildWorldIdentityAudioProductionLines(world));
  }
  return lines;
}

export function buildSceneIdentityConsumption(params: {
  scene: StudioSceneDetail;
  libraries: IdentityConsumptionLibraries;
}): SceneIdentityConsumption {
  const bundle = collectSceneIdentitySpecs({
    scene: params.scene,
    characters: params.libraries.characters,
    locations: params.libraries.locations,
    props: params.libraries.props,
    worlds: params.libraries.worlds,
  });

  const shotHint = resolveSceneIdentityShotBias({ bundle, libraries: params.libraries });
  const visualLines = buildSceneVisualLines(bundle);
  const audioLines = buildSceneAudioLines(bundle);

  const assets = [
    ...bundle.worlds,
    ...(bundle.location ? [bundle.location] : []),
    ...bundle.characters,
    ...bundle.props,
  ].map(summarizeIdentitySpec);

  const rationales: IdentityConsumptionRationale[] = [];
  if (shotHint) {
    rationales.push(
      buildRationale(
        `shot-${params.scene.id}`,
        "studio.identityConsumption.rationale.shotFromIdentity",
        shotHint.sourceKind,
        shotHint.sourceName,
        { name: shotHint.sourceName }
      )
    );
  }
  for (const world of bundle.worlds) {
    rationales.push(
      buildRationale(
        `world-${world.id}-${params.scene.id}`,
        "studio.identityConsumption.rationale.worldRules",
        "world",
        world.name,
        { name: world.name },
        "world",
      )
    );
  }
  if (bundle.location) {
    rationales.push(
      buildRationale(
        `location-${bundle.location.id}-${params.scene.id}`,
        "studio.identityConsumption.rationale.locationIdentity",
        "location",
        bundle.location.name,
        { name: bundle.location.name },
        "locations",
      )
    );
  }
  for (const character of bundle.characters) {
    rationales.push(
      buildRationale(
        `character-${character.id}-${params.scene.id}`,
        "studio.identityConsumption.rationale.characterIdentity",
        "character",
        character.name,
        { name: character.name },
        "characters",
      )
    );
  }
  for (const prop of bundle.props) {
    rationales.push(
      buildRationale(
        `prop-${prop.id}-${params.scene.id}`,
        "studio.identityConsumption.rationale.propAction",
        "prop",
        prop.name,
        { name: prop.name },
        "props",
      )
    );
  }

  return {
    sceneId: params.scene.id,
    sceneOrder: params.scene.order,
    shotHint,
    visualLines,
    audioLines,
    rationales,
    assets,
  };
}

function collectStoryboardLinkedSpecs(
  storyboard: StudioStoryboardDetail,
  libraries: IdentityConsumptionLibraries
): IdentitySpec[] {
  const byId = new Map<string, IdentitySpec>();
  for (const scene of storyboard.scenes) {
    const bundle = collectSceneIdentitySpecs({
      scene,
      characters: libraries.characters,
      locations: libraries.locations,
      props: libraries.props,
      worlds: libraries.worlds,
    });
    for (const spec of [
      ...bundle.worlds,
      ...(bundle.location ? [bundle.location] : []),
      ...bundle.characters,
      ...bundle.props,
    ]) {
      byId.set(`${spec.kind}:${spec.id}`, spec);
    }
  }
  return [...byId.values()];
}

function buildConsistencyChecks(
  specs: IdentitySpec[],
  libraries: IdentityConsumptionLibraries
): IdentityConsumptionConsistencyCheck[] {
  return specs.map((spec) => {
    const score = identityCompleteness(spec);
    const status: IdentityConsumptionConsistencyCheck["status"] =
      score >= COMPLETENESS_COMPLETE ? "pass"
      : score >= COMPLETENESS_ALMOST ? "partial"
      : "missing";
    const messageKey =
      status === "pass" ? "studio.identityConsumption.consistency.pass"
      : status === "partial" ? "studio.identityConsumption.consistency.partial"
      : "studio.identityConsumption.consistency.missing";

    if (spec.kind === "world") {
      const world = entityForSpec(spec, libraries) as StudioWorldProfileListItem | null;
      if (world) {
        const presence = buildWorldIdentityRulePresence(world);
        const active = Object.values(presence).filter(Boolean).length;
        if (active >= 4) {
          return { id: spec.id, kind: spec.kind, name: spec.name, status: "pass", messageKey: "studio.identityConsumption.consistency.worldRules" };
        }
        if (active >= 1) {
          return { id: spec.id, kind: spec.kind, name: spec.name, status: "partial", messageKey: "studio.identityConsumption.consistency.worldPartial" };
        }
      }
    }

    return { id: spec.id, kind: spec.kind, name: spec.name, status, messageKey };
  });
}

export function buildIdentityMemoryTrends(params: {
  storyboard: StudioStoryboardDetail;
  libraries: IdentityConsumptionLibraries;
  memory?: StudioProjectMemorySnapshot | null;
}): IdentityConsumptionTrend[] {
  const specs = collectStoryboardLinkedSpecs(params.storyboard, params.libraries);
  const trends: IdentityConsumptionTrend[] = [];

  const worldCounts = new Map<string, { name: string; count: number }>();
  for (const scene of params.storyboard.scenes) {
    for (const character of scene.characters) {
      if (character.worldProfile) {
        const entry = worldCounts.get(character.worldProfile.id) ?? {
          name: character.worldProfile.name,
          count: 0,
        };
        entry.count += 1;
        worldCounts.set(character.worldProfile.id, entry);
      }
    }
  }
  const topWorld = [...worldCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (topWorld) {
    trends.push({
      id: "top-world",
      messageKey: "studio.identityConsumption.trend.topWorld",
      label: topWorld[1].name,
      count: topWorld[1].count,
    });
  }

  const characterTypes = new Map<string, number>();
  for (const spec of specs.filter((s) => s.kind === "character")) {
    const key = spec.type || spec.role || "character";
    characterTypes.set(key, (characterTypes.get(key) ?? 0) + 1);
  }
  const topCharType = [...characterTypes.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCharType) {
    trends.push({
      id: "top-character-type",
      messageKey: "studio.identityConsumption.trend.topCharacterType",
      label: topCharType[0].replace(/_/g, " "),
      count: topCharType[1],
    });
  }

  const shotTypes = new Map<string, number>();
  for (const scene of params.storyboard.scenes) {
    if (scene.shotType?.trim()) {
      shotTypes.set(scene.shotType, (shotTypes.get(scene.shotType) ?? 0) + 1);
    }
  }
  const topShot = [...shotTypes.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topShot) {
    trends.push({
      id: "top-shot",
      messageKey: "studio.identityConsumption.trend.topShotStyle",
      label: topShot[0].replace(/_/g, " "),
      count: topShot[1],
    });
  }

  if (params.memory) {
    const worldUsage = Object.entries(params.memory.worlds).sort(
      (a, b) => b[1].storyboardCount - a[1].storyboardCount
    )[0];
    if (worldUsage && worldUsage[1].storyboardCount > 0) {
      const world = params.libraries.worlds.find((w) => w.id === worldUsage[0]);
      if (world) {
        trends.push({
          id: "memory-world",
          messageKey: "studio.identityConsumption.trend.memoryWorld",
          label: world.name,
          count: worldUsage[1].storyboardCount,
        });
      }
    }
  }

  return trends.slice(0, 5);
}

export function buildStoryboardIdentityConsumption(params: {
  storyboard: StudioStoryboardDetail;
  libraries: IdentityConsumptionLibraries;
  memory?: StudioProjectMemorySnapshot | null;
}): StoryboardIdentityConsumption {
  const sceneConsumptions = [...params.storyboard.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) =>
      buildSceneIdentityConsumption({ scene, libraries: params.libraries })
    );

  const linkedSpecs = collectStoryboardLinkedSpecs(params.storyboard, params.libraries);
  const assetSummaries = linkedSpecs.map(summarizeIdentitySpec);

  const completenessChecks = assetSummaries.map((asset) => ({
    id: asset.id,
    messageKey:
      asset.completenessStatus === "complete" ?
        "studio.identityConsumption.completeness.complete"
      : asset.completenessStatus === "almost" ?
        "studio.identityConsumption.completeness.almost"
      : "studio.identityConsumption.completeness.missing",
    passed: asset.completenessStatus === "complete",
    assetName: asset.name,
    kind: asset.kind,
  }));

  const consistencyChecks = buildConsistencyChecks(linkedSpecs, params.libraries);
  const trends = buildIdentityMemoryTrends(params);

  const visualProductionLines = sceneConsumptions.flatMap((s) => s.visualLines);
  const audioProductionLines = sceneConsumptions.flatMap((s) => s.audioLines);
  const rationales = sceneConsumptions.flatMap((s) => s.rationales);

  const directorContextLines = [
    ...new Set([
      ...visualProductionLines.slice(0, 8),
      ...audioProductionLines.slice(0, 4),
    ]),
  ];

  const dominantWorld = linkedSpecs.find((s) => s.kind === "world");

  return {
    dominantWorldName: dominantWorld?.name ?? null,
    assetSummaries,
    completenessChecks,
    consistencyChecks,
    trends,
    sceneConsumptions,
    directorContextLines,
    visualProductionLines: [...new Set(visualProductionLines)],
    audioProductionLines: [...new Set(audioProductionLines)],
    rationales: dedupeRationales(rationales),
  };
}

function dedupeRationales(
  rationales: IdentityConsumptionRationale[]
): IdentityConsumptionRationale[] {
  const seen = new Set<string>();
  return rationales.filter((r) => {
    const key = `${r.reasonKey}:${r.sourceName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildDirectorIdentityContextLines(params: {
  storyboard: StudioStoryboardDetail;
  libraries: IdentityConsumptionLibraries;
}): string[] {
  return buildStoryboardIdentityConsumption(params).directorContextLines;
}

export function biasShotTypeFromIdentity(
  currentShot: StudioShotType,
  shotHint: SceneIdentityConsumption["shotHint"]
): StudioShotType {
  if (!shotHint || shotHint.preferredShotTypes.length === 0) {
    return currentShot;
  }
  const preferred = shotHint.preferredShotTypes[0]!;
  if (currentShot === preferred) {
    return currentShot;
  }
  const closeShots = new Set<StudioShotType>(["close_up", "medium_close_up", "extreme_close_up", "detail_shot"]);
  const wideShots = new Set<StudioShotType>(["wide", "extreme_wide", "medium_wide", "drone"]);
  if (closeShots.has(preferred) && wideShots.has(currentShot)) {
    return preferred;
  }
  if (wideShots.has(preferred) && closeShots.has(currentShot)) {
    return preferred;
  }
  return currentShot;
}

export function buildIdentityConsumptionFixActions(
  consumption: StoryboardIdentityConsumption
): Array<{
  id: string;
  issueKey: string;
  reasonKey: string;
  currentLabel: string;
  suggestedLabelKey: string;
  tool: StudioToolId;
}> {
  return consumption.completenessChecks
    .filter((c) => !c.passed)
    .slice(0, 4)
    .map((c) => ({
      id: `identity-${c.kind}-${c.id}`,
      issueKey: "studio.identityConsumption.fix.incompleteIdentity",
      reasonKey: c.messageKey,
      currentLabel: c.assetName,
      suggestedLabelKey: "studio.identityConsumption.fix.openBuilder",
      tool: "world" as StudioToolId,
    }));
}
