import type { AssetLibraryTab } from "@/lib/studio-asset-library-filters";
import type { AssetLibraryOriginFilter } from "@/lib/studio-asset-library-filters";

/** Assets product taxonomy — shared by Editor, Studio, Motion, Presentation */
export type AssetsHubGroup = "media" | "creative" | "library";

export type AssetsHubSection =
  | "videos"
  | "audio"
  | "voices"
  | "characters"
  | "props"
  | "locations"
  | "worlds"
  | "uploads"
  | "generated"
  | "derived";

export type AssetsHubSectionDef = {
  group: AssetsHubGroup;
  section: AssetsHubSection;
  href: string;
  labelKey: string;
  descriptionKey: string;
  initialTab?: AssetLibraryTab;
  initialCollection?: string;
  initialOrigin?: AssetLibraryOriginFilter;
  externalHref?: string;
};

export const ASSETS_HUB_GROUPS: AssetsHubGroup[] = ["media", "creative", "library"];

export const ASSETS_HUB_SECTIONS: AssetsHubSectionDef[] = [
  {
    group: "media",
    section: "videos",
    href: "/studio/assets/media/videos",
    labelKey: "studio.assetsHub.section.videos",
    descriptionKey: "studio.assetsHub.section.videosDesc",
    externalHref: "/videos",
  },
  {
    group: "media",
    section: "audio",
    href: "/studio/assets/media/audio",
    labelKey: "studio.assetsHub.section.audio",
    descriptionKey: "studio.assetsHub.section.audioDesc",
    initialTab: "music",
  },
  {
    group: "media",
    section: "voices",
    href: "/studio/assets/media/voices",
    labelKey: "studio.assetsHub.section.voices",
    descriptionKey: "studio.assetsHub.section.voicesDesc",
    initialTab: "voice",
  },
  {
    group: "creative",
    section: "characters",
    href: "/studio/assets/creative/characters",
    labelKey: "studio.assetsHub.section.characters",
    descriptionKey: "studio.assetsHub.section.charactersDesc",
    initialTab: "character",
  },
  {
    group: "creative",
    section: "props",
    href: "/studio/assets/creative/props",
    labelKey: "studio.assetsHub.section.props",
    descriptionKey: "studio.assetsHub.section.propsDesc",
    initialTab: "prop",
  },
  {
    group: "creative",
    section: "locations",
    href: "/studio/assets/creative/locations",
    labelKey: "studio.assetsHub.section.locations",
    descriptionKey: "studio.assetsHub.section.locationsDesc",
    initialTab: "location",
  },
  {
    group: "creative",
    section: "worlds",
    href: "/studio/assets/creative/worlds",
    labelKey: "studio.assetsHub.section.worlds",
    descriptionKey: "studio.assetsHub.section.worldsDesc",
    initialTab: "world",
  },
  {
    group: "library",
    section: "uploads",
    href: "/studio/assets/library/uploads",
    labelKey: "studio.assetsHub.section.uploads",
    descriptionKey: "studio.assetsHub.section.uploadsDesc",
    initialOrigin: "uploaded",
  },
  {
    group: "library",
    section: "generated",
    href: "/studio/assets/library/generated",
    labelKey: "studio.assetsHub.section.generated",
    descriptionKey: "studio.assetsHub.section.generatedDesc",
    initialTab: "generated",
  },
  {
    group: "library",
    section: "derived",
    href: "/studio/assets/library/derived",
    labelKey: "studio.assetsHub.section.derived",
    descriptionKey: "studio.assetsHub.section.derivedDesc",
    initialTab: "derived",
  },
];

export function getHubSectionsForGroup(group: AssetsHubGroup): AssetsHubSectionDef[] {
  return ASSETS_HUB_SECTIONS.filter((s) => s.group === group);
}

export function resolveHubSection(
  group: string,
  section: string
): AssetsHubSectionDef | null {
  return (
    ASSETS_HUB_SECTIONS.find((s) => s.group === group && s.section === section) ?? null
  );
}

export function isAssetsHubPath(pathname: string): boolean {
  return pathname === "/studio/assets" || pathname.startsWith("/studio/assets/");
}
