"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioAssetLibrary } from "@/components/studio/studio-asset-library";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import type { AssetsHubSectionDef } from "@/lib/studio-asset-hub-sections";
import type { AnimationProjectListResponse } from "@/types/animation-api";

type Props = {
  section: AssetsHubSectionDef;
};

export function StudioAssetsHubSection({ section }: Props) {
  const t = useActiveTranslator();
  const [videoCount, setVideoCount] = useState<number | null>(null);

  useEffect(() => {
    if (section.section !== "videos") {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/animations/projects?limit=6", { cache: "no-store" });
      if (!res.ok || cancelled) {
        return;
      }
      const json = (await res.json()) as AnimationProjectListResponse;
      setVideoCount(json.projects?.length ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [section.section]);

  if (section.section === "videos") {
    return (
      <StudioAuthGate>
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
            <HubSectionHeader section={section} />
            <p className="mt-4 text-sm text-slate-600">{t("studio.assetsHub.videos.hint")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/videos"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[#006D52] px-6 py-2 text-sm font-semibold text-white hover:bg-[#005a44]"
              >
                {t("studio.assetsHub.videos.openLibrary")}
              </Link>
              <Link
                href="/studio/assets"
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-800"
              >
                ← {t("studio.assetsHub.backToHub")}
              </Link>
            </div>
            {videoCount !== null ?
              <p className="mt-4 text-xs text-slate-500">
                {t("studio.assetsHub.videos.recentCount", { count: String(videoCount) })}
              </p>
            : null}
          </section>
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
          <HubSectionHeader section={section} />
          <div className="mt-4">
            <StudioAssetLibrary
              layout="page"
              hubMode
              initialTab={section.initialTab}
              initialCollection={section.initialCollection}
              initialOrigin={section.initialOrigin}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}

function HubSectionHeader({ section }: { section: AssetsHubSectionDef }) {
  const t = useActiveTranslator();
  return (
    <header>
      <Link
        href="/studio/assets"
        className="text-sm font-medium text-[#006D52] hover:underline"
      >
        ← {t("studio.assetsHub.backToHub")}
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t(`studio.assetsHub.group.${section.group}` as never)}
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
        {t(section.labelKey as never)}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{t(section.descriptionKey as never)}</p>
    </header>
  );
}
