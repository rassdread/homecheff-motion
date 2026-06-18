import { notFound } from "next/navigation";
import { SeoContentPageView } from "@/components/seo/seo-content-page";
import { USE_CASE_SLUGS, getUseCase } from "@/lib/seo/use-cases-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return USE_CASE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getUseCase(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    locale: page.locale,
  });
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const page = getUseCase(slug);
  if (!page) notFound();
  return <SeoContentPageView page={page} />;
}
