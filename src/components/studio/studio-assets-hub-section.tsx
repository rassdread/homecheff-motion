"use client";

import Link from "next/link";
import { StudioAssetLibrary } from "@/components/studio/studio-asset-library";
import { StudioProjectMediaBrowser } from "@/components/studio/studio-project-media-browser";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioLibraryPageHero } from "@/components/studio/studio-library-page-hero";
import { useActiveTranslator } from "@/i18n/client";
import type { AssetsHubSectionDef } from "@/lib/studio-asset-hub-sections";
import { studioLibraryVisual } from "@/lib/studio-library-visual";
import type { AnimationProjectListResponse } from "@/types/animation-api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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
        <main className={studioLibraryVisual.pageMain}>
          <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
            <HubSectionHeader section={section} />
            <p className={`mt-4 ${studioLibraryVisual.sectionLead}`}>{t("studio.assetsHub.videos.hint")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/videos"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[#006D52] px-6 py-2 text-sm font-semibold text-white hover:bg-[#005a44]"
              >
                {t("studio.assetsHub.videos.openLibrary")}
              </Link>
              <Link
                href="/library"
                className={`inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-semibold text-white hover:bg-white/15`}
              >
                ← {t("studio.assetsHub.backToHub")}
              </Link>
            </div>
            {videoCount !== null ?
              <p className={`mt-4 ${studioLibraryVisual.metaMuted}`}>
                {t("studio.assetsHub.videos.recentCount", { count: String(videoCount) })}
              </p>
            : null}
            <div className="mt-8">
              <StudioProjectMediaBrowser initialSection="videos" />
            </div>
          </section>
        </main>
      </StudioAuthGate>
    );
  }

  if (section.section === "generated") {
    return (
      <StudioAuthGate>
        <main className={studioLibraryVisual.pageMain}>
          <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
            <HubSectionHeader section={section} />
            <div className="mt-4">
              <StudioProjectMediaBrowser initialSection="all" />
            </div>
          </section>
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate>
      <main className={studioLibraryVisual.pageMain}>
        <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
          <HubSectionHeader section={section} />
          {section.section === "voices" || section.section === "audio" ?
            <Suspense fallback={null}>
              <PreservedAssetIdea />
            </Suspense>
          : null}
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

function PreservedAssetIdea() {
  const idea = (useSearchParams().get("idea") ?? "").trim().slice(0, 500);
  if (!idea) return null;
  return <p className="mt-3 text-sm text-zinc-800" data-testid="studio-v23-preserved-idea">{idea}</p>;
}

function HubSectionHeader({ section }: { section: AssetsHubSectionDef }) {
  const t = useActiveTranslator();
  const groupLabelKey =
    section.group === "media"
      ? "suite.breadcrumb.media"
      : section.group === "creative"
        ? "suite.breadcrumb.creative"
        : "suite.breadcrumb.uploads";

  return (
    <StudioLibraryPageHero
      breadcrumbs={[
        { label: t("suite.breadcrumb.library"), href: "/library" },
        { label: t(groupLabelKey as never) },
        { label: t(section.labelKey as never) },
      ]}
      backHref="/library"
      backLabel={t("studio.assetsHub.backToHub")}
      title={t(section.labelKey as never)}
      description={t(section.descriptionKey as never)}
    />
  );
}
