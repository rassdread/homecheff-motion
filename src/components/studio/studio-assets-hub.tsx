"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioLibraryRecentSection } from "@/components/studio/studio-library-recent-section";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAssetsHubCounts } from "@/lib/studio-asset-lifecycle-client";
import { studioLibraryVisual } from "@/lib/studio-library-visual";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  ASSETS_HUB_GROUPS,
  getHubSectionsForGroup,
  type AssetsHubGroup,
} from "@/lib/studio-asset-hub-sections";
import type { AssetsHubCountsReport, AssetsHubSectionCounts } from "@/types/studio-asset-hub-counts";

export function StudioAssetsHub() {
  const t = useActiveTranslator();
  const [counts, setCounts] = useState<AssetsHubCountsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchAssetsHubCounts();
      if (!cancelled) {
        setCounts(res.ok ? res.counts : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StudioAuthGate>
      <main className={studioLibraryVisual.pageMain}>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${studioVisual.eyebrowOnDark}`}>
                {t("platform.hub.assetHub" as never)}
              </p>
              <h1 className={studioLibraryVisual.heroTitleLarge}>{t("studio.assetsHub.title")}</h1>
              <p className={studioLibraryVisual.heroDescription}>{t("studio.assetsHub.subtitle")}</p>
            </div>
            <Link
              href="/studio/assets/browse"
              className={`inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold ${studioVisual.headingOnDark} hover:bg-white/15`}
            >
              {t("studio.assetsHub.browseAll")}
            </Link>
          </header>

          {loading ?
            <div className="mt-8 flex justify-center py-12">
              <HomeCheffOrbitLoader state="loading" size="lg" />
            </div>
          : (
            <div className="mt-8 space-y-8">
              <StudioLibraryRecentSection />
              {ASSETS_HUB_GROUPS.map((group) => (
                <HubGroupBlock
                  key={group}
                  group={group}
                  counts={counts}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}

function HubGroupBlock({
  group,
  counts,
}: {
  group: AssetsHubGroup;
  counts: AssetsHubCountsReport | null;
}) {
  const t = useActiveTranslator();
  const sections = getHubSectionsForGroup(group);

  return (
    <div className={studioLibraryVisual.lightPanel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={studioLibraryVisual.lightPanelTitle}>
          {t(`studio.assetsHub.group.${group}` as never)}
        </h2>
        <span className="text-sm font-medium text-[#006D52]">
          {t("studio.assetsHub.groupCount", { count: String(counts?.groups[group] ?? 0) })}
        </span>
      </div>
      <p className={`mt-1 ${studioLibraryVisual.lightPanelBody}`}>{t(`studio.assetsHub.groupDesc.${group}` as never)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const count = counts?.sections[section.section as keyof AssetsHubSectionCounts] ?? 0;
          return (
            <Link
              key={section.section}
              href={section.href}
              className="flex min-h-[120px] flex-col rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-[#006D52]/30 hover:bg-[#006D52]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70"
            >
              <span className="text-sm font-semibold text-slate-900">{t(section.labelKey as never)}</span>
              <span className={`mt-1 flex-1 ${studioLibraryVisual.lightPanelMeta}`}>{t(section.descriptionKey as never)}</span>
              <span className="mt-2 text-xs font-semibold text-[#006D52]">
                {t("studio.assetsHub.sectionCount", { count: String(count) })}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
