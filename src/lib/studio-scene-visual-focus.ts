/**
 * Studio V42 — resolve primary and secondary visual focus for a scene.
 */

import type { StudioSceneDetail } from "@/types/studio-api";
import type { SceneVisualFocus, VisualFocusKind } from "@/types/studio-scene-composition";

const BRAND_MARKERS = ["homecheff", "homegarden", "homedesigner", "home cheff"] as const;

const PRODUCT_ACTION_MARKERS = [
  "reveal",
  "product",
  "package",
  "showcase",
  "display",
  "present",
] as const;

function containsAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

function characterFocus(
  characterId: string,
  characterName: string,
  labelKey: string
): SceneVisualFocus {
  return {
    kind: "character",
    entityId: characterId,
    entityName: characterName,
    labelKey,
  };
}

function kindFocus(
  kind: VisualFocusKind,
  entityId: string | null,
  entityName: string | null,
  labelKey: string
): SceneVisualFocus {
  return { kind, entityId, entityName, labelKey };
}

export function resolveSceneVisualFocus(scene: StudioSceneDetail): {
  primary: SceneVisualFocus;
  secondary: SceneVisualFocus | null;
} {
  const characters = scene.characters ?? [];
  const props = scene.props ?? [];
  const actionBlob = `${scene.action} ${scene.description} ${scene.title}`.toLowerCase();
  const emotion = scene.emotion?.toLowerCase() ?? "";

  const brandProp = props.find((p) =>
    containsAny(`${p.name} ${p.description ?? ""}`, BRAND_MARKERS)
  );
  const brandCharacter = characters.find((c) =>
    containsAny(`${c.name} ${c.role ?? ""}`, BRAND_MARKERS)
  );

  if (containsAny(actionBlob, PRODUCT_ACTION_MARKERS) && props.length > 0) {
    const prop = props[0]!;
    return {
      primary: kindFocus("product", prop.id, prop.name, "studio.composition.focus.product"),
      secondary:
        characters[0] ?
          characterFocus(
            characters[0].id,
            characters[0].name,
            "studio.composition.focus.characterSecondary"
          )
        : null,
    };
  }

  if (brandProp || brandCharacter) {
    const brand = brandProp ?? brandCharacter!;
    return {
      primary: kindFocus(
        "brand",
        brand.id,
        brand.name,
        "studio.composition.focus.brand"
      ),
      secondary:
        characters[0] ?
          characterFocus(
            characters[0].id,
            characters[0].name,
            "studio.composition.focus.characterSecondary"
          )
        : null,
    };
  }

  if (characters.length >= 4) {
    return {
      primary: kindFocus("group", null, null, "studio.composition.focus.community"),
      secondary:
        scene.location ?
          kindFocus(
            "location",
            scene.location.id,
            scene.location.name,
            "studio.composition.focus.locationSecondary"
          )
        : null,
    };
  }

  if (characters.length >= 2 && (emotion.includes("talk") || actionBlob.includes("conversation"))) {
    return {
      primary: kindFocus("conversation", null, null, "studio.composition.focus.conversation"),
      secondary: characterFocus(
        characters[0]!.id,
        characters[0]!.name,
        "studio.composition.focus.characterSecondary"
      ),
    };
  }

  if (characters.length >= 3) {
    return {
      primary: kindFocus("group", null, null, "studio.composition.focus.group"),
      secondary:
        characters[0] ?
          characterFocus(
            characters[0].id,
            characters[0].name,
            "studio.composition.focus.characterSecondary"
          )
        : null,
    };
  }

  if (characters.length > 0) {
    const primary = characters[0]!;
    const secondary = characters[1];
    return {
      primary: characterFocus(
        primary.id,
        primary.name,
        "studio.composition.focus.characterPrimary"
      ),
      secondary:
        secondary ?
          characterFocus(
            secondary.id,
            secondary.name,
            "studio.composition.focus.characterSecondary"
          )
        : scene.location ?
          kindFocus(
            "location",
            scene.location.id,
            scene.location.name,
            "studio.composition.focus.locationSecondary"
          )
        : props[0] ?
          kindFocus("product", props[0].id, props[0].name, "studio.composition.focus.propSecondary")
        : null,
    };
  }

  if (scene.location) {
    return {
      primary: kindFocus(
        "location",
        scene.location.id,
        scene.location.name,
        "studio.composition.focus.locationPrimary"
      ),
      secondary:
        props[0] ?
          kindFocus("product", props[0].id, props[0].name, "studio.composition.focus.propSecondary")
        : null,
    };
  }

  if (props.length > 0) {
    const prop = props[0]!;
    return {
      primary: kindFocus("product", prop.id, prop.name, "studio.composition.focus.product"),
      secondary: null,
    };
  }

  return {
    primary: kindFocus("none", null, null, "studio.composition.focus.none"),
    secondary: null,
  };
}
