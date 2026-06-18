import { SeoContentHubPage } from "@/components/seo/seo-content-hub-page";
import { INDUSTRIES_CONTENT } from "@/lib/seo/industries-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const PATH = "/industries";

export const metadata = buildPageMetadata({
  title: "AI Video by Industry",
  description:
    "Industry-specific AI video for food, fashion, SaaS, healthcare, and more — HomeCheff Studio storyboards, motion, and publishing.",
  path: PATH,
});

export default function IndustriesIndexPage() {
  const items = Object.values(INDUSTRIES_CONTENT).map((p) => ({
    href: p.path,
    label: p.h1,
  }));

  return (
    <SeoContentHubPage
      title="AI Video by Industry"
      metaDescription="Marketing and product video playbooks by industry."
      path={PATH}
      hubLabel="Industries"
      h1="AI video by industry"
      intro="Every industry has different proof points, compliance needs, and visual language. These hubs map HomeCheff Studio to your category — from hook to CTA."
      items={items}
    />
  );
}
