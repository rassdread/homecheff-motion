"use client";

import Link from "next/link";
import { ConversionSurfaceArticleFooter } from "@/components/billing/conversion-surface";
import { CreditPricingCatalog } from "@/components/billing/credit-pricing-catalog";
import { useActiveTranslator } from "@/i18n/client";
import {
  HELP_CENTER_CATEGORIES,
  type HelpArticle,
  helpCategoryLabelKey,
  listHelpArticlesByCategory,
} from "@/lib/help-center";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { brand } from "@/lib/brand";

const PRODUCT_HUB_LINKS = [
  { href: PUBLIC_PAGE_SEO.studio.path, labelKey: "suite.nav.studio" as const },
  { href: PUBLIC_PAGE_SEO.motion.path, labelKey: "suite.nav.motion" as const },
  { href: PUBLIC_PAGE_SEO.editor.path, labelKey: "suite.nav.editor" as const },
  { href: PUBLIC_PAGE_SEO.pricing.path, labelKey: "pricing.label" as const },
  { href: PUBLIC_PAGE_SEO.library.path, labelKey: "suite.nav.library" as const },
  { href: PUBLIC_PAGE_SEO.projects.path, labelKey: "suite.nav.projects" as const },
] as const;

export function HelpCenterHome() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {t("help.home.label" as never)}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            {t("help.home.title" as never)}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            {t("help.home.intro" as never)}
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {HELP_CENTER_CATEGORIES.map((category) => {
            const articles = listHelpArticlesByCategory(category);
            if (articles.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="text-lg font-bold text-zinc-900">
                  {t(helpCategoryLabelKey(category) as never)}
                </h2>
                <ul className="mt-3 space-y-2">
                  {articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/help/${article.slug}`}
                        className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-emerald-300 hover:shadow-sm"
                      >
                        {t(article.titleKey as never)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <nav className="mt-10 rounded-xl border border-zinc-200 bg-white p-5" aria-label="Product areas">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("help.home.productAreas" as never)}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PRODUCT_HUB_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  {t(link.labelKey as never)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10">
          <ConversionSurfaceArticleFooter source="help_home" />
        </div>
      </section>
    </main>
  );
}

export function HelpArticleView({ article }: { article: HelpArticle }) {
  const t = useActiveTranslator();
  const relatedArticles = listHelpArticlesByCategory(article.category).filter(
    (item) => item.slug !== article.slug
  );

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <Link href="/help" className="text-sm font-medium text-emerald-700 hover:underline">
          {t("help.article.back" as never)}
        </Link>
        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {t(helpCategoryLabelKey(article.category) as never)}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            {t(article.titleKey as never)}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            {t(article.descriptionKey as never)}
          </p>
        </header>

        <div className="prose prose-zinc mt-8 max-w-none space-y-4 text-sm leading-relaxed text-zinc-700">
          {article.bodyKeys.map((key) => (
            <p key={key}>{t(key as never)}</p>
          ))}
          {article.pricingCatalog ?
            <div className="not-prose mt-6 rounded-xl border border-zinc-200 bg-white p-4">
              <CreditPricingCatalog compact />
            </div>
          : null}
        </div>

        {relatedArticles.length > 0 ? (
          <nav className="mt-10 rounded-xl border border-zinc-200 bg-white p-5" aria-label="Related articles">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("help.article.related" as never)}
            </h2>
            <ul className="mt-3 space-y-2">
              {relatedArticles.map((related) => (
                <li key={related.slug}>
                  <Link
                    href={`/help/${related.slug}`}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    {t(related.titleKey as never)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-10">
          <ConversionSurfaceArticleFooter source={`help_${article.slug}`} />
        </div>
      </article>
    </main>
  );
}
