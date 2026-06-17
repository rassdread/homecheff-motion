import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { ALTERNATIVES_CONTENT } from "@/lib/seo/alternatives-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/alternatives";

export const metadata = buildPageMetadata({
  title: "Software Alternatives for AI Video Production",
  description:
    "Compare HomeCheff Studio with Photoshop, Canva, CapCut, Premiere Pro, Runway, and more — story-first AI video production from idea to publish.",
  path: PATH,
});

export default function AlternativesIndexPage() {
  const items = Object.values(ALTERNATIVES_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="Software Alternatives"
      metaDescription="Compare HomeCheff Studio with popular creative tools."
      path={PATH}
      hubLabel="Alternatives"
      h1="HomeCheff Studio alternatives & comparisons"
      intro="Honest comparisons for creators evaluating AI video production. HomeCheff is a connected studio — storyboards, motion, voice, subtitles, translation, and publishing in one line."
      items={items}
    />
  );
}
