"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { studioCareersHref } from "@/lib/affiliate/studio-ecosystem-nav";

/**
 * Site legal/trust footer for marketing and account shells.
 * Intentionally lightweight — no fake security claims.
 */
export function StudioSiteFooter() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-700">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-900">{brand.studioProductName}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("footer.partOf")}</p>
          <p className="mt-2 max-w-md text-xs text-zinc-500">{t("footer.everybodyEats")}</p>
        </div>
        <nav aria-label={t("footer.legalAria")} className="grid grid-cols-2 gap-x-8 gap-y-2 sm:text-right">
          <Link href="/pricing" className="underline-offset-2 hover:underline">
            {t("nav.pricing")}
          </Link>
          <Link href="/faq" className="underline-offset-2 hover:underline">
            {t("footer.faq")}
          </Link>
          <Link href="/help" className="underline-offset-2 hover:underline">
            {t("footer.help")}
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            {t("footer.privacy")}
          </Link>
          <Link href="/cookies" className="underline-offset-2 hover:underline">
            {t("footer.cookies")}
          </Link>
          <Link href="/about" className="underline-offset-2 hover:underline">
            {t("nav.about")}
          </Link>
          <a href="https://homecheff.eu/ecosystem" className="underline-offset-2 hover:underline">
            {t("footer.ecosystem")}
          </a>
          <a
            href={studioCareersHref(locale)}
            data-studio-careers
            className="underline-offset-2 hover:underline"
          >
            {t("footer.careers")}
          </a>
          <a href="https://growth.homecheff.eu/legal/credits-terms" className="underline-offset-2 hover:underline">
            {t("footer.hcCredits")}
          </a>
          <a href="mailto:support@homecheff.eu" className="underline-offset-2 hover:underline">
            {t("footer.contact")}
          </a>
          <a href="https://homecheff.eu/affiliate?product=studio#commissies" className="underline-offset-2 hover:underline">
            {t("footer.affiliate")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
