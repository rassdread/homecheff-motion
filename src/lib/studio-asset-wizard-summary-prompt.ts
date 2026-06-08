import { applyWizardChoicesToFields } from "@/lib/studio-asset-wizard-choices";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type SummaryLabels = Record<string, string>;

/** Build a human-readable creation summary from wizard chip choices (for review + memory). */
export function buildWizardSummaryPrompt(
  kind: StudioAssetKind,
  choices: Record<string, string>,
  customTexts: Record<string, string>,
  labels: SummaryLabels
): string {
  const label = (stepId: string, optionId?: string) => {
    if (!optionId) return "";
    const key = `${stepId}.${optionId}`;
    return labels[key] ?? optionId.replace(/_/g, " ");
  };

  if (kind === "character") {
    const type = label("character_type", choices.character_type);
    const style = label("character_style", choices.character_style);
    const shape = label("character_shape", choices.character_shape);
    const personality = label("character_personality", choices.character_personality);
    const outfit = label("character_outfit", choices.character_outfit);
    const world = label("character_world", choices.character_world);
    const voice = choices.character_voice ? label("character_voice", choices.character_voice) : "";

    const typePart = choices.character_type === "custom" ? (customTexts.character_type ?? type) : type;
    const outfitPart =
      choices.character_outfit === "custom" ? (customTexts.character_outfit ?? outfit) : outfit;

    const parts = [
      personality ? `A ${personality.toLowerCase()}` : "A",
      style ? `${style.toLowerCase()}` : "",
      typePart ? `${typePart.toLowerCase()}` : "character",
      shape ? `with ${shape.toLowerCase()} energy` : "",
      outfitPart ? `wearing ${outfitPart.toLowerCase()} outfit` : "",
      world ? `in a ${world.toLowerCase()} setting` : "",
      voice && choices.character_voice !== "skip" ? `with ${voice.toLowerCase()} voice` : "",
    ].filter(Boolean);

    return `${parts.join(" ")}.`.replace(/\s+/g, " ").replace(/\s\./g, ".");
  }

  if (kind === "prop") {
    const category = label("prop_category", choices.prop_category);
    const style = label("prop_style", choices.prop_style);
    const material = label("prop_material", choices.prop_material);
    const color = label("prop_color", choices.prop_color);
    const usage = label("prop_usage", choices.prop_usage);
    const colorPart =
      choices.prop_color === "custom" ? (customTexts.prop_color ?? color) : color;

    return [
      style ? `A ${style.toLowerCase()}` : "A",
      category ? `${category.toLowerCase()} prop` : "prop",
      material ? `made of ${material.toLowerCase()}` : "",
      colorPart ? `in ${colorPart.toLowerCase()} colors` : "",
      usage ? `used as ${usage.toLowerCase()}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .concat(".");
  }

  if (kind === "location") {
    const type = label("location_type", choices.location_type);
    const mood = label("location_mood", choices.location_mood);
    const arch = label("location_architecture", choices.location_architecture);
    const light = label("location_lighting", choices.location_lighting);
    const typePart =
      choices.location_type === "custom" ? (customTexts.location_type ?? type) : type;

    return [
      mood ? `A ${mood.toLowerCase()}` : "A",
      typePart ? `${typePart.toLowerCase()} location` : "location",
      arch ? `with ${arch.toLowerCase()} architecture` : "",
      light ? `at ${light.toLowerCase()}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .concat(".");
  }

  if (kind === "world") {
    const genre = label("world_genre", choices.world_genre);
    const rules = label("world_rules", choices.world_rules);
    const color = label("world_color", choices.world_color);
    const mood = label("world_mood", choices.world_mood);

    return [
      mood ? `A ${mood.toLowerCase()}` : "A",
      genre ? `${genre.toLowerCase()} world` : "world",
      rules ? `following ${rules.toLowerCase()} rules` : "",
      color ? `with ${color.toLowerCase()} palette` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .concat(".");
  }

  return "";
}

/** Sync draft name/description from summary when user has not typed a name. */
export function deriveWizardDraftText(
  kind: StudioAssetKind,
  choices: Record<string, string>,
  customTexts: Record<string, string>,
  summaryPrompt: string,
  currentName: string
): { name: string; description: string; fields: Record<string, string | null> } {
  const fields = applyWizardChoicesToFields(kind, choices, customTexts);
  const description = summaryPrompt.trim();
  let name = currentName.trim();
  if (!name && description) {
    const words = description.replace(/\.$/, "").split(" ").slice(0, 4);
    name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return { name, description, fields };
}
