import type { FeaturedExperience } from "@/types/featured-experience";

export type HomeCheffExampleService = "motion" | "studio" | "publish" | "editor" | "home";

export type HomeCheffExample = {
  id: string;
  service: HomeCheffExampleService;
  title: string;
  subtitle?: string;
  description: string;
  thumbnailUrl: string;
  mediaUrl?: string;
  posterUrl?: string;
  mediaKind?: "image" | "video";
  tags: string[];
  assistantPrompt?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/** Reusable examples catalog — admin can extend via API later. */
export const HOMECHEFF_EXAMPLES: HomeCheffExample[] = [
  {
    id: "motion-social-1",
    service: "motion",
    title: "Product reveal clip",
    description: "3-second social teaser from a single product photo.",
    thumbnailUrl: "/generated/animations/projects/cmpwj6err0001l404vonqmj5x/final.mp4",
    mediaKind: "video",
    tags: ["social", "product"],
  },
  {
    id: "studio-story-1",
    service: "studio",
    title: "Restaurant promo storyboard",
    description: "Multi-scene campaign with voice and branding plan.",
    thumbnailUrl: "/generated/animations/projects/cmpwj6err0001l404vonqmj5x/final.mp4",
    mediaKind: "image",
    tags: ["story", "commercial"],
  },
  {
    id: "publish-photo-1",
    service: "publish",
    title: "Photo Story — recipe card",
    description: "Single image to MP4 with pan, text and music.",
    thumbnailUrl: "/generated/animations/projects/cmpwj6err0001l404vonqmj5x/final.mp4",
    mediaKind: "image",
    tags: ["photo_story", "food"],
  },
  {
    id: "editor-fusion-1",
    service: "editor",
    title: "Character outfit fusion",
    description: "Combine references into one polished still.",
    thumbnailUrl: "/generated/animations/projects/cmpwj6err0001l404vonqmj5x/final.mp4",
    mediaKind: "image",
    tags: ["fusion", "character"],
  },
  {
    id: "home-universe-1",
    service: "home",
    title: "Full production pipeline",
    description: "Editor → Studio → Motion → Publish in one HC project.",
    thumbnailUrl: "/generated/animations/projects/cmpwj6err0001l404vonqmj5x/final.mp4",
    mediaKind: "image",
    tags: ["pipeline", "hc"],
  },
];

export function listExamplesForService(service: HomeCheffExampleService): HomeCheffExample[] {
  return HOMECHEFF_EXAMPLES.filter((e) => e.service === service);
}

export function listAllExamples(): HomeCheffExample[] {
  return HOMECHEFF_EXAMPLES;
}

export function toFeaturedExperience(example: HomeCheffExample, sortOrder: number): FeaturedExperience {
  return {
    id: example.id,
    title: example.title,
    description: example.description,
    thumbnail: example.thumbnailUrl,
    video: example.mediaKind === "video" ? example.thumbnailUrl : example.mediaUrl,
    assistantPrompt: example.description,
    service: example.service,
    sortOrder,
    active: true,
  };
}

export function listFeaturedExperiences(): FeaturedExperience[] {
  return HOMECHEFF_EXAMPLES.map((row, index) => toFeaturedExperience(row, index));
}
