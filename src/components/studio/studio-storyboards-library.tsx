"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardGridSkeleton } from "@/components/ui/motion-studio-primitives";
import { AppCard } from "@/components/ui/app-card";
import { StudioStoryboardCard } from "@/components/studio/studio-storyboard-card";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchAuthSessionJson } from "@/lib/auth-session-client";
import { brand } from "@/lib/brand";
import { filterStudioAssetsBySearch } from "@/lib/studio-asset-search";
import {
  deleteStudioStoryboardApi,
  fetchStudioStoryboards,
} from "@/lib/studio-storyboards-client";
import { userFacingApiError } from "@/lib/user-facing-error";
import type { StudioStoryboardListItem } from "@/types/studio-api";

export function StudioStoryboardsLibrary() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [storyboards, setStoryboards] = useState<StudioStoryboardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const initialLoadDoneRef = useRef(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const isAdmin = session.user?.role === "admin";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (options?: { manualRetry?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!initialLoadDoneRef.current) {
        setLoading(true);
      } else if (options?.manualRetry) {
        setRetrying(true);
      }
      setLoadError("");

      const sessionPayload = await fetchAuthSessionJson({ force: true });
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      if (!sessionPayload.user) {
        setStoryboards([]);
        initialLoadDoneRef.current = true;
        setInitialLoadDone(true);
        setLoading(false);
        setRetrying(false);
        return;
      }

      const res = await fetchStudioStoryboards();
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (!res.ok) {
        const raw = (res.data as { error?: string }).error;
        const fallback = t("studio.storyboards.error.loadFailed");
        setLoadError(userFacingApiError(raw, fallback, { isAdmin }));
        setStoryboards([]);
      } else {
        setStoryboards(res.data.storyboards);
      }

      initialLoadDoneRef.current = true;
      setInitialLoadDone(true);
      setLoading(false);
      setRetrying(false);
    },
    [isAdmin, t]
  );

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
  ).map(({ name, ...sb }) => {
    void name;
    return sb as StudioStoryboardListItem;
  });

  const userId = session.user?.id;

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("studio.storyboards.deleteConfirm"))) {
      return;
    }
    setDeleteBusyId(id);
    const res = await deleteStudioStoryboardApi(id);
    setDeleteBusyId(null);
    if (!res.ok) {
      const raw = (res.data as { error?: string }).error;
      setLoadError(
        userFacingApiError(raw, t("studio.storyboards.error.deleteFailed"), { isAdmin })
      );
      return;
    }
    setStoryboards((list) => list.filter((s) => s.id !== id));
  };

  const showSkeleton = loading && !initialLoadDone;

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

          {loadError ?
            <div className="mt-10">
              <AppCard className="bg-white p-8 text-center">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {t("studio.storyboards.error.loadTitle")}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void load({ manualRetry: true })}
                  disabled={retrying}
                  className="mt-6 min-h-11 rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a44] disabled:opacity-60"
                >
                  {retrying ? t("button.loading") : t("studio.storyboards.error.retry")}
                </button>
              </AppCard>
            </div>
          : showSkeleton ?
            <CardGridSkeleton count={3} />
          : filtered.length === 0 ?
            <div className="mt-10 rounded-3xl border border-dashed border-zinc-200 bg-white/80 px-8 py-14 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">
                {search.trim() ? t("studio.storyboards.emptySearch") : t("studio.storyboards.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                {search.trim()
                  ? t("studio.storyboards.emptySearchHint")
                  : t("studio.storyboards.emptyDescription")}
              </p>
              {!search.trim() ?
                <Link
                  href="/studio/storyboards/new"
                  className="mt-6 inline-flex rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("studio.storyboards.newStoryboard")}
                </Link>
              : null}
            </div>
          : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          }
        </section>
      </main>
    </StudioAuthGate>
  );
}
