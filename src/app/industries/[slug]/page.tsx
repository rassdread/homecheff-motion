import { notFound } from "next/navigation";
import { SeoContentPageView } from "@/components/seo/seo-content-page";
import { INDUSTRY_SLUGS, getIndustry } from "@/lib/seo/industries-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getIndustry(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    locale: page.locale,
  });
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const page = getIndustry(slug);
  if (!page) notFound();
  return <SeoContentPageView page={page} />;
}
