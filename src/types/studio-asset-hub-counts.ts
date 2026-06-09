/** Counts for Assets Hub groups and sections. */

export type AssetsHubSectionCounts = {
  videos: number;
  audio: number;
  voices: number;
  characters: number;
  props: number;
  locations: number;
  worlds: number;
  uploads: number;
  generated: number;
  derived: number;
};

export type AssetsHubGroupCounts = {
  media: number;
  creative: number;
  library: number;
};

export type AssetsHubCountsReport = {
  sections: AssetsHubSectionCounts;
  groups: AssetsHubGroupCounts;
  total: number;
};
