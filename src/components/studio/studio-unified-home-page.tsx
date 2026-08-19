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
import type { UserStudioDashboardReport } from "@/types/studio-profitability";

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
  hero = false,
}: {
  href: string;
  title: string;
  description: string;
  free?: boolean;
  usesCredits?: boolean;
  testId: string;
  analyticsEvent: string;
  hero?: boolean;
}) {
  const t = useActiveTranslator();
  return (
    <Link
      href={href}
      prefetch={false}
      data-testid={testId}
      onClick={() => trackStudioHomeEvent(analyticsEvent)}
      className={`flex min-h-[88px] flex-col justify-center px-5 py-4 transition hover:border-[#006D52]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006D52] ${studioVisual.editorSurface} ${
        hero ? "ring-1 ring-[#006D52]/25" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-zinc-900">{title}</span>
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
      <span className="mt-1 text-sm text-zinc-600">{description}</span>
      {free ?
        <span className="mt-2 text-xs text-[#006D52]" data-testid={`${testId}-free-detail`}>
          {t("studio.slice1a.free.onDevice")} · {t("studio.slice1a.free.noCredits")}
        </span>
      : null}
    </Link>
  );
}

export function StudioUnifiedHomePage() {
  const t = useActiveTranslator();
  const auth = useAuthSession();
  const [shell, setShell] = useState<UserStudioDashboardReport | null>(null);
  const [continueError, setContinueError] = useState(false);

  useEffect(() => {
    trackStudioHomeEvent("studio_home_view");
  }, []);

  useEffect(() => {
    if (!auth.resolved || !auth.user) {
      setShell(null);
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

  const continueItems = (shell?.continueWorking ?? []).slice(0, STUDIO_HOME_CONTINUE_MAX);
  const hasContinue = continueItems.length > 0;

  return (
    <main
      className="min-h-[70vh] flex-1 bg-gradient-to-b from-zinc-50 to-white"
      data-testid="studio-unified-home"
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            {brand.studioProductName}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {t("studio.slice1a.hero.title")}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-600">
            {t("studio.slice1a.hero.subtitle")}
          </p>
        </header>

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

        <section className="mt-8 space-y-3" data-testid="studio-home-intents">
          <h2 className="text-sm font-semibold text-zinc-900">
            {hasContinue ? t("studio.slice1a.createNew.title") : t("studio.slice1a.create.title")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
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
                  hero={intent.id === "quickVideo" && !hasContinue}
                />
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6">
          <Link
            href={STUDIO_HOME_ADVANCED_HREF}
            prefetch={false}
            data-testid="studio-home-advanced"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            {t("studio.slice1a.advanced.tools")} →
          </Link>
        </p>
      </div>
    </main>
  );
}
