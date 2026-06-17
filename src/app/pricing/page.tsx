"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditPricingCatalog } from "@/components/billing/credit-pricing-catalog";
import { SubscriptionPlanCards } from "@/components/billing/subscription-plan-cards";
import {
  ConversionSurfacePricingSticky,
  GuestConversionStrip,
} from "@/components/billing/conversion-surface";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioCheckout } from "@/hooks/use-studio-checkout";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { brand } from "@/lib/brand";
import { SUBSCRIPTION_YEARLY_SAVINGS_PERCENT } from "@/lib/studio-subscription-billing";
import type { TranslationKey } from "@/i18n";

const FAQ_KEYS: { q: TranslationKey; a: TranslationKey }[] = [
  { q: "pricing.faq.q1", a: "pricing.faq.a1" },
  { q: "pricing.faq.q2", a: "pricing.faq.a2" },
  { q: "pricing.faq.q3", a: "pricing.faq.a3" },
  { q: "pricing.faq.q4", a: "pricing.faq.a4" },
  { q: "pricing.faq.q5", a: "pricing.faq.a5" },
  { q: "pricing.faq.q6", a: "pricing.faq.a6" },
];

export default function PricingPage() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const checkout = useStudioCheckout("/account/billing");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    trackBillingConversionEvent("pricing_view", { source: "pricing_page" });
  }, []);

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioGreen }}
          >
            {t("pricing.label")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("pricing.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{t("pricing.subtitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-800">
            {t("pricing.yearlySeo" as never, { percent: SUBSCRIPTION_YEARLY_SAVINGS_PERCENT })}
          </p>
        </header>

        {session.resolved && !session.user ? (
          <div className="mt-8">
            <GuestConversionStrip source="pricing_guest" variant="hero" theme="light" />
          </div>
        ) : null}

        <AppCard className="mt-8 border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-emerald-900">{t("pricing.carryTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-900/80">{t("pricing.carryBody")}</p>
        </AppCard>

        <AppCard className="mt-10 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-900">{t("pricing.plans.sectionTitle" as never)}</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {t("pricing.plans.sectionIntro" as never)}
          </p>
          <div className="mt-6">
            <SubscriptionPlanCards
              theme="light"
              loadingPlanId={checkout.loadingPackId}
              onSubscribe={(planId, interval) => {
                if (!session.user) {
                  window.location.href = `/signup?plan=${encodeURIComponent(planId)}&interval=${interval}`;
                  return;
                }
                void checkout.startCheckout("subscription", planId, { billingInterval: interval });
              }}
            />
            {checkout.error ? (
              <p className="mt-3 text-sm text-red-600">{checkout.error}</p>
            ) : null}
          </div>
        </AppCard>

        <div className="mt-10 space-y-6">
          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.credits.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.credits.body")}</p>
          </AppCard>

          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.motion.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.motion.body")}</p>
          </AppCard>

          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.studio.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.studio.body")}</p>
          </AppCard>

        <AppCard className="bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-900">{t("pricing.catalog.sectionTitle" as never)}</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {t("pricing.catalog.sectionIntro" as never)}
          </p>
          <div className="mt-6">
            <CreditPricingCatalog full showDescriptions />
          </div>
        </AppCard>

        <AppCard className="bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-900">{t("pricing.faq.title")}</h2>
            <ul className="mt-4 space-y-2">
              {FAQ_KEYS.map((row, index) => {
                const expanded = openFaq === index;
                return (
                  <li key={row.q} className="rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(expanded ? null : index)}
                      className="flex w-full min-h-[44px] items-start justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900"
                      aria-expanded={expanded}
                    >
                      <span>{t(row.q)}</span>
                      <span className="text-zinc-400">{expanded ? "−" : "+"}</span>
                    </button>
                    {expanded ? (
                      <p className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600">
                        {t(row.a)}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </AppCard>
        </div>

        {session.resolved && session.user ? <ConversionSurfacePricingSticky /> : null}

        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          {session.resolved && session.user ? (
            <>
              <Link
                href="/account/billing"
                prefetch={false}
                className="inline-flex min-h-[44px] items-center rounded-full border border-[#006D52]/30 bg-[#006D52]/5 px-6 py-3 text-sm font-semibold text-[#006D52] hover:bg-[#006D52]/10"
              >
                {t("pricing.billingLink")} →
              </Link>
              <Link
                href="/mijn-verbruik"
                prefetch={false}
                className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {t("pricing.usageLink")} →
              </Link>
            </>
          ) : (
            <GradientButton href="/signup" className="min-h-[44px] px-8">
              {t("nav.getStarted")}
            </GradientButton>
          )}
          <Link
            href="/"
            prefetch={false}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            {t("pricing.createLink")} →
          </Link>
        </div>
      </section>
    </main>
  );
}
