"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StudioStoryboardCard } from "@/components/studio/studio-storyboard-card";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { filterStudioAssetsBySearch } from "@/lib/studio-asset-search";
import {
  deleteStudioStoryboardApi,
  fetchStudioStoryboards,
} from "@/lib/studio-storyboards-client";
import type { StudioStoryboardListItem } from "@/types/studio-api";

export function StudioStoryboardsLibrary() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [storyboards, setStoryboards] = useState<StudioStoryboardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioStoryboards();
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboards([]);
    } else {
      setStoryboards(res.data.storyboards);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const filtered = filterStudioAssetsBySearch(
    storyboards.map((sb) => ({ ...sb, name: sb.title })),
    search,
    (sb) => `${sb.sceneCount}`
  ).map(({ name: _n, ...sb }) => sb as StudioStoryboardListItem);

  const userId = session.user?.id;

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("studio.storyboards.deleteConfirm"))) {
      return;
    }
    setDeleteBusyId(id);
    const res = await deleteStudioStoryboardApi(id);
    setDeleteBusyId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.deleteFailed"));
      return;
    }
    setStoryboards((list) => list.filter((s) => s.id !== id));
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-12 sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/studio" className="text-sm font-medium text-[#006D52] hover:underline">
                ← {t("studio.placeholder.back")}
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {t("studio.storyboards.libraryTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">
                {t("studio.storyboards.librarySubtitle")}
              </p>
            </div>
            <Link
              href="/studio/storyboards/new"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("studio.storyboards.newStoryboard")}
            </Link>
          </div>

          <div className="mt-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("studio.storyboards.searchPlaceholder")}
              className="w-full max-w-md rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm"
            />
          </div>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-10 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-zinc-200 bg-white/80 px-8 py-14 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">
                {search.trim() ? t("studio.storyboards.emptySearch") : t("studio.storyboards.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                {search.trim()
                  ? t("studio.storyboards.emptySearchHint")
                  : t("studio.storyboards.emptyDescription")}
              </p>
              {!search.trim() ? (
                <Link
                  href="/studio/storyboards/new"
                  className="mt-6 inline-flex rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("studio.storyboards.newStoryboard")}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sb) => (
                <StudioStoryboardCard
                  key={sb.id}
                  storyboard={sb}
                  onDelete={handleDelete}
                  deleteBusyId={deleteBusyId}
                  canModify={Boolean(userId && sb.ownerId === userId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
