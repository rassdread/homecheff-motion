"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { TranslationKey } from "@/i18n";

const FAQ_KEYS: { q: TranslationKey; a: TranslationKey }[] = [
  { q: "account.billing.faq.q1", a: "account.billing.faq.a1" },
  { q: "account.billing.faq.q2", a: "account.billing.faq.a2" },
  { q: "account.billing.faq.q3", a: "account.billing.faq.a3" },
  { q: "account.billing.faq.q4", a: "account.billing.faq.a4" },
  { q: "account.billing.faq.q5", a: "account.billing.faq.a5" },
];

type Props = {
  variant?: "billing" | "wallet";
  planDiscountPercent?: number;
};

export function BillingEducationPanel({ variant = "billing", planDiscountPercent }: Props) {
  const t = useActiveTranslator();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <h3 className="text-sm font-semibold text-emerald-100">{t("account.billing.carryTitle")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">{t("account.billing.carryBody")}</p>
        {planDiscountPercent != null && planDiscountPercent > 0 ? (
          <p className="mt-3 text-sm text-emerald-100/80">
            {t("account.billing.planSavingsNote", { percent: planDiscountPercent })}
          </p>
        ) : null}
      </section>

      {variant === "wallet" ? (
        <section className={`${studioVisual.cardOnDark} p-5`}>
          <h3 className="text-sm font-semibold text-white">{t("account.billing.walletHelpTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{t("account.billing.walletHelpBody")}</p>
        </section>
      ) : null}

      <section className={`${studioVisual.cardOnDark} p-5`}>
        <h3 className="text-sm font-semibold text-white">{t("account.billing.faqTitle")}</h3>
        <ul className="mt-3 space-y-2">
          {FAQ_KEYS.map((row, index) => {
            const expanded = openFaq === index;
            return (
              <li key={row.q} className="rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setOpenFaq(expanded ? null : index)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-white"
                  aria-expanded={expanded}
                >
                  <span>{t(row.q)}</span>
                  <span className="text-white/50">{expanded ? "−" : "+"}</span>
                </button>
                {expanded ? (
                  <p className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-white/70">
                    {t(row.a)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
