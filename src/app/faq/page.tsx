import type { Metadata } from "next";
import Link from "next/link";
import { getTranslator, type TranslationKey } from "@/i18n";
import { resolveStudioRequestLocale } from "@/i18n/request-locale";
import { STUDIO_PUBLIC_FAQ } from "@/lib/studio-public-faq";

function faqKey(id: string, part: "q" | "a"): TranslationKey {
  return `faq.${part}.${id}` as TranslationKey;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveStudioRequestLocale();
  const t = getTranslator(locale);
  const title = t("faq.meta.title");
  const description = t("faq.meta.description");
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: "/faq" },
    openGraph: {
      title,
      description,
      url: "https://studio.homecheff.eu/faq",
      locale: locale === "nl" ? "nl_NL" : "en_GB",
    },
  };
}

export default async function StudioFaqPage() {
  const locale = await resolveStudioRequestLocale();
  const t = getTranslator(locale);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-semibold text-zinc-900">{t("faq.title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        {t("faq.intro")}{" "}
        <Link href="/terms" className="underline">
          {t("faq.terms")}
        </Link>
        ,{" "}
        <Link href="/privacy" className="underline">
          {t("faq.privacy")}
        </Link>{" "}
        {t("faq.and")}{" "}
        <Link href="/help" className="underline">
          {t("faq.help")}
        </Link>
        .
      </p>
      <div className="mt-10 space-y-8">
        {STUDIO_PUBLIC_FAQ.map((item) => (
          <section key={item.id} id={item.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-zinc-900">{t(faqKey(item.id, "q"))}</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{t(faqKey(item.id, "a"))}</p>
            {item.legalSource ? (
              <p className="mt-2 text-xs text-zinc-500">
                {t("faq.source")}: {item.legalSource}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/pricing" className="underline">
          {t("faq.pricing")}
        </Link>
        <Link href="/cookies" className="underline">
          {t("faq.cookies")}
        </Link>
        <a href="mailto:support@homecheff.eu" className="underline">
          {t("faq.contact")}
        </a>
      </nav>
    </main>
  );
}
