/**
 * Sprint K — consistent Dutch display labels for vision part keys.
 */

const NORMALIZATION_MAP: Record<string, string> = {
  left_sleeve: "Mouw links",
  sleeve_left: "Mouw links",
  leftsleeve: "Mouw links",
  right_sleeve: "Mouw rechts",
  sleeve_right: "Mouw rechts",
  rightsleeve: "Mouw rechts",
  chest: "Borst",
  chest_left: "Borst links",
  left_chest: "Borst links",
  chest_center: "Borst midden",
  center_chest: "Borst midden",
  chest_middle: "Borst midden",
  chest_right: "Borst rechts",
  right_chest: "Borst rechts",
  back: "Rug",
  collar: "Kraag",
  front_panel: "Voorzijde",
  front: "Voorzijde",
  rear_panel: "Achterzijde",
  back_panel: "Achterzijde",
  label: "Label",
  side_left: "Zijkant links",
  left_side: "Zijkant links",
  side_right: "Zijkant rechts",
  right_side: "Zijkant rechts",
  top: "Bovenzijde",
  top_panel: "Bovenzijde",
  door_left: "Portier links",
  left_door: "Portier links",
  door_right: "Portier rechts",
  right_door: "Portier rechts",
  hood: "Motorkap",
  roof: "Dak",
  tailgate: "Achterklep",
  billboard_surface: "Billboard oppervlak",
  billboard: "Billboard oppervlak",
  screen: "Scherm",
  screen_bezel: "Rand",
  screen_bottom: "Onderzijde",
  emblem_chest: "Borstembleem",
  emblem_back: "Rugembleem",
  accessory: "Accessoire",
  headwear: "Hoofddeksel",
  hat: "Hoofddeksel",
  packaging: "Verpakking",
  product_label: "Label",
};

export function normalizeVisionTargetKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeVisionTargetLabel(raw: string): string {
  const key = normalizeVisionTargetKey(raw);
  if (NORMALIZATION_MAP[key]) {
    return NORMALIZATION_MAP[key]!;
  }

  const tokens = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return raw.trim() || "Target";
  }

  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

export function inferVisionTargetCategory(
  label: string,
  nodeCategory?: string
): string {
  const text = `${label} ${nodeCategory ?? ""}`.toLowerCase();
  if (/mascot|emblem|badge|borstembleem|rugembleem|accessoire|hoofddeksel/.test(text)) {
    return "mascot";
  }
  if (/shirt|sleeve|chest|collar|clothing|jacket|apron|mouw|borst|kraag|kleding/.test(text)) {
    return "clothing";
  }
  if (/pack|label|carton|box|packaging|verpakking|voorzijde|achterzijde|zijkant/.test(text)) {
    return "packaging";
  }
  if (/door|hood|roof|vehicle|truck|van|car|portier|motorkap|dak|achterklep/.test(text)) {
    return "vehicle";
  }
  if (/billboard|signage|sign|poster/.test(text)) {
    return "signage";
  }
  if (/screen|display|monitor|scherm|rand|onderzijde/.test(text)) {
    return "screen";
  }
  if (/product|bottle|jar|can/.test(text)) {
    return "product";
  }
  if (/wall|building|storefront/.test(text)) {
    return "building";
  }
  return nodeCategory ?? "other";
}
