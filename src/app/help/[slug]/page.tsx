import { notFound } from "next/navigation";
import { HelpArticleView } from "@/components/help/help-center-pages";
import { getHelpArticle } from "@/lib/help-center";
import { buildArticleJsonLd, buildPageMetadata } from "@/lib/seo/site-metadata";
import { getActiveTranslator } from "@/i18n";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return {};
  const t = await getActiveTranslator();
  return buildPageMetadata({
    title: t(article.titleKey as never),
    description: t(article.descriptionKey as never),
    path: `/help/${slug}`,
  });
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  const t = await getActiveTranslator();
  const jsonLd = buildArticleJsonLd({
    title: t(article.titleKey as never),
    description: t(article.descriptionKey as never),
    path: `/help/${slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HelpArticleView article={article} />
    </>
  );
}
