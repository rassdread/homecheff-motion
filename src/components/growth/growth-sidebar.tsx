"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AssistantHistoryPanel } from "@/components/assistant/assistant-history-panel";
import { AssistantChatPanel } from "@/components/assistant/assistant-chat-panel";
import { AssistantRecommendationCards } from "@/components/assistant/assistant-recommendation-cards";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { loginHref } from "@/lib/auth-login-href";
import { buildPublicHomepageDiscoveryRecommendations } from "@/lib/growth-sidebar-public-discovery";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  pickGrowthSidebarCtaBlock,
  resolveGrowthCtaRecommendation,
} from "@/lib/growth-sidebar-cta";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

function GrowthSidebarSection({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section className="border-b border-zinc-100 px-4 py-4" data-testid={testId}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

type Props = {
  variant?: "sidebar" | "sheet";
  onClose?: () => void;
};

export function GrowthSidebar({ variant = "sidebar", onClose }: Props) {
  const t = useActiveTranslator();
  const pathname = usePathname();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const { suggestions, startRecommendation, loadingContext, memory } = useHomeCheffAssistant();
  const isSheet = variant === "sheet";
  const loginLink = loginHref(pathname);

  const forYou = useMemo(
    () =>
      suggestions.filter(
        (row) =>
          row.category === "for_you" ||
          row.category === "continue_working" ||
          row.category === "quick_starts"
      ),
    [suggestions]
  );

  const discover = useMemo(
    () => suggestions.filter((row) => row.category === "hidden_possibilities"),
    [suggestions]
  );

  const trending = useMemo(
    () => suggestions.filter((row) => row.category === "trending"),
    [suggestions]
  );

  const ctaBlock = useMemo(
    () => pickGrowthSidebarCtaBlock(memory.recommendationSessionSeed ?? pathname),
    [memory.recommendationSessionSeed, pathname]
  );

  const ctaRecommendation = useMemo(
    () => resolveGrowthCtaRecommendation(ctaBlock, suggestions),
    [ctaBlock, suggestions]
  );

  const publicDiscovery = useMemo(() => {
    if (!isAuthenticated) {
      return buildPublicHomepageDiscoveryRecommendations();
    }
    return [...discover, ...trending].filter(
      (row, index, list) => list.findIndex((item) => item.id === row.id) === index
    );
  }, [discover, trending, isAuthenticated]);

  const handleRecommendationSelect = useCallback(
    (recommendation: AssistantRecommendation) => {
      if (!isAuthenticated) {
        window.location.assign(loginLink);
        return;
      }
      startRecommendation(recommendation);
    },
    [isAuthenticated, loginLink, startRecommendation]
  );

  const handleCtaClick = useCallback(() => {
    if (!isAuthenticated) {
      window.location.assign(loginLink);
      return;
    }
    if (ctaRecommendation) {
      startRecommendation(ctaRecommendation);
      return;
    }
    const fallback = suggestions.find((row) => row.id === ctaBlock.recommendationId);
    if (fallback) {
      startRecommendation(fallback);
    }
  }, [ctaBlock.recommendationId, ctaRecommendation, isAuthenticated, loginLink, startRecommendation, suggestions]);

  return (
    <aside
      className={`flex flex-col bg-white ${isSheet ? "h-full min-h-0" : "min-h-full"}`}
      data-testid="growth-sidebar"
      aria-label={t("assistant.title" as never)}
    >
      {!isSheet ? (
        <header className="shrink-0 border-b border-zinc-100 bg-gradient-to-r from-[#006D52]/5 to-[#0067B1]/5 px-4 py-3">
          <h2 className="text-sm font-bold text-zinc-900">{t("assistant.title" as never)}</h2>
          <p className="text-[11px] text-zinc-500">
            {t("assistant.growth.sidebarSubtitle" as never)}
          </p>
        </header>
      ) : null}

      <div
        className={`flex flex-col ${isSheet ? "min-h-0 flex-1 overflow-y-auto" : ""}`}
      >
        <section
          className={`flex shrink-0 flex-col border-b border-zinc-100 px-4 py-3 ${
            isSheet ? "min-h-[200px] max-h-[36vh]" : "max-h-[min(38vh,420px)] min-h-[220px]"
          }`}
          data-testid="growth-sidebar-chat"
        >
          <AssistantChatPanel sidebarMode onClose={onClose} />
        </section>

        <AssistantHistoryPanel />

        {!isAuthenticated ? (
          <GrowthSidebarSection
            title={t("assistant.growth.public.title" as never)}
            subtitle={t("assistant.growth.public.subtitle" as never)}
            testId="growth-sidebar-public-discovery"
          >
            <AssistantRecommendationCards
              items={publicDiscovery}
              onSelect={handleRecommendationSelect}
              compact
            />
          </GrowthSidebarSection>
        ) : null}

        {isAuthenticated && !loadingContext && forYou.length > 0 ? (
          <GrowthSidebarSection
            title={t("assistant.recommendations.title" as never)}
            subtitle={t("assistant.recommendations.subtitle" as never)}
            testId="growth-sidebar-for-you"
          >
            <AssistantRecommendationCards items={forYou.slice(0, 6)} onSelect={handleRecommendationSelect} />
          </GrowthSidebarSection>
        ) : null}

        {isAuthenticated && !loadingContext && discover.length > 0 ? (
          <GrowthSidebarSection
            title={t("assistant.growth.discover.title" as never)}
            subtitle={t("assistant.growth.discover.subtitle" as never)}
            testId="growth-sidebar-discover"
          >
            <AssistantRecommendationCards
              items={discover.slice(0, 5)}
              onSelect={handleRecommendationSelect}
              compact
            />
          </GrowthSidebarSection>
        ) : null}

        {isAuthenticated && !loadingContext && trending.length > 0 ? (
          <GrowthSidebarSection
            title={t("assistant.growth.trending.title" as never)}
            subtitle={t("assistant.growth.trending.subtitle" as never)}
            testId="growth-sidebar-trending"
          >
            <AssistantRecommendationCards
              items={trending.slice(0, 5)}
              onSelect={handleRecommendationSelect}
              compact
            />
          </GrowthSidebarSection>
        ) : null}

        {!isAuthenticated ? (
          <section className="border-b border-zinc-100 px-4 py-4" data-testid="growth-sidebar-login-cta">
            <p className="text-sm font-semibold text-zinc-900">
              {t("assistant.growth.public.loginTitle" as never)}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {t("assistant.growth.public.loginHint" as never)}
            </p>
            <Link
              href={loginLink}
              className={`${studioVisual.btnGradientPrimary} mt-3 inline-flex px-4 py-2 text-xs`}
              data-testid="growth-sidebar-login-button"
            >
              {t("assistant.growth.public.loginCta" as never)}
            </Link>
          </section>
        ) : null}

        <section className="px-4 py-4" data-testid="growth-sidebar-cta">
          <div className="overflow-hidden rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#006D52]/8 via-white to-[#0067B1]/10 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0067B1]">
              {t(ctaBlock.badgeKey as never)}
            </p>
            <div className="mt-2 flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                {ctaBlock.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {t(ctaBlock.titleKey as never)}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {t(ctaBlock.descriptionKey as never)}
                </p>
                <button
                  type="button"
                  className={`${studioVisual.btnGradientPrimary} mt-3 px-4 py-2 text-xs`}
                  data-testid="growth-sidebar-cta-button"
                  onClick={handleCtaClick}
                >
                  {t(ctaBlock.actionKey as never)}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
