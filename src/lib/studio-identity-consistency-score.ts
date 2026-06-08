/**
 * Identity consistency score — audit metric based on actual prompt consumption.
 * Analysis only; no schema migration.
 */

import {
  buildCharacterIdentityVisualProductionLines,
} from "@/lib/studio-character-identity-visual-hints";
import {
  buildLocationIdentityVisualProductionLines,
} from "@/lib/studio-location-identity-visual-hints";
import {
  buildPropIdentityVisualProductionLines,
} from "@/lib/studio-prop-identity-visual-hints";
import {
  buildWorldIdentityVisualProductionLines,
} from "@/lib/studio-world-identity-visual-hints";
import {
  collectSceneIdentitySpecs,
  type SceneIdentitySpecBundle,
} from "@/lib/studio-identity-spec-engine";
import type { IdentityConsumptionLibraries } from "@/lib/studio-identity-consumption";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { StudioSceneDetail } from "@/types/studio-api";
import type { IdentitySpec, IdentitySpecKind } from "@/types/studio-identity-spec";

export type SceneIdentityConsistencyScores = {
  sceneId: string;
  character: number;
  prop: number;
  location: number;
  world: number;
  overall: number;
  consumedLineCount: number;
  availableLineCount: number;
};

function promptHaystack(output: PromptBuilderOutput): string {
  const sections = output.sections;
  return [
    output.prompt,
    sections.identity,
    sections.directorIdentity,
    sections.continuity,
    sections.characters,
    sections.location,
    sections.props,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function lineConsumed(line: string, haystack: string): boolean {
  const normalized = line.replace(/\.$/, "").trim().toLowerCase();
  if (!normalized || normalized.length < 8) {
    return false;
  }
  const core = normalized.split(":").pop()?.trim() ?? normalized;
  if (core.length >= 6 && haystack.includes(core.slice(0, Math.min(core.length, 40)))) {
    return true;
  }
  const words = core.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) {
    return false;
  }
  const hits = words.filter((w) => haystack.includes(w)).length;
  return hits / words.length >= 0.6;
}

function scoreKind(
  specs: IdentitySpec[],
  haystack: string,
  lineBuilder: (spec: IdentitySpec) => string[]
): { score: number; consumed: number; available: number } {
  if (specs.length === 0) {
    return { score: 100, consumed: 0, available: 0 };
  }
  let consumed = 0;
  let available = 0;
  for (const spec of specs) {
    const lines = lineBuilder(spec);
    for (const line of lines) {
      available += 1;
      if (lineConsumed(line, haystack)) {
        consumed += 1;
      }
    }
  }
  if (available === 0) {
    return { score: 100, consumed: 0, available: 0 };
  }
  return {
    score: Math.round((consumed / available) * 100),
    consumed,
    available,
  };
}

function specsForKind(bundle: SceneIdentitySpecBundle, kind: IdentitySpecKind): IdentitySpec[] {
  switch (kind) {
    case "character":
      return bundle.characters;
    case "prop":
      return bundle.props;
    case "location":
      return bundle.location ? [bundle.location] : [];
    case "world":
      return bundle.worlds;
  }
}

export function buildSceneIdentityConsistencyScores(params: {
  scene: StudioSceneDetail;
  promptOutput: PromptBuilderOutput;
  libraries: IdentityConsumptionLibraries;
}): SceneIdentityConsistencyScores {
  const bundle = collectSceneIdentitySpecs({
    scene: params.scene,
    characters: params.libraries.characters,
    locations: params.libraries.locations,
    props: params.libraries.props,
    worlds: params.libraries.worlds,
  });
  const haystack = promptHaystack(params.promptOutput);

  const character = scoreKind(specsForKind(bundle, "character"), haystack, (spec) =>
    buildCharacterIdentityVisualProductionLines(
      spec as Parameters<typeof buildCharacterIdentityVisualProductionLines>[0]
    )
  );
  const prop = scoreKind(specsForKind(bundle, "prop"), haystack, (spec) =>
    buildPropIdentityVisualProductionLines(
      spec as Parameters<typeof buildPropIdentityVisualProductionLines>[0]
    )
  );
  const location = scoreKind(specsForKind(bundle, "location"), haystack, (spec) =>
    buildLocationIdentityVisualProductionLines(
      spec as Parameters<typeof buildLocationIdentityVisualProductionLines>[0]
    )
  );
  const world = scoreKind(specsForKind(bundle, "world"), haystack, (spec) =>
    buildWorldIdentityVisualProductionLines(
      spec as Parameters<typeof buildWorldIdentityVisualProductionLines>[0]
    )
  );

  const consumedLineCount =
    character.consumed + prop.consumed + location.consumed + world.consumed;
  const availableLineCount =
    character.available + prop.available + location.available + world.available;

  const kinds = [character, prop, location, world].filter((k) => k.available > 0);
  const overall =
    kinds.length === 0
      ? 100
      : Math.round(kinds.reduce((sum, k) => sum + k.score, 0) / kinds.length);

  return {
    sceneId: params.scene.id,
    character: character.score,
    prop: prop.score,
    location: location.score,
    world: world.score,
    overall,
    consumedLineCount,
    availableLineCount,
  };
}

export function buildStoryboardIdentityConsistencyScores(params: {
  storyboard: { scenes: StudioSceneDetail[] };
  libraries: IdentityConsumptionLibraries;
  buildPrompt: (scene: StudioSceneDetail) => PromptBuilderOutput;
}): SceneIdentityConsistencyScores[] {
  return [...params.storyboard.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) =>
      buildSceneIdentityConsistencyScores({
        scene,
        promptOutput: params.buildPrompt(scene),
        libraries: params.libraries,
      })
    );
}
