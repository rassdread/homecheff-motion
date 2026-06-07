import type { PropIdentityFormValues } from "@/lib/studio-prop-identity-fields";
import type { StudioCharacterListItem, StudioPropListItem } from "@/types/studio-api";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Heuristic character link suggestions — never auto-applied. */
export function suggestPropLinkedCharacters(params: {
  prop: StudioPropListItem;
  form: Pick<
    PropIdentityFormValues,
    "propType" | "propFunction" | "name"
  >;
  characters: StudioCharacterListItem[];
  alreadyLinkedIds?: string[];
}): StudioCharacterListItem[] {
  const { prop, form, characters } = params;
  const linked = new Set(params.alreadyLinkedIds ?? []);
  const name = normalize(`${prop.name} ${form.name}`);
  const propType = normalize(form.propType);
  const propFunction = normalize(form.propFunction);

  const scored = characters
    .filter((c) => !linked.has(c.id))
    .map((character) => {
      let score = 0;
      const charName = normalize(character.name);
      const accessories = normalize(character.defaultAccessories);
      const clothing = normalize(character.defaultClothing);

      if (propType === "sport" || propFunction === "sports") {
        if (character.isMascot || character.role === "mascot") score += 3;
        if (name.includes("ball") || name.includes("voetbal") || name.includes("football")) {
          score += 2;
        }
      }

      if (
        propType === "tool" &&
        (propFunction === "cooking" || name.includes("spoon") || name.includes("lepel"))
      ) {
        if (charName.includes("chef") || charName.includes("marco") || clothing.includes("apron")) {
          score += 3;
        }
      }

      if (
        propFunction === "harvest" ||
        name.includes("basket") ||
        name.includes("mand")
      ) {
        if (
          charName.includes("garden") ||
          accessories.includes("basket") ||
          clothing.includes("garden")
        ) {
          score += 3;
        }
        if (character.isMascot) score += 1;
      }

      if (propFunction === "delivery" || name.includes("package") || name.includes("pakket")) {
        if (propFunction === "delivery" || clothing.includes("delivery")) score += 2;
      }

      if (propType === "business" || prop.category === "brand_asset") {
        if (character.isMascot) score += 2;
      }

      return { character, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map((entry) => entry.character);
}
