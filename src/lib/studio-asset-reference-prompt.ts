import { applyWizardChoicesToFields } from "@/lib/studio-asset-wizard-choices";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const NO_TEXT_SUFFIX =
  "No text overlays. No watermarks. No logos. No collage. Single image only.";

export type AssetReferencePromptInput = {
  kind: StudioAssetKind;
  summaryPrompt: string;
  choices?: Record<string, string>;
  customTexts?: Record<string, string>;
  sourceReference?: {
    name: string;
    transformLabel?: string;
    userPrompt?: string;
    preserveHint?: string;
    changeHint?: string;
    forbiddenHint?: string;
  };
};

/** Build DALL-E prompt from wizard summary + kind-specific framing (reuses summary, no second builder). */
export function buildAssetReferenceGenerationPrompt(input: AssetReferencePromptInput): string {
  const summary = input.summaryPrompt.trim();
  const fields = applyWizardChoicesToFields(
    input.kind,
    input.choices ?? {},
    input.customTexts ?? {}
  );

  if (input.kind === "character") {
    const boosts = [
      summary,
      sourceReferenceBlock(input.sourceReference),
      characterBoostLines(fields, input.choices ?? {}),
      "Character reference portrait. Professional brand-safe illustration.",
      "Centered subject, clean simple background, consistent identity for animation.",
      NO_TEXT_SUFFIX,
    ];
    return boosts.filter(Boolean).join("\n\n");
  }

  if (input.kind === "prop") {
    const boosts = [
      summary,
      sourceReferenceBlock(input.sourceReference),
      propBoostLines(fields, input.choices ?? {}),
      "Hero product / prop reference render. Isolated object, studio lighting.",
      NO_TEXT_SUFFIX,
    ];
    return boosts.filter(Boolean).join("\n\n");
  }

  if (input.kind === "location") {
    const boosts = [
      summary,
      sourceReferenceBlock(input.sourceReference),
      locationBoostLines(fields, input.choices ?? {}),
      "Environment establishing shot. Wide cinematic location reference.",
      NO_TEXT_SUFFIX,
    ];
    return boosts.filter(Boolean).join("\n\n");
  }

  return [summary, sourceReferenceBlock(input.sourceReference), NO_TEXT_SUFFIX]
    .filter(Boolean)
    .join("\n\n");
}

function sourceReferenceBlock(
  sourceReference: AssetReferencePromptInput["sourceReference"]
): string {
  if (!sourceReference?.name.trim()) {
    return "";
  }
  const transform = sourceReference.transformLabel?.trim();
  const userPrompt = sourceReference.userPrompt?.trim();
  const preserve = sourceReference.preserveHint?.trim();
  const change = sourceReference.changeHint?.trim();
  const forbidden = sourceReference.forbiddenHint?.trim();
  const roleLine =
    transform && userPrompt ?
      `Use the uploaded source "${sourceReference.name}" as the style base. Create a ${transform} variant: ${userPrompt}.`
    : transform ?
      `Create a ${transform} variant of the source reference "${sourceReference.name}".`
    : userPrompt ?
      `Use the uploaded source "${sourceReference.name}" as the style base: ${userPrompt}.`
    : `Create a new official reference variant based on the user's uploaded source "${sourceReference.name}".`;
  const lines = [
    roleLine,
    preserve ? `Preserve: ${preserve}.` : "Preserve the source shape language, main colors, brand style, and mascot identity.",
    change ? `Change: ${change}.` : "Keep the friendly visual DNA — change only role, outfit, props, or context as described.",
    forbidden ? `Do not: ${forbidden}.` : "",
    "Do not redesign from scratch.",
  ].filter(Boolean);
  return lines.join(" ");
}

function characterBoostLines(
  fields: Record<string, string | null>,
  choices: Record<string, string>
): string {
  const parts: string[] = [];
  if (fields.visualStyle) {
    parts.push(`Visual style: ${fields.visualStyle}.`);
  }
  if (fields.personality) {
    parts.push(`Personality: ${fields.personality}.`);
  }
  if (fields.clothing) {
    parts.push(`Outfit: ${fields.clothing}.`);
  }
  if (choices.character_world) {
    parts.push(`World setting: ${choices.character_world}.`);
  }
  if (fields.colorTheme) {
    parts.push(`Color theme: ${fields.colorTheme}.`);
  }
  return parts.join(" ");
}

function propBoostLines(
  fields: Record<string, string | null>,
  choices: Record<string, string>
): string {
  const parts: string[] = [];
  if (choices.prop_category) {
    parts.push(`Category: ${choices.prop_category}.`);
  }
  if (fields.material) {
    parts.push(`Material: ${fields.material}.`);
  }
  if (fields.colorTheme) {
    parts.push(`Colors: ${fields.colorTheme}.`);
  }
  if (fields.styleId) {
    parts.push(`Style: ${fields.styleId}.`);
  }
  if (fields.usageContext) {
    parts.push(`Usage: ${fields.usageContext}.`);
  }
  return parts.join(" ");
}

function locationBoostLines(
  fields: Record<string, string | null>,
  choices: Record<string, string>
): string {
  const parts: string[] = [];
  if (fields.locationType) {
    parts.push(`Location type: ${fields.locationType}.`);
  }
  if (fields.mood) {
    parts.push(`Mood: ${fields.mood}.`);
  }
  if (fields.architecture) {
    parts.push(`Architecture: ${fields.architecture}.`);
  }
  if (fields.lighting) {
    parts.push(`Lighting: ${fields.lighting}.`);
  }
  if (choices.character_world) {
    parts.push(`World: ${choices.character_world}.`);
  }
  return parts.join(" ");
}
