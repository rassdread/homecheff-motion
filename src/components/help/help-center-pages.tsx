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
import { brand } from "@/lib/brand";

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

        <div className="mt-10">
          <ConversionSurfaceArticleFooter source="help_home" />
        </div>
      </section>
    </main>
  );
}

export function HelpArticleView({ article }: { article: HelpArticle }) {
  const t = useActiveTranslator();

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

        <div className="mt-10">
          <ConversionSurfaceArticleFooter source={`help_${article.slug}`} />
        </div>
      </article>
    </main>
  );
}
