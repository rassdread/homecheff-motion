import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { WORKFLOWS_CONTENT } from "@/lib/seo/workflows-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/workflows";

export const metadata = buildPageMetadata({
  title: "Creator Workflows",
  description:
    "Workflows voor artists, filmmakers, writers, marketing, education, gaming en Creator Dreams in HomeCheff Studio.",
  path: PATH,
  locale: "nl",
});

export default function WorkflowsIndexPage() {
  const items = Object.values(WORKFLOWS_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="Creator Workflows"
      metaDescription="HomeCheff Studio workflow hubs."
      path={PATH}
      hubLabel="Workflows"
      h1="Workflows voor creators"
      intro="Kies je workflow: artist, filmmaker, writer, marketing, education, gaming of Creator Dreams. Elke hub linkt naar gidsen, vergelijkingen en de juiste Studio-entry."
      items={items}
    />
  );
}
