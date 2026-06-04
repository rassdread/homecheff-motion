import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

function buildReferenceConsistencyLines(scene: SceneSnapshot): string[] {
  const lines: string[] = [];

  for (const character of scene.characters) {
    const url = character.referenceImageUrl?.trim();
    if (url) {
      lines.push(
        `${character.name}: maintain identity consistency, clothing consistency, and facial consistency aligned with the reference image.`
      );
    } else if (character.personality.trim() || character.description.trim()) {
      lines.push(
        `${character.name}: maintain identity consistency, clothing consistency, and facial consistency.`
      );
    }
  }

  if (scene.location) {
    const locUrl = scene.location.referenceImageUrl?.trim();
    if (locUrl) {
      lines.push(
        `${scene.location.name}: reuse the same environment characteristics and world consistency from the location reference.`
      );
    } else {
      lines.push(
        `Maintain consistent ${scene.location.name} environment and neighborhood atmosphere.`
      );
    }
  }

  for (const prop of scene.props) {
    const propUrl = prop.referenceImageUrl?.trim();
    if (propUrl) {
      lines.push(
        `${prop.name}: reuse the same object appearance and branding consistency from the prop reference.`
      );
    } else {
      lines.push(`Keep ${prop.name} visually consistent when visible.`);
    }
  }

  return lines;
}

/**
 * Full text prompt sent to the scene image provider (Prompt Builder + continuity + references).
 */
export function buildSceneImageGenerationPrompt(
  scene: SceneSnapshot,
  promptOutput: PromptBuilderOutput,
  options?: { identityDriftLines?: string[] }
): string {
  const referenceLines = buildReferenceConsistencyLines(scene);
  const continuity = buildContinuityPrompt({
    characters: scene.characters,
    location: scene.location,
    props: scene.props,
    identityDriftLines: options?.identityDriftLines,
  });

  const parts = [
    promptOutput.prompt,
    referenceLines.length > 0 ? `Reference consistency:\n${referenceLines.join("\n")}` : "",
    continuity ? `Continuity:\n${continuity}` : "",
    "Single cinematic still frame. No text overlays. No watermarks. No collage.",
  ];

  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function buildSceneImageReferenceAssets(scene: SceneSnapshot) {
  return {
    characters: scene.characters.map((c) => ({
      id: c.id,
      name: c.name,
      referenceImageUrl: c.referenceImageUrl?.trim() || null,
    })),
    location: scene.location
      ? {
          id: scene.location.id,
          name: scene.location.name,
          referenceImageUrl: scene.location.referenceImageUrl?.trim() || null,
        }
      : null,
    props: scene.props.map((p) => ({
      id: p.id,
      name: p.name,
      referenceImageUrl: p.referenceImageUrl?.trim() || null,
    })),
  };
}
