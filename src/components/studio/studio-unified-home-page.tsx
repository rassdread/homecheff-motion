"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import {
  STUDIO_HOME_ADVANCED_HREF,
  STUDIO_HOME_CONTINUE_MAX,
  STUDIO_HOME_INTENTS,
} from "@/lib/studio-slice1a-home";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { StudioAiHomeComposer } from "@/components/studio/studio-ai-home-composer";
import { creativeProjectKind } from "@/lib/studio-v23-intent";
import { fetchStudioAccountJson } from "@/lib/studio-account-client";
import type { UserStudioDashboardReport } from "@/types/studio-profitability";

type RecentCreativeProject = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  storyboardId?: string | null;
  animationProjectId?: string | null;
  editorCanvasProjectId?: string | null;
};

function trackStudioHomeEvent(event: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("hc-studio-analytics", { detail: { event } }));
  } catch {
    /* optional telemetry */
  }
}

function IntentCard({
  href,
  title,
  description,
  free,
  usesCredits,
  testId,
  analyticsEvent,
}: {
  href: string;
  title: string;
  description: string;
  free?: boolean;
  usesCredits?: boolean;
  testId: string;
  analyticsEvent: string;
}) {
  const t = useActiveTranslator();
  return (
    <Link
      href={href}
      prefetch={false}
      data-testid={testId}
      onClick={() => trackStudioHomeEvent(analyticsEvent)}
      className={`flex min-h-[72px] flex-col justify-center px-4 py-3 transition hover:border-[#006D52]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006D52] ${studioVisual.editorSurface}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-zinc-900">{title}</span>
        {free ?
          <span
            className="rounded-full bg-[#006D52]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#006D52]"
            data-testid={`${testId}-free-badge`}
          >
            {t("studio.slice1a.free.badge")}
          </span>
        : null}
        {usesCredits ?
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.slice1a.credits.uses")}
          </span>
        : null}
      </div>
      <span className="mt-0.5 text-xs text-zinc-600">{description}</span>
    </Link>
  );
}

/**
 * AI-first Studio home — progressive disclosure.
 * Above fold: brand + primary composer (+ compact inspiration inside composer).
 * Below fold: continue, then collapsed "all capabilities".
 */
export function StudioUnifiedHomePage() {
  const t = useActiveTranslator();
  const auth = useAuthSession();
  const [shell, setShell] = useState<UserStudioDashboardReport | null>(null);
  const [continueError, setContinueError] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentCreativeProject[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    trackStudioHomeEvent("studio_home_view");
  }, []);

  useEffect(() => {
    if (!auth.resolved || !auth.user) {
      queueMicrotask(() => setShell(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/me/studio-insights?view=shell", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setContinueError(true);
        return;
      }
      const data = (await res.json()) as { report: UserStudioDashboardReport };
      setShell(data.report);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.resolved, auth.user]);

  useEffect(() => {
    if (!auth.resolved || !auth.user) {
      queueMicrotask(() => {
        setRecentProjects([]);
        setCredits(null);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      const [projectsResponse, account] = await Promise.all([
        fetch("/api/studio/creative-projects?recent=1&limit=6", { credentials: "include", cache: "no-store" }),
        fetchStudioAccountJson({ view: "summary" }),
      ]);
      if (cancelled) return;
      if (projectsResponse.ok) {
        const body = (await projectsResponse.json()) as { projects?: RecentCreativeProject[] };
        setRecentProjects(body.projects ?? []);
      }
      const spendable = account?.canonicalBalance?.spendable;
      setCredits(typeof spendable === "number" ? spendable : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.resolved, auth.user]);

  const continueItems = (shell?.continueWorking ?? []).slice(0, STUDIO_HOME_CONTINUE_MAX);
  const hasContinue = continueItems.length > 0;

  return (
    <main
      className="min-h-[70vh] flex-1 overflow-x-hidden bg-gradient-to-b from-zinc-50 to-white pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]"
      data-testid="studio-unified-home"
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-6">
        <header className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
          <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52] [@media(max-height:500px)]:hidden">
            {brand.studioProductName}
          </p>
          <p className="sr-only">{t("studio.slice1a.hero.subtitle")}</p>
          </div>
          <Link
            href="/account/credits"
            data-testid="studio-v23-credits"
            className="inline-flex min-h-11 items-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800"
          >
            {credits == null ? t("studio.v23.credits") : `${credits} HC`}
          </Link>
        </header>

        <StudioAiHomeComposer />

        {auth.resolved && auth.user ? (
          <section className="mt-8 space-y-3" data-testid="studio-v23-recent">
            <h2 className="text-sm font-semibold text-zinc-900">{t("studio.v23.recent.title")}</h2>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("studio.v23.recent.empty")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                {recentProjects.map((project) => {
                  const kind = creativeProjectKind(project);
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/studio/projects/${project.id}`}
                        data-testid="studio-v23-recent-item"
                        className="flex min-h-[52px] flex-col justify-center gap-0.5 px-4 py-3 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-sm font-medium text-zinc-900">
                          {t(`studio.v23.recent.kind.${kind}`)} — {project.title}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {project.status} · {new Date(project.updatedAt).toLocaleString()} · {t("studio.v23.recent.continue")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {auth.resolved && auth.user && hasContinue ?
          <section className="mt-8 space-y-3" data-testid="studio-home-continue">
            <h2 className="text-sm font-semibold text-zinc-900">{t("studio.slice1a.continue.title")}</h2>
            <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
              {continueItems.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    data-testid="studio-home-continue-item"
                    onClick={() => trackStudioHomeEvent("studio_continue_open")}
                    className="flex min-h-[52px] flex-col justify-center gap-0.5 px-4 py-3 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006D52] sm:flex-row sm:items-center sm:justify-between"
                    aria-label={`${t(`studio.home.continueKind.${item.kind}` as never)} — ${item.title}`}
                  >
                    <span className="text-sm font-medium text-zinc-900">
                      {t(`studio.home.continueKind.${item.kind}` as never)} — {item.title}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        : continueError ?
          <p className="mt-6 text-sm text-zinc-500" data-testid="studio-home-continue-error">
            {t("studio.slice1a.continue.error")}
          </p>
        : null}

        <details className="mt-10 group" data-testid="studio-home-more">
          <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-h-[44px] items-center gap-2">
              {t("studio.aiHome.moreCapabilities")}
              <span aria-hidden className="text-zinc-400 transition group-open:rotate-90">
                ›
              </span>
            </span>
          </summary>

          <div className="mt-4 space-y-6 border-t border-zinc-100 pt-4">
            <section className="space-y-3" data-testid="studio-home-intents">
              <h2 className="text-sm font-semibold text-zinc-900">
                {t("studio.aiHome.shortcuts.title")}
              </h2>
              <p className="text-xs text-zinc-500">{t("studio.aiHome.shortcuts.subtitle")}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {STUDIO_HOME_INTENTS.map((intent) => (
                  <li key={intent.id}>
                    <IntentCard
                      href={intent.href}
                      title={t(intent.titleKey)}
                      description={t(intent.descriptionKey)}
                      free={intent.free}
                      usesCredits={intent.usesCredits}
                      testId={`studio-intent-${intent.id}`}
                      analyticsEvent={intent.analyticsEvent}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <p className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <Link
                href="/studio/simple"
                prefetch={false}
                data-testid="studio-home-simple"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                {t("studio.slice1a.simple.hub")} →
              </Link>
              <Link
                href={STUDIO_HOME_ADVANCED_HREF}
                prefetch={false}
                data-testid="studio-home-advanced"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                {t("studio.slice1a.advanced.tools")} →
              </Link>
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}
