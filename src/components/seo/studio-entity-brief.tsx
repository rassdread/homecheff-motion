"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";

/** Crawlable entity brief. Copy follows the same locale as the rest of the page. */
export function StudioEntityBrief() {
  const t = useActiveTranslator();
  return (
    <section
      aria-labelledby="studio-entity-heading"
      className="border-t border-zinc-200/80 bg-zinc-50/90 px-6 py-10 text-zinc-700"
    >
      <div className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed">
        <h2 id="studio-entity-heading" className="text-base font-semibold text-zinc-900">
          {t("entity.whatIs")}
        </h2>
        <p>{t("entity.p1")}</p>
        <p>{t("entity.p2")}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="https://homecheff.eu/ecosystem" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            {t("footer.ecosystem")}
          </Link>
          <Link href="https://homecheff.eu/" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            {t("entity.marketplace")}
          </Link>
          <Link href="https://growth.homecheff.eu/" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            {t("entity.growth")}
          </Link>
          <Link href="https://homecheff.eu/affiliate?product=studio#commissies" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            {t("footer.affiliate")}
          </Link>
          <Link href="/about" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            {t("entity.about")}
          </Link>
        </p>
      </div>
    </section>
  );
}
