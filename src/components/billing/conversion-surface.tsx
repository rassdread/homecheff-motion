"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { InsufficientCreditsPanel } from "@/components/billing/insufficient-credits-panel";
import { useConversionSurface } from "@/hooks/use-conversion-surface";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { LOWEST_CREDIT_PACK_PRICE_EUR } from "@/lib/billing-conversion-utils";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { ConversionPageType, ConversionSurfaceVariant } from "@/types/conversion-surface";

const PLAN_KEYS: Record<string, string> = {
  free: "account.plan.free",
  creator: "account.plan.creator",
  pro: "account.plan.pro",
  studio: "account.plan.studio",
  enterprise: "account.plan.enterprise",
};

type ConversionSurfaceProps = {
  pageType: ConversionPageType;
  variant?: ConversionSurfaceVariant;
  source: string;
  estimatedCredits?: number;
  creditsUsedThisMonth?: number;
  actionLabel?: string;
  className?: string;
  trackImpression?: boolean;
};

export function ConversionSurface({
  pageType,
  variant = "inline",
  source,
  estimatedCredits,
  creditsUsedThisMonth,
  actionLabel,
  className = "",
  trackImpression = true,
}: ConversionSurfaceProps) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const { surface, wallet, session, loading } = useConversionSurface(pageType, {
    estimatedCredits,
    creditsUsedThisMonth,
    trackImpression,
  });

  if (loading) {
    return null;
  }

  if (!session.user) {
    return <GuestConversionStrip source={source} variant={variant} className={className} />;
  }

  const planKey = PLAN_KEYS[wallet.plan] ?? PLAN_KEYS.free;
  const planLabel = t(planKey as never);
  const creditsLabel = wallet.availableCredits.toLocaleString(locale);

  const headline = surface.headlineKey ? t(surface.headlineKey as never) : null;
  const body = surface.bodyKey ? t(surface.bodyKey as never) : null;

  if (surface.showInsufficientBlock && estimatedCredits != null) {
    return (
      <div className={className} data-testid="conversion-surface-insufficient">
        <InsufficientCreditsPanel
          estimatedCredits={estimatedCredits}
          availableCredits={wallet.availableCredits}
          actionLabel={actionLabel}
          source={source}
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <aside
        className={`rounded-2xl border border-white/15 bg-white/5 p-4 ${className}`}
        data-testid="conversion-surface-sidebar"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {t("billing.conversion.surface.creditsRemaining")}
        </p>
        <p className="mt-1 text-2xl font-bold text-white">
          {creditsLabel}
          <span className="ml-1 text-sm font-normal text-white/50">{t("account.credits.unit")}</span>
        </p>
        <BillingConversionCta
          source={source}
          layout="stacked"
          size="sm"
          showUpgrade={surface.showUpgradePlan}
          showViewPricing={surface.showViewPricing}
          buyLabel={t("billing.conversion.surface.topUpCredits")}
        />
      </aside>
    );
  }

  if (variant === "article-footer") {
    return (
      <footer
        className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center ${className}`}
        data-testid="conversion-surface-article-footer"
      >
        <p className="text-lg font-semibold text-zinc-900">{t("billing.conversion.surface.readyToCreate")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <BillingConversionCta
            source={source}
            showUpgrade={false}
            showViewPricing={surface.showViewPricing}
          />
          <Link
            href="/pricing"
            prefetch={false}
            onClick={() => trackBillingConversionEvent("pricing_view", { source })}
            className={`${studioVisual.btnOutline} inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-medium text-zinc-800`}
          >
            {t("billing.conversion.viewPlans")}
          </Link>
        </div>
      </footer>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-[#0067B1]/20 p-6 sm:p-8 ${className}`}
        data-testid="conversion-surface-hero"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          {t("billing.conversion.surface.homeEyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
          {t("billing.conversion.surface.homeTitle", { price: LOWEST_CREDIT_PACK_PRICE_EUR.toFixed(2) })}
        </h2>
        <p className="mt-2 text-sm text-white/75">{t("billing.conversion.surface.homeSubtitle")}</p>
        <ul className="mt-4 space-y-1 text-sm text-white/80">
          <li>• {t("billing.conversion.upgradeBenefit.carryOver")}</li>
          <li>• {t("billing.conversion.surface.prepaidAfterCancel")}</li>
        </ul>
        <div className="mt-5">
          <BillingConversionCta
            source={source}
            showUpgrade={surface.showUpgradePlan}
            showViewPricing={surface.showViewPricing}
          />
        </div>
      </div>
    );
  }

  if (variant === "sticky") {
    return (
      <div
        className={`sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#006D52]/30 bg-white p-4 shadow-lg ${className}`}
        data-testid="conversion-surface-sticky"
      >
        <p className="text-sm font-medium text-zinc-800">{t("billing.conversion.surface.stickyBuyCredits")}</p>
        <BillingConversionCta source={source} showUpgrade={false} size="sm" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`} data-testid="conversion-surface-compact">
        {estimatedCredits != null ? (
          <p className="text-sm text-zinc-600">
            {t("billing.conversion.estimatedCost", { credits: estimatedCredits })}
          </p>
        ) : null}
        <BillingConversionCta
          source={source}
          size="sm"
          showUpgrade={surface.showUpgradePlan}
          showViewPricing={surface.showViewPricing}
        />
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 ${className}`}
        data-testid="conversion-surface-banner"
      >
        {headline ? <p className="text-sm font-semibold text-amber-100">{headline}</p> : null}
        {body ? <p className="mt-1 text-sm text-amber-100/85">{body}</p> : null}
        <div className="mt-3">
          <BillingConversionCta
            source={source}
            layout="inline"
            size="sm"
            showUpgrade={surface.showUpgradePlan}
            showViewPricing={surface.showViewPricing}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${className}`}
      data-testid="conversion-surface-inline"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">
            {t("billing.conversion.availableCredits")}
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{creditsLabel}</p>
          <p className="mt-1 text-sm text-white/70">
            {t("account.wallet.planLabel")}: {planLabel}
          </p>
          {creditsUsedThisMonth != null ? (
            <p className="mt-1 text-xs text-white/50">
              {t("billing.conversion.creditsUsedPeriod")}: {creditsUsedThisMonth.toLocaleString(locale)}
            </p>
          ) : null}
          {estimatedCredits != null ? (
            <p className="mt-2 text-sm text-white/80">
              {t("billing.conversion.estimatedCost", { credits: estimatedCredits })}
            </p>
          ) : null}
        </div>
        <BillingConversionCta
          source={source}
          layout="stacked"
          showUpgrade={surface.showUpgradePlan}
          showViewPricing={surface.showViewPricing}
        />
      </div>
      {surface.showPromoCampaign && surface.promoPlanId ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white/90">
            {t(`billing.conversion.surface.recommendUpgrade.${surface.promoPlanId}` as never)}
          </p>
          <div className="mt-2">
            <BillingConversionCta source={`${source}_promo`} showUpgrade showViewPricing={false} size="sm" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

type GuestProps = {
  source: string;
  variant?: ConversionSurfaceVariant;
  className?: string;
  theme?: "dark" | "light";
};

export function GuestConversionStrip({
  source,
  variant = "inline",
  className = "",
  theme = "dark",
}: GuestProps) {
  const t = useActiveTranslator();
  const isLight = theme === "light";
  const titleClass = isLight ? "text-zinc-900" : "text-white";
  const bodyClass = isLight ? "text-zinc-600" : "text-white/70";

  useEffect(() => {
    trackBillingConversionEvent("conversion_surface_impression", { source });
  }, [source]);

  const inner = (
    <>
      <p className={`text-sm font-semibold ${titleClass}`}>{t("billing.conversion.guest.headline")}</p>
      <p className={`mt-1 text-sm ${bodyClass}`}>
        {t("billing.conversion.guest.body", { price: LOWEST_CREDIT_PACK_PRICE_EUR.toFixed(2) })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/signup"
          prefetch={false}
          className={`${studioVisual.btnPrimary} inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-medium`}
        >
          {t("billing.conversion.guest.createAccount")}
        </Link>
        <Link
          href="/pricing"
          prefetch={false}
          onClick={() => trackBillingConversionEvent("pricing_view", { source })}
          className={`${isLight ? "inline-flex min-h-[44px] items-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50" : studioVisual.btnOutline} inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-medium`}
        >
          {t("billing.conversion.viewPlans")}
        </Link>
      </div>
    </>
  );

  const shellClass = isLight
    ? "rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8"
    : variant === "hero"
      ? "rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8"
      : "rounded-xl border border-white/15 bg-white/5 p-4";

  return (
    <div
      className={`${shellClass} ${className}`}
      data-testid={variant === "hero" ? "conversion-surface-guest-hero" : "conversion-surface-guest"}
    >
      {inner}
    </div>
  );
}

export function ConversionSurfaceArticleFooter({ source = "knowledge_article" }: { source?: string }) {
  return <ConversionSurface pageType="knowledge" variant="article-footer" source={source} />;
}

export function ConversionSurfacePricingSticky({ source = "pricing_sticky" }: { source?: string }) {
  return <ConversionSurface pageType="pricing" variant="sticky" source={source} trackImpression={false} />;
}
