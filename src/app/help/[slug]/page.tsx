import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { HelpArticleView } from "@/components/help/help-center-pages";
import { getHelpArticle, helpCategoryLabelKey } from "@/lib/help-center";
import { buildHelpArticleJsonLd } from "@/lib/seo/structured-data";
import { buildPageMetadata } from "@/lib/seo/site-metadata";
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
  const title = t(article.titleKey as never);
  const description = t(article.descriptionKey as never);
  const categoryLabel = t(helpCategoryLabelKey(article.category) as never);
  const path = `/help/${slug}`;

  return (
    <>
      <JsonLd
        data={buildHelpArticleJsonLd({
          title,
          description,
          path,
          categoryLabel,
        })}
      />
      <HelpArticleView article={article} />
    </>
  );
}
