"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildAssistantPrefillRoute,
  storeAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { buildMotionHubPrefillPackage } from "@/lib/motion-hub-navigation";
import {
  MOTION_HUB_CATEGORIES,
  motionHubCategoryDefinition,
  motionHubEntriesForCategory,
} from "@/lib/motion-studio-hub";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { MotionHubCategoryId, MotionHubEntry } from "@/types/motion-studio-hub";
import { isMotionHubCategoryId } from "@/lib/motion-studio-hub-utils";

export function MotionStudioHub() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const activeCategory: MotionHubCategoryId | null = isMotionHubCategoryId(categoryParam)
    ? categoryParam
    : null;

  const entries = useMemo(
    () => (activeCategory ? motionHubEntriesForCategory(activeCategory) : []),
    [activeCategory]
  );

  const resolveEntryTitle = (entry: MotionHubEntry): string => {
    if (entry.kind === "action_preset" && entry.presetId) {
      return getMotionActionPreset(entry.presetId)?.title ?? entry.presetId;
    }
    return t(entry.titleKey as never);
  };

  const resolveEntryDescription = (entry: MotionHubEntry): string => {
    if (entry.kind === "action_preset" && entry.presetId) {
      return getMotionActionPreset(entry.presetId)?.shortDescription ?? "";
    }
    return t(entry.descriptionKey as never);
  };

  const handleSelect = (entry: MotionHubEntry) => {
    const pkg = buildMotionHubPrefillPackage({
      presetId: entry.presetId,
      photoIntentId: entry.photoIntentId,
    });
    if (!pkg) {
      return;
    }
    storeAssistantPrefillPackage(pkg);
    router.push(buildAssistantPrefillRoute(pkg.targetRoute, pkg.id));
  };

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="text-sm font-medium text-[#006D52] hover:underline"
        >
          ← {t("motionHub.back" as never)}
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#006D52]">
          {t("motionHub.eyebrow" as never)}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          {t("motionHub.title" as never)}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base">{t("motionHub.lead" as never)}</p>

        {!activeCategory ? (
          <>
            <p className="mt-8 text-sm font-semibold text-zinc-800">
              {t("motionHub.chooseCategory" as never)}
            </p>
            <div className="mt-4 space-y-3" data-testid="motion-hub-categories">
              {MOTION_HUB_CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/motion?category=${category.id}`}
                  data-category-id={category.id}
                  className={`flex w-full flex-col items-start rounded-2xl border p-4 text-left transition hover:shadow-md ${studioVisual.editorSurface}`}
                >
                  <span className="text-base font-bold text-zinc-900">
                    {t(category.titleKey as never)}
                  </span>
                  <span className="mt-1 text-sm text-zinc-600">
                    {t(category.descriptionKey as never)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <Link
              href="/motion"
              className="mt-6 inline-block text-sm font-medium text-[#006D52] hover:underline"
            >
              ← {t("motionHub.backToCategories" as never)}
            </Link>
            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {t(motionHubCategoryDefinition(activeCategory).titleKey as never)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t(motionHubCategoryDefinition(activeCategory).descriptionKey as never)}
            </p>
            <div className="mt-4 space-y-2" data-testid="motion-hub-choices">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  data-entry-id={entry.id}
                  data-preset-id={entry.presetId ?? undefined}
                  onClick={() => handleSelect(entry)}
                  className={`flex w-full flex-col items-start rounded-2xl border p-4 text-left transition hover:shadow-md ${studioVisual.editorSurface}`}
                >
                  <span className="text-base font-bold text-zinc-900">
                    {resolveEntryTitle(entry)}
                  </span>
                  <span className="mt-1 text-sm text-zinc-600">{resolveEntryDescription(entry)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-zinc-500">
          <Link href="/animate?legacy=1" className="font-medium text-zinc-600 hover:underline">
            {t("motionHub.legacyClassic" as never)}
          </Link>
        </p>
      </section>
    </main>
  );
}
