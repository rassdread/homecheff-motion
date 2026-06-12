import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import type { HomeCheffAssetReference, HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type HcInventoryAsset = {
  sourceId: string;
  assetType: string;
  origin: "library" | "hc_project" | "upload" | "generated";
  storageLocation: string;
  label: string;
};

export type HcCentralInventory = {
  available: HcInventoryAsset[];
  missing: string[];
  optional: string[];
  suggestions: string[];
};

function refToInventoryAsset(ref: HomeCheffAssetReference): HcInventoryAsset {
  return {
    sourceId: ref.id,
    assetType: ref.kind,
    origin: ref.sourceService === "library" ? "library" : "hc_project",
    storageLocation: ref.storageKey ?? ref.url,
    label: ref.role ?? ref.kind,
  };
}

/** Central inventory — HC project refs plus Studio library APIs. */
export async function fetchHcCentralInventory(
  hcProject?: HomeCheffProjectPackage | null
): Promise<HcCentralInventory> {
  const available: HcInventoryAsset[] = [];
  const missing: string[] = [];
  const optional = ["subtitles", "translations"];
  const suggestions: string[] = [];

  if (hcProject) {
    for (const ref of hcProject.assetReferences) {
      available.push(refToInventoryAsset(ref));
    }
  }

  const [chars, locs, props, worlds] = await Promise.all([
    fetchStudioCharacters(),
    fetchStudioLocations(),
    fetchStudioProps(),
    fetchStudioWorlds(),
  ]);

  if (chars.ok) {
    for (const c of chars.data.characters) {
      available.push({
        sourceId: c.id,
        assetType: "character",
        origin: "library",
        storageLocation: c.id,
        label: c.name,
      });
    }
  } else {
    missing.push("characters");
  }

  if (locs.ok) {
    for (const l of locs.data.locations) {
      available.push({
        sourceId: l.id,
        assetType: "location",
        origin: "library",
        storageLocation: l.id,
        label: l.name,
      });
    }
  } else {
    missing.push("locations");
  }

  if (props.ok) {
    for (const p of props.data.props) {
      available.push({
        sourceId: p.id,
        assetType: "prop",
        origin: "library",
        storageLocation: p.id,
        label: p.name,
      });
    }
  }

  if (worlds.ok && worlds.data.worlds.length > 0) {
    for (const w of worlds.data.worlds) {
      available.push({
        sourceId: w.id,
        assetType: "world",
        origin: "library",
        storageLocation: w.id,
        label: w.name,
      });
    }
  } else {
    missing.push("world");
  }

  const hasCharacters = available.some((a) => a.assetType === "character");
  const hasVoice = available.some((a) => a.assetType === "voice" || a.assetType === "audio");
  if (!hasCharacters) missing.push("characters");
  if (!hasVoice) missing.push("voice");
  if (!hcProject?.servicePayload.motion) missing.push("motion_plan");

  if (missing.includes("characters")) {
    suggestions.push("Use the character wizard or pick from Library.");
  }

  return {
    available,
    missing: [...new Set(missing)],
    optional,
    suggestions,
  };
}
