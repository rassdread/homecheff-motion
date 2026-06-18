import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { USE_CASES_CONTENT } from "@/lib/seo/use-cases-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/use-cases";

export const metadata = buildPageMetadata({
  title: "AI Video Use Cases",
  description:
    "AI video for schools, nonprofits, ecommerce, creators, and more — story-first production with HomeCheff Studio.",
  path: PATH,
});

export default function UseCasesIndexPage() {
  const items = Object.values(USE_CASES_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="AI Video Use Cases"
      metaDescription="Sector-specific AI video workflows with HomeCheff Studio."
      path={PATH}
      hubLabel="Use cases"
      h1="AI video use cases"
      intro="From classrooms to crowdfunding — storyboarded video with voice, subtitles, and publishing. Pick your sector and follow a production line built for repeat output."
      items={items}
    />
  );
}
