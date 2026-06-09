"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { brand } from "@/lib/brand";
import { HOMECHEFF_PRODUCT_DEFINITIONS, resolveProductHref } from "@/lib/homecheff-product-suite";

const SUITE_START_PRODUCTS = ["editor", "studio", "motion", "presentation", "assets"] as const;

export function SuiteStartPage() {
  const t = useActiveTranslator();
  const editorHref = useAuthActionHref("/editor");
  const studioHref = useAuthActionHref("/studio");
  const motionHref = useAuthActionHref("/animate/instant");
  const publishHref = useAuthActionHref("/publish");
  const libraryHref = useAuthActionHref("/library");

  const hrefByProduct: Record<string, string> = {
    editor: editorHref,
    studio: studioHref,
    motion: motionHref,
    presentation: publishHref,
    assets: libraryHref,
  };

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{t("suite.start.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("suite.start.lead")}</p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SUITE_START_PRODUCTS.map((id) => {
            const def = HOMECHEFF_PRODUCT_DEFINITIONS.find((p) => p.id === id);
            if (!def) {
              return null;
            }
            return (
              <AppCard key={id} className="border-zinc-200/80 bg-white p-6">
                <h2 className="text-lg font-bold text-zinc-900">{t(def.labelKey as never)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t(def.descriptionKey as never)}</p>
                <Link
                  href={hrefByProduct[id] ?? resolveProductHref(id)}
                  prefetch={false}
                  className="mt-4 inline-flex rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/10"
                >
                  {t(def.labelKey as never)}
                </Link>
              </AppCard>
            );
          })}
        </div>
      </section>
    </main>
  );
}
