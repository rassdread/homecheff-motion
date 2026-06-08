"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import type { UserStudioDashboardReport } from "@/types/studio-profitability";

const QUICK_LINKS = [
  { href: "/studio/storyboards/new", labelKey: "studio.home.quick.storyboard", emoji: "🎬" },
  { href: "/studio/characters/new", labelKey: "studio.home.quick.character", emoji: "🎭" },
  { href: "/studio/props/new", labelKey: "studio.home.quick.prop", emoji: "📦" },
  { href: "/studio/locations/new", labelKey: "studio.home.quick.location", emoji: "📍" },
  { href: "/studio/worlds/new", labelKey: "studio.home.quick.world", emoji: "🌍" },
  { href: "/studio/assets", labelKey: "studio.home.quick.library", emoji: "🗂️" },
] as const;

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
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
      className="flex min-h-[44px] items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 hover:border-[#006D52]/30"
    >
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <span className="text-sm font-semibold text-[#006D52]">{count}</span>
    </Link>
  );
}

type Props = {
  /** When true, omits outer page shell (used inside /studio root). */
  embedded?: boolean;
};

export function StudioHomeDashboard({ embedded = false }: Props) {
  const t = useActiveTranslator();
  const [report, setReport] = useState<UserStudioDashboardReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      queueMicrotask(() => setError(""));
      const res = await fetch("/api/me/studio-insights?view=dashboard", { cache: "no-store" });
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        queueMicrotask(() => setError(t("studio.home.error.loadFailed")));
        return;
      }
      const data = (await res.json()) as { report: UserStudioDashboardReport };
      queueMicrotask(() => setReport(data.report));
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const content = (
    <section className={embedded ? "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8" : "mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6"}>
      {error ?
        <p className="text-sm text-red-700">{error}</p>
      : !report ?
        <p className="text-sm text-zinc-600">{t("studio.home.loading")}</p>
      : (
        <div className="space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#006D52]">
              {t("studio.home.eyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">{t("studio.home.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("studio.home.subtitle")}</p>
          </header>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.quickActions")}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-[#006D52]/30 hover:bg-[#006D52]/5"
                >
                  <span aria-hidden>{link.emoji}</span>
                  {t(link.labelKey as never)}
                </Link>
              ))}
            </div>
          </div>

          {report.continueWorking.length > 0 ?
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.continueWorking")}</h3>
              <ul className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                {report.continueWorking.map((item) => (
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
          : null}

          {report.recentStoryboards.length > 0 ?
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.recentStoryboards")}</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {report.recentStoryboards.map((item) => (
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
            <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.usageThisMonth")}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <UsageStat label={t("studio.myStudio.stat.projects")} value={report.projectsCreated} />
              <UsageStat label={t("studio.myStudio.stat.sceneImages")} value={report.sceneImagesGenerated} />
              <UsageStat label={t("studio.myStudio.stat.assetReferences")} value={report.assetReferencesGenerated} />
              <UsageStat label={t("studio.myStudio.stat.voicePreviews")} value={report.voicePreviews} />
              <UsageStat label={t("studio.myStudio.stat.voiceClones")} value={report.voiceClones} />
              <UsageStat label={t("studio.myStudio.stat.motionRenders")} value={report.motionRenders} />
              <UsageStat label={t("studio.myStudio.stat.exports")} value={report.languageExports} />
              <UsageStat label={t("studio.myStudio.stat.translations")} value={report.translations} />
              <UsageStat label={t("studio.myStudio.stat.assetsDerived")} value={report.assetsDerived} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.libraryTitle")}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <AssetCountLink
                label={t("studio.myStudio.library.allAssets")}
                count={
                  report.assetCounts.characters +
                  report.assetCounts.props +
                  report.assetCounts.locations +
                  report.assetCounts.worlds
                }
                href="/studio/assets"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.favorites")}
                count={report.librarySummary.favoritesCount}
                href="/studio/assets?filter=favorites"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.generated")}
                count={report.assetReferencesGenerated}
                href="/studio/assets?tab=generated"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.storyboards")}
                count={report.assetCounts.storyboards}
                href="/studio/storyboards"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.characters")}
                count={report.assetCounts.characters}
                href="/studio/characters"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.props")}
                count={report.assetCounts.props}
                href="/studio/props"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.locations")}
                count={report.assetCounts.locations}
                href="/studio/locations"
              />
              <AssetCountLink
                label={t("studio.myStudio.library.worlds")}
                count={report.assetCounts.worlds}
                href="/studio/worlds"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{t("studio.home.recentActivity")}</h3>
            {report.recentActivity.length === 0 ?
              <p className="mt-3 text-sm text-zinc-500">{t("studio.myStudio.noActivity")}</p>
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
        </div>
      )}
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className={`flex min-h-screen flex-col ${brand.softGradientBg}`}>
      <StudioShellHeader projectTitle={t("studio.home.title")} />
      {content}
    </main>
  );
}
