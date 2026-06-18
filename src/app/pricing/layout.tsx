import { JsonLd } from "@/components/seo/json-ld";
import { CommercialSeoEnrichment } from "@/components/seo/commercial-seo-enrichment";
import {
  buildFaqPageJsonLd,
  buildPricingProductJsonLd,
  PRICING_FAQ_SCHEMA,
} from "@/lib/seo/structured-data";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.pricing;

export const metadata = buildPageMetadata({
  title: seo.title,
  description: seo.description,
  path: seo.path,
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[buildPricingProductJsonLd(), buildFaqPageJsonLd(PRICING_FAQ_SCHEMA)]} />
      {children}
      <CommercialSeoEnrichment variant="pricing" />
    </>
  );
}
