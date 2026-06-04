import { buildSceneMemoryContinuityPrompt } from "@/lib/studio-memory-prompt";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

export function buildContinuityPrompt(options: {
  characters: CharacterSnapshot[];
  location: LocationSnapshot | null;
  props: PropSnapshot[];
  memoryBundle?: SceneMemoryBundle;
}): string {
  if (options.memoryBundle) {
    return buildSceneMemoryContinuityPrompt(options.memoryBundle);
  }
  const lines: string[] = [];

  for (const character of options.characters) {
    const label =
      character.role === "mascot"
        ? `Maintain the same ${character.name} mascot identity throughout the sequence.`
        : `Maintain consistent appearance for ${character.name}.`;
    lines.push(label);
    if (character.personality.trim()) {
      lines.push(`Preserve personality: ${character.personality.trim()}.`);
    }
  }

  if (options.location) {
    lines.push(
      `Maintain consistent ${options.location.name} environment and atmosphere.`
    );
  }

  for (const prop of options.props) {
    lines.push(`Keep ${prop.name} visually consistent when visible.`);
  }

  if (lines.length === 0) {
    return "Maintain visual consistency across the storyboard sequence.";
  }

  lines.push("Maintain consistent clothing, lighting, and character proportions.");
  return lines.join("\n");
}
