/**
 * Unified identity prompt sections from Identity Consumption / visual-hints.
 */

import { buildCharacterIdentityPromptContext } from "@/lib/studio-character-identity-visual-hints";
import { buildLocationIdentityPromptContext } from "@/lib/studio-location-identity-visual-hints";
import { buildPropIdentityPromptContext } from "@/lib/studio-prop-identity-visual-hints";
import { buildWorldIdentityPromptContext } from "@/lib/studio-world-identity-visual-hints";
import { collectSceneIdentitySpecs } from "@/lib/studio-identity-spec-engine";
import type { IdentityConsumptionLibraries } from "@/lib/studio-identity-consumption";
import type { StudioSceneDetail } from "@/types/studio-api";

export type PromptBuilderSourceEntities = IdentityConsumptionLibraries;

function uniqueParagraph(parts: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    lines.push(trimmed);
  }
  return lines.join(" ");
}

export function buildSceneWorldIdentityPromptContext(params: {
  scene: StudioSceneDetail;
  libraries: PromptBuilderSourceEntities;
}): string {
  const bundle = collectSceneIdentitySpecs({
    scene: params.scene,
    characters: params.libraries.characters,
    locations: params.libraries.locations,
    props: params.libraries.props,
    worlds: params.libraries.worlds,
  });

  const worldContexts: string[] = [];
  for (const worldSpec of bundle.worlds) {
    const world = params.libraries.worlds.find((w) => w.id === worldSpec.id) ?? null;
    const context = buildWorldIdentityPromptContext(world);
    if (context) {
      worldContexts.push(context);
    }
  }
  return uniqueParagraph(worldContexts);
}

export function buildCharacterPromptIdentityContext(
  characterId: string,
  libraries: PromptBuilderSourceEntities
): string {
  const character = libraries.characters.find((c) => c.id === characterId) ?? null;
  return buildCharacterIdentityPromptContext(character);
}

export function buildLocationPromptIdentityContext(
  locationId: string | null | undefined,
  libraries: PromptBuilderSourceEntities
): string {
  if (!locationId) {
    return "";
  }
  const location = libraries.locations.find((l) => l.id === locationId) ?? null;
  return buildLocationIdentityPromptContext(location);
}

export function buildPropPromptIdentityContext(
  propId: string,
  libraries: PromptBuilderSourceEntities
): string {
  const prop = libraries.props.find((p) => p.id === propId) ?? null;
  return buildPropIdentityPromptContext(prop);
}

export function buildScenePromptIdentitySection(params: {
  scene: StudioSceneDetail;
  libraries?: PromptBuilderSourceEntities;
}): string {
  if (!params.libraries) {
    return "";
  }
  return buildSceneWorldIdentityPromptContext({
    scene: params.scene,
    libraries: params.libraries,
  });
}
