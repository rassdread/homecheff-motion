"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConversionSurface } from "@/components/billing/conversion-surface";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { StudioVideoIntent } from "@/types/studio-video-production";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { UserStudioDashboardReport } from "@/types/studio-profitability";

const StudioProductionOrchestratorPanel = dynamic(
  () =>
    import("@/components/studio/studio-production-orchestrator-panel").then(
      (m) => m.StudioProductionOrchestratorPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5" aria-hidden />
    ),
  }
);

const QUICK_LINKS = [
  { href: "/studio/storyboards/new", labelKey: "studio.shell.newStory", emoji: "✨" },
  { href: "/studio/start", labelKey: "studio.orchestrator.createVideo", emoji: "🎬" },
  { href: "/studio/characters/new", labelKey: "studio.home.quick.character", emoji: "🎭" },
  { href: "/studio/props/new", labelKey: "studio.home.quick.prop", emoji: "📦" },
  { href: "/studio/locations/new", labelKey: "studio.home.quick.location", emoji: "📍" },
  { href: "/studio/worlds/new", labelKey: "studio.home.quick.world", emoji: "🌍" },
  { href: "/studio/assets", labelKey: "studio.home.quick.library", emoji: "🗂️" },
] as const;

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={studioVisual.editorSurface}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function AssetCountLink({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[44px] items-center justify-between px-4 py-3 transition hover:shadow-md ${studioVisual.editorSurface}`}
    >
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <span className="text-sm font-semibold text-[#006D52]">{count}</span>
    </Link>
  );
}

type Props = {
  /** When true, omits outer page shell (used inside /studio root). */
  embedded?: boolean;
  hcProject?: HomeCheffProjectPackage | null;
  onProjectChange?: (project: HomeCheffProjectPackage) => void;
  initialIntent?: StudioVideoIntent | null;
  initialIdea?: string;
  initialCharacterId?: string | null;
  initialAutoProduce?: boolean;
};

export function StudioHomeDashboard({
  embedded = false,
  hcProject = null,
  onProjectChange,
  initialIntent,
  initialIdea,
  initialCharacterId,
  initialAutoProduce = false,
}: Props) {
  const t = useActiveTranslator();
  const [shell, setShell] = useState<UserStudioDashboardReport | null>(null);
  const [report, setReport] = useState<UserStudioDashboardReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      queueMicrotask(() => setError(""));
      // Tier 1: shell (continue + counts) — no registry / month insights.
      const shellRes = await fetch("/api/me/studio-insights?view=shell", { cache: "no-store" });
      if (cancelled) {
        return;
      }
      if (!shellRes.ok) {
        queueMicrotask(() => setError(t("studio.home.error.loadFailed")));
        return;
      }
      const shellData = (await shellRes.json()) as { report: UserStudioDashboardReport };
      queueMicrotask(() => setShell(shellData.report));

      // Tier 2: full dashboard (usage, libraryCounts, activity) — after shell usable.
      const fullRes = await fetch("/api/me/studio-insights?view=dashboard", { cache: "no-store" });
      if (cancelled || !fullRes.ok) {
        return;
      }
      const fullData = (await fullRes.json()) as { report: UserStudioDashboardReport };
      queueMicrotask(() => setReport(fullData.report));
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const view = report ?? shell;

  const content = (
    <section className={embedded ? "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8" : "mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6"}>
      {error ?
        <p className="text-sm text-red-700">{error}</p>
      : (
        <div className="space-y-8">
          <header>
            <p className={studioVisual.eyebrowOnDark}>{t("studio.home.eyebrow")}</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t("studio.home.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{t("studio.home.subtitle")}</p>
          </header>

          <div className="flex flex-col gap-3 sm:flex-row" data-testid="px3-studio-home-create">
            <Link
              href="/studio/experience"
              className={`${studioVisual.btnGradientPrimary} min-h-[44px] w-full sm:w-auto`}
            >
              {t("studio.experience.chooser.title")}
            </Link>
          </div>

          {view && view.continueWorking.length > 0 ?
            <div data-testid="px3-studio-home-continue">
              <h3 className="text-sm font-semibold text-white/90">{t("studio.home.continueWorking")}</h3>
              <ul className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                {view.continueWorking.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="flex min-h-[48px] flex-col justify-center gap-0.5 px-4 py-3 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
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
            </div>
          : !view ?
            <p className="text-sm text-white/70">{t("studio.home.loading")}</p>
          : null}

          <StudioProductionOrchestratorPanel
            hcProject={hcProject}
            onProjectChange={onProjectChange}
            initialIntent={initialIntent}
            initialIdea={initialIdea}
            initialCharacterId={initialCharacterId}
            initialAutoProduce={initialAutoProduce}
          />

          <OnboardingChecklist />

          <ConversionSurface
            pageType="studio_dashboard"
            variant="inline"
            source="studio_dashboard"
          />

          <details className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3">
            <summary className="min-h-[44px] cursor-pointer list-none text-sm font-semibold text-white/90">
              {t("px3.home.moreOptions")}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex min-h-[48px] items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:shadow-md ${studioVisual.editorSurface}`}
                >
                  <span aria-hidden>{link.emoji}</span>
                  {t(link.labelKey as never)}
                </Link>
              ))}
            </div>
          </details>

          {view ?
            <>
              {view.recentStoryboards.length > 0 ?
                <div>
                  <h3 className="text-sm font-semibold text-white/90">{t("studio.home.recentStoryboards")}</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {view.recentStoryboards.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="flex min-h-[48px] flex-col justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 hover:border-[#0067B1]/30"
                        >
                          <span className="text-sm font-semibold text-zinc-900">{item.title}</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(item.at).toLocaleDateString()}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              : null}

              <div>
                <h3 className="text-sm font-semibold text-white/90">{t("studio.home.libraryTitle")}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {report ?
                    <>
                      <AssetCountLink
                        label={t("studio.myStudio.library.allAssets")}
                        count={report.libraryCounts.all}
                        href="/studio/assets"
                      />
                      <AssetCountLink
                        label={t("studio.myStudio.library.favorites")}
                        count={report.libraryCounts.byTab.favorites}
                        href="/studio/assets/browse?filter=favorites"
                      />
                      <AssetCountLink
                        label={t("studio.myStudio.library.generated")}
                        count={report.libraryCounts.byTab.generated}
                        href="/studio/assets/library/generated"
                      />
                    </>
                  : null}
                  <AssetCountLink
                    label={t("studio.myStudio.library.storyboards")}
                    count={view.assetCounts.storyboards}
                    href="/studio/storyboards"
                  />
                  <AssetCountLink
                    label={t("studio.myStudio.library.characters")}
                    count={view.assetCounts.characters}
                    href="/studio/characters"
                  />
                  <AssetCountLink
                    label={t("studio.myStudio.library.props")}
                    count={view.assetCounts.props}
                    href="/studio/props"
                  />
                  <AssetCountLink
                    label={t("studio.myStudio.library.locations")}
                    count={view.assetCounts.locations}
                    href="/studio/locations"
                  />
                  <AssetCountLink
                    label={t("studio.myStudio.library.worlds")}
                    count={view.assetCounts.worlds}
                    href="/studio/worlds"
                  />
                </div>
              </div>

              {report ?
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{t("studio.home.usageThisMonth")}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <UsageStat label={t("studio.myStudio.stat.projects")} value={report.projectsCreated} />
                      <UsageStat label={t("studio.myStudio.stat.sceneImages")} value={report.sceneImagesGenerated} />
                      <UsageStat
                        label={t("studio.myStudio.stat.assetReferences")}
                        value={report.assetReferencesGenerated}
                      />
                      <UsageStat label={t("studio.myStudio.stat.voicePreviews")} value={report.voicePreviews} />
                      <UsageStat label={t("studio.myStudio.stat.voiceClones")} value={report.voiceClones} />
                      <UsageStat label={t("studio.myStudio.stat.motionRenders")} value={report.motionRenders} />
                      <UsageStat label={t("studio.myStudio.stat.exports")} value={report.languageExports} />
                      <UsageStat label={t("studio.myStudio.stat.translations")} value={report.translations} />
                      <UsageStat label={t("studio.myStudio.stat.assetsDerived")} value={report.assetsDerived} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{t("studio.home.recentActivity")}</h3>
                    {report.recentActivity.length === 0 ?
                      <p className="mt-3 text-sm text-white/55">{t("studio.myStudio.noActivity")}</p>
                    : (
                      <ul className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                        {report.recentActivity.map((item) => (
                          <li key={item.id} className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {t(`studio.myStudio.activity.${item.kind}` as never)} — {item.title}
                              </p>
                              <p className="text-xs text-zinc-500">{new Date(item.at).toLocaleString()}</p>
                            </div>
                            {item.href ?
                              <Link
                                href={item.href}
                                className="shrink-0 min-h-[44px] inline-flex items-center text-xs font-semibold text-[#0067B1] hover:underline"
                              >
                                {t("studio.myStudio.open")}
                              </Link>
                            : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              : (
                <p className="text-sm text-white/55">{t("studio.home.loading")}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/studio/storyboards"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  {t("studio.home.allStoryboards")}
                </Link>
                <Link
                  href="/studio/account"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  {t("studio.account.nav")}
                </Link>
              </div>
            </>
          : null}
        </div>
      )}
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className={`${growthSidebarLayoutClasses.pageFloorFlex} ${brand.softGradientBg}`}>
      <StudioShellHeader projectTitle={t("studio.home.title")} />
      {content}
    </main>
  );
}
