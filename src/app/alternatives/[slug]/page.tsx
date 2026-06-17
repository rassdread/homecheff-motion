import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoContentPageView } from "@/components/seo/seo-content-page";
import {
  ALTERNATIVE_SLUGS,
  ALTERNATIVES_CONTENT,
  getAlternative,
} from "@/lib/seo/alternatives-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ALTERNATIVE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getAlternative(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    locale: page.locale,
  });
}

export default async function AlternativePage({ params }: Props) {
  const { slug } = await params;
  const page = getAlternative(slug);
  if (!page) notFound();
  return <SeoContentPageView page={page} />;
}
