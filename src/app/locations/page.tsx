import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { LOCATIONS_CONTENT } from "@/lib/seo/locations-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/locations";

export const metadata = buildPageMetadata({
  title: "AI Video Generator by City — Netherlands",
  description:
    "Create AI video in Dutch cities with HomeCheff Studio — storyboards, motion, voice, subtitles, and publishing for local businesses and creators.",
  path: PATH,
});

export default function LocationsIndexPage() {
  const items = Object.values(LOCATIONS_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="AI Video by Location"
      metaDescription="Local AI video production guides for cities across the Netherlands."
      path={PATH}
      hubLabel="Locations"
      h1="AI video generator by city"
      intro="HomeCheff Studio runs in the browser — produce storyboarded video for your local market in Rotterdam, Amsterdam, Utrecht, and more. No film crew required for weekly social and marketing deliverables."
      items={items}
    />
  );
}
