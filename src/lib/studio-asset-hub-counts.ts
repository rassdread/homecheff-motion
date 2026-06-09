import { isRegistryAssetHiddenFromLibrary } from "@/lib/studio-asset-registry-lifecycle";
import type { AssetsHubCountsReport, AssetsHubSectionCounts } from "@/types/studio-asset-hub-counts";
import type { StudioAsset } from "@/types/studio-media-asset";

function countByTab(assets: StudioAsset[], predicate: (a: StudioAsset) => boolean): number {
  return assets.filter((a) => !isRegistryAssetHiddenFromLibrary(a) && predicate(a)).length;
}

export function computeAssetsHubCounts(
  registry: StudioAsset[],
  videoCount: number
): AssetsHubCountsReport {
  const visible = registry.filter((a) => !isRegistryAssetHiddenFromLibrary(a));

  const sections: AssetsHubSectionCounts = {
    videos: videoCount,
    audio: countByTab(visible, (a) => a.category === "music" || a.category === "sound_effect" || a.category === "ambience"),
    voices: countByTab(visible, (a) => a.category === "voice"),
    characters: countByTab(visible, (a) => a.category === "character" || a.sourceRef.entityType === "character"),
    props: countByTab(visible, (a) => a.category === "prop" || a.sourceRef.entityType === "prop"),
    locations: countByTab(visible, (a) => a.category === "location" || a.sourceRef.entityType === "location"),
    worlds: countByTab(visible, (a) => a.sourceRef.entityType === "world"),
    uploads: countByTab(visible, (a) => a.origin === "uploaded"),
    generated: countByTab(visible, (a) => a.origin === "generated"),
    derived: countByTab(
      visible,
      (a) => a.origin === "derived" || Boolean(a.semanticContinuity?.derivedFromAssetId)
    ),
  };

  const groups = {
    media: sections.videos + sections.audio + sections.voices,
    creative: sections.characters + sections.props + sections.locations + sections.worlds,
    library: sections.uploads + sections.generated + sections.derived,
  };

  return {
    sections,
    groups,
    total: groups.media + groups.creative + groups.library,
  };
}
