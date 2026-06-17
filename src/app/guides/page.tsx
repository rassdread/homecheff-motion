import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { GUIDES_CONTENT } from "@/lib/seo/guides-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/guides";

export const metadata = buildPageMetadata({
  title: "Creator Guides",
  description:
    "Gidsen voor creators: tekeningen animeren, eigen cartoon, anime, filmstudio, regisseur worden en meer met HomeCheff Studio.",
  path: PATH,
  locale: "nl",
});

export default function GuidesIndexPage() {
  const items = Object.values(GUIDES_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="Creator Guides"
      metaDescription="HomeCheff Studio creator guides in Dutch."
      path={PATH}
      hubLabel="Gidsen"
      h1="Creator guides"
      intro="Van tekening tot animatie, van verhaal tot video, van cartoon tot animatieserie — praktische gidsen voor HomeCheff Studio."
      items={items}
    />
  );
}
