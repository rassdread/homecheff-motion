import { JsonLd } from "@/components/seo/json-ld";
import { CommercialSeoEnrichment } from "@/components/seo/commercial-seo-enrichment";
import {
  buildMotionVideoObjectJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo/structured-data";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.motion;

export const metadata = buildPageMetadata({
  title: seo.title,
  description: seo.description,
  path: seo.path,
});

const MOTION_SCHEMA = [
  buildMotionVideoObjectJsonLd(),
  buildSoftwareApplicationJsonLd({
    path: seo.path,
    name: "HomeCheff Image to Video",
    description: seo.description,
    featureList: [
      "Image-to-video AI motion",
      "Storyboard scene handoff",
      "Social and campaign exports",
      "Integrated Studio Credits",
    ],
  }),
];

export default function MotionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={MOTION_SCHEMA} />
      {children}
      <CommercialSeoEnrichment variant="motion" />
    </>
  );
}
