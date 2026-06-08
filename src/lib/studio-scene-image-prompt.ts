import { parseAssetReferencesBundle } from "@/lib/studio-asset-canonical-references";
import { parseCharacterReferencesBundle } from "@/lib/studio-character-canonical-references";
import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

function buildSupportingReferenceLines(memoryBundle?: SceneMemoryBundle): string[] {
  if (!memoryBundle) {
    return [];
  }
  const lines: string[] = [];
  for (const character of memoryBundle.characters) {
    const { bundle } = parseCharacterReferencesBundle(character.referenceNotes);
    for (const ref of bundle.supporting.filter((r) => r.status === "active").slice(0, 3)) {
      const label = ref.label?.trim() || ref.role;
      lines.push(
        `${character.name}: match ${label} from supporting ${ref.role} reference image — keep face, outfit, and proportions consistent.`
      );
    }
  }
  if (memoryBundle.location) {
    const { bundle } = parseAssetReferencesBundle(memoryBundle.location.continuityNotes);
    for (const ref of bundle.supporting.filter((r) => r.status === "active").slice(0, 2)) {
      lines.push(
        `${memoryBundle.location.name}: match supporting ${ref.role} reference — preserve architecture, materials, and lighting.`
      );
    }
  }
  for (const prop of memoryBundle.props) {
    const { bundle } = parseAssetReferencesBundle(prop.continuityNotes);
    for (const ref of bundle.supporting.filter((r) => r.status === "active").slice(0, 2)) {
      lines.push(
        `${prop.name}: match supporting ${ref.role} reference — preserve shape, branding, and material.`
      );
    }
  }
  return lines;
}

function buildReferenceConsistencyLines(
  scene: SceneSnapshot,
  memoryBundle?: SceneMemoryBundle
): string[] {
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

  return [...lines, ...buildSupportingReferenceLines(memoryBundle)];
}

/**
 * Full text prompt sent to the scene image provider (Prompt Builder + continuity + references).
 */
export function buildSceneImageGenerationPrompt(
  scene: SceneSnapshot,
  promptOutput: PromptBuilderOutput,
  options?: { identityDriftLines?: string[]; memoryBundle?: SceneMemoryBundle }
): string {
  const referenceLines = buildReferenceConsistencyLines(scene, options?.memoryBundle);
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

export function buildSceneImageReferenceAssets(
  scene: SceneSnapshot,
  memoryBundle?: SceneMemoryBundle
) {
  const characterMemoryById = new Map(
    (memoryBundle?.characters ?? []).map((c) => [c.id, c])
  );
  return {
    characters: scene.characters.map((c) => {
      const memory = characterMemoryById.get(c.id);
      const supporting =
        memory ?
          parseCharacterReferencesBundle(memory.referenceNotes).bundle.supporting
            .filter((r) => r.status === "active")
            .map((r) => ({ role: r.role, imageUrl: r.imageUrl }))
        : [];
      return {
        id: c.id,
        name: c.name,
        referenceImageUrl: c.referenceImageUrl?.trim() || null,
        supportingReferences: supporting,
      };
    }),
    location:
      scene.location
        ? (() => {
            const locMemory = memoryBundle?.location;
            const supporting =
              locMemory && locMemory.id === scene.location!.id
                ? parseAssetReferencesBundle(locMemory.continuityNotes).bundle.supporting
                    .filter((r) => r.status === "active")
                    .map((r) => ({ role: r.role, imageUrl: r.imageUrl }))
                : [];
            return {
              id: scene.location.id,
              name: scene.location.name,
              referenceImageUrl: scene.location.referenceImageUrl?.trim() || null,
              supportingReferences: supporting,
            };
          })()
        : null,
    props: scene.props.map((p) => {
      const propMemory = memoryBundle?.props.find((m) => m.id === p.id);
      const supporting =
        propMemory
          ? parseAssetReferencesBundle(propMemory.continuityNotes).bundle.supporting
              .filter((r) => r.status === "active")
              .map((r) => ({ role: r.role, imageUrl: r.imageUrl }))
          : [];
      return {
        id: p.id,
        name: p.name,
        referenceImageUrl: p.referenceImageUrl?.trim() || null,
        supportingReferences: supporting,
      };
    }),
  };
}
