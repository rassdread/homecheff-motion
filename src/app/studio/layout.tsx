import { JsonLd } from "@/components/seo/json-ld";
import { CommercialSeoEnrichment } from "@/components/seo/commercial-seo-enrichment";
import { buildSoftwareApplicationJsonLd } from "@/lib/seo/structured-data";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.studio;

export const metadata = buildPageMetadata({
  title: seo.title,
  description: seo.description,
  path: seo.path,
});

const STUDIO_SCHEMA = buildSoftwareApplicationJsonLd({
  path: seo.path,
  name: "HomeCheff Studio",
  description: seo.description,
  featureList: [
    "AI storyboard and scene planning",
    "Reusable character and world library",
    "Voice, subtitles, and translation",
    "Image-to-video motion handoff",
    "Multi-channel publishing",
    "Transparent Studio Credits pricing",
  ],
});

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={STUDIO_SCHEMA} />
      {children}
      <CommercialSeoEnrichment variant="studio" />
    </>
  );
}
