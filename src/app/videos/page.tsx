"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDurationSeconds, getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import { getAnimationPreset, validateAnimationPresetId } from "@/lib/animation-presets";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { VideoPreview } from "@/components/ui/video-preview";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ProjectBundleCard } from "@/components/videos/project-bundle-card";
import {
  BUNDLE_FOLDER_OPTIONS,
  bundleMatchesFolder,
  type BundleFolderId,
} from "@/lib/bundle-folder";
import {
  countBundlesPerFolder,
  summarizeFolderLibraryView,
} from "@/lib/bundle-rich-summary";
import { FolderLibraryHeader } from "@/components/videos/folder-library-header";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import { DraftLineageBanner } from "@/components/videos/draft-lineage-banner";
import { ProjectBundleSettingsDialog } from "@/components/videos/project-bundle-settings-dialog";
import type {
  AnimationProjectListItem,
  AnimationProjectListResponse,
  ProjectBundleListItemResponse,
} from "@/types/animation-api";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { syncActiveAnimationProjects } from "@/lib/sync-active-animation-projects";
import {
  isProjectPlayablyComplete,
  resolveProjectDisplayStatus,
} from "@/lib/project-display-status";
import { exportRecordIsCancellable } from "@/lib/animation-export-cancellable";
import { hcExportRetryLog } from "@/lib/hc-export-retry-debug";
import { postProjectExportRetry } from "@/lib/post-project-export-retry";

function listExportStuckWithoutFinal(item: AnimationProjectListItem): boolean {
  const ex = item.latestExport;
  if (!ex || !item.allTransitionsCompleted) {
    return false;
  }
  if (ex.outputVideoUrl?.trim()) {
    return false;
  }
  return ex.status.toLowerCase() !== "completed";
}

function canRetryMergeFromList(item: AnimationProjectListItem): boolean {
  if ((item.projectType ?? "classic") !== "classic") {
    return false;
  }
  if (!item.allTransitionsCompleted) {
    return false;
  }
  const hasFinal = Boolean(item.latestExport?.outputVideoUrl?.trim());
  if (hasFinal) {
    return false;
  }
  const failedPair = item.status === "failed" && item.latestExport?.status === "failed";
  const stuckRendering =
    item.status === "rendering" && (!item.latestExport || listExportStuckWithoutFinal(item));
  const completedWithoutFinal = item.status === "completed";
  return Boolean(failedPair || stuckRendering || completedWithoutFinal);
}

function listItemDisplayStatus(item: AnimationProjectListItem): string {
  return resolveProjectDisplayStatus({
    projectStatus: item.status,
    exportStatus: item.latestExport?.status,
    outputVideoUrl: item.latestExport?.outputVideoUrl,
  });
}

function listItemStatusLabelKey(item: AnimationProjectListItem): TranslationKey {
  switch (listItemDisplayStatus(item)) {
    case "completed":
      return "videos.status.completed";
    case "generating":
      return "videos.status.generating";
    case "rendering":
      return "videos.status.rendering";
    case "failed":
      return "videos.status.failed";
    default:
      return "videos.status.queued";
  }
}

function presetTitleKey(presetId: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    basic: "animate.preset.basic.title",
    standard: "animate.preset.standard.title",
    pro: "animate.preset.pro.title",
    smooth: "animate.preset.smooth.title",
  };
  return map[presetId] ?? "animate.preset.standard.title";
}

function intentLabelKey(intent: string | null): TranslationKey | null {
  if (!intent) {
    return null;
  }
  const allowed = ["morph", "cinematic", "product", "dynamic"] as const;
  if (!(allowed as readonly string[]).includes(intent)) {
    return null;
  }
  return `animate.intent.${intent}` as TranslationKey;
}

function listItemDurationLabel(item: AnimationProjectListItem, locale: "nl" | "en"): string {
  const sec = item.estimatedTotalDurationSeconds;
  if (sec == null || !Number.isFinite(sec)) {
    return "—";
  }
  return formatDurationSeconds(sec, locale);
}

function hasPlayableFinal(item: AnimationProjectListItem): boolean {
  return isProjectPlayablyComplete({
    projectStatus: item.status,
    exportStatus: item.latestExport?.status,
    outputVideoUrl: item.latestExport?.outputVideoUrl,
  });
}

function hasPlayableFragmentPreview(item: AnimationProjectListItem): boolean {
  return Boolean(item.firstTransitionVideoUrl?.trim()) && !hasPlayableFinal(item);
}

function isFailedState(item: AnimationProjectListItem): boolean {
  if (item.status === "failed") {
    return true;
  }
  return item.latestExport?.status === "failed";
}

function isProcessingState(item: AnimationProjectListItem): boolean {
  if (hasPlayableFinal(item) || isFailedState(item)) {
    return false;
  }
  return true;
}

type GallerySection = "completed" | "concepts";

function VideosPageContent() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const dateLocale = locale === "nl" ? "nl" : "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const gallerySection: GallerySection =
    searchParams.get("section") === "concepts" ? "concepts" : "completed";
  const folderParam = searchParams.get("folder");
  const folderFilter: BundleFolderId =
    BUNDLE_FOLDER_OPTIONS.some((f) => f.id === folderParam) ?
      (folderParam as BundleFolderId)
    : "all";
  const [listAll, setListAll] = useState(false);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<AnimationProjectListItem[]>([]);
  const [bundles, setBundles] = useState<ProjectBundleListItemResponse[]>([]);
  const [renameTarget, setRenameTarget] = useState<{
    projectId: string;
    projectType: string;
    title: string | null;
  } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [expandedFragmentProjectId, setExpandedFragmentProjectId] = useState<string | null>(null);
  const [playbackErrorProjectId, setPlaybackErrorProjectId] = useState<string | null>(null);
  const [playbackFragmentErrorProjectId, setPlaybackFragmentErrorProjectId] = useState<string | null>(
    null
  );
  const [cancelExportBusyId, setCancelExportBusyId] = useState<string | null>(null);
  const [cancelExportFeedback, setCancelExportFeedback] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [retryMergeBusyId, setRetryMergeBusyId] = useState<string | null>(null);
  const [recoverBusyId, setRecoverBusyId] = useState<string | null>(null);

  const isAdmin = session.resolved && session.user?.role === "admin";

  const fetchList = useCallback(
    async (nextPage: number, mode: "replace" | "append", opts?: { background?: boolean }) => {
      const background = Boolean(opts?.background);
      if (!background) {
        setLoading(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("limit", "50");
        if (isAdmin && listAll) {
          params.set("all", "true");
        }
        params.set("section", gallerySection);
        params.set("locale", dateLocale);
        const res = await fetch(`/api/animations/projects?${params.toString()}`, {
          credentials: "include",
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        const body = json as AnimationProjectListResponse;
        setHasMore(body.hasMore);
        setTotalCount(body.total);
        setProjects((prev) => (mode === "append" ? [...prev, ...body.projects] : body.projects));
        setBundles((prev) =>
          mode === "append" ? [...prev, ...(body.bundles ?? [])] : (body.bundles ?? [])
        );
        setPage(nextPage);
      } catch (e) {
        if (!background) {
          setError(e instanceof Error ? e.message : t("videos.error"));
          if (mode === "replace") {
            setProjects([]);
            setBundles([]);
            setHasMore(false);
          }
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [isAdmin, listAll, gallerySection, dateLocale]
  );

  const setSection = useCallback(
    (section: GallerySection) => {
      const params = new URLSearchParams(searchParams.toString());
      if (section === "completed") {
        params.delete("section");
      } else {
        params.set("section", section);
      }
      const qs = params.toString();
      router.replace(`/videos${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setFolderFilter = useCallback(
    (folder: BundleFolderId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (folder === "all") {
        params.delete("folder");
      } else {
        params.set("folder", folder);
      }
      const qs = params.toString();
      router.replace(`/videos${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  const filteredBundles = useMemo(() => {
    if (folderFilter === "all") {
      return bundles;
    }
    return bundles.filter((b) =>
      bundleMatchesFolder(folderFilter, (b.folderId as BundleFolderId) ?? "uncategorized")
    );
  }, [bundles, folderFilter]);

  /** Counts reflect bundles loaded on this page (client-side; not full account totals when paginated). */
  const folderBundleCounts = useMemo(() => countBundlesPerFolder(bundles), [bundles]);

  const folderLibrarySummary = useMemo(() => {
    if (folderFilter === "all") {
      return null;
    }
    return summarizeFolderLibraryView(
      bundles.map((b) => ({
        folderId: b.folderId,
        catalog: b.catalog as unknown as MotionVersionCatalog,
        badgesByProjectId: b.badgesByProjectId,
      })),
      folderFilter,
      dateLocale
    );
  }, [bundles, folderFilter, dateLocale]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void fetchList(1, "replace");
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session.resolved, session.user, listAll, gallerySection, fetchList]);

  const projectsRef = useRef<AnimationProjectListItem[]>([]);
  const pageRef = useRef(1);
  useEffect(() => {
    projectsRef.current = projects;
    pageRef.current = page;
  }, [projects, page]);

  const hasProcessingOnFirstPage = page === 1 && projects.some((p) => isProcessingState(p));

  /** Poll provider + merge on the server, then refresh the gallery so finished videos appear with a download. */
  useEffect(() => {
    if (!session.resolved || !session.user || !hasProcessingOnFirstPage) {
      return;
    }
    const POLL_MS = 12_000;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }
      await syncActiveAnimationProjects();
      if (!cancelled) {
        await fetchList(1, "replace", { background: true });
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session.resolved, session.user, hasProcessingOnFirstPage, fetchList]);

  const handleLoadMore = () => {
    if (!hasMore || loading) {
      return;
    }
    void fetchList(page + 1, "append");
  };

  const cancelExportForProject = useCallback(
    async (projectId: string) => {
      setCancelExportFeedback(null);
      setCancelExportBusyId(projectId);
      try {
        const res = await fetch(
          `/api/animations/projects/${encodeURIComponent(projectId)}/export/cancel`,
          { method: "POST", credentials: "include" }
        );
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          setCancelExportFeedback(msg);
          return;
        }
        await fetchList(1, "replace");
      } catch {
        setCancelExportFeedback(t("animate.export.cancelFailed"));
      } finally {
        setCancelExportBusyId(null);
      }
    },
    [fetchList]
  );

  const retryMergeForProject = useCallback(
    async (projectId: string) => {
      hcExportRetryLog("client", "export_retry.button_clicked", { projectId });
      setRetryMergeBusyId(projectId);
      setError(null);
      try {
        const { response, body } = await postProjectExportRetry(projectId);
        if (!response.ok && !body.project) {
          setError(body.error ?? t("errors.exportStartFailed"));
          return;
        }
        if (body.error && !body.project) {
          setError(body.error);
          return;
        }
        if (body.error) {
          setError(body.error);
        }
        await fetchList(1, "replace");
      } catch (e) {
        hcExportRetryLog("client", "export_retry.throw", {
          projectId,
          message: e instanceof Error ? e.message : String(e),
        });
        setError(t("errors.exportStartFailed"));
      } finally {
        setRetryMergeBusyId(null);
      }
    },
    [fetchList]
  );

  const recoverInstantProject = useCallback(
    async (projectId: string) => {
      setRecoverBusyId(projectId);
      setError(null);
      try {
        const res = await fetch(
          `/api/instant-premium/projects/${encodeURIComponent(projectId)}/repair-final-video`,
          { method: "POST", credentials: "include" }
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          repair?: { clipsReady?: boolean; message?: string };
        };
        if (!res.ok) {
          setError(body.error ?? body.repair?.message ?? t("instant.recover.failed"));
          return;
        }
        if (body.repair?.clipsReady === false) {
          setError(body.repair?.message ?? t("instant.recover.failed"));
          return;
        }
        await fetchList(1, "replace");
      } finally {
        setRecoverBusyId(null);
      }
    },
    [fetchList]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      setDeleteBusyId(projectId);
      setError(null);
      try {
        const res = await fetch(`/api/animations/projects/${encodeURIComponent(projectId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => null);
          const msg =
            json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          setError(msg);
          return;
        }
        setExpandedVideoId((id) => (id === projectId ? null : id));
        setExpandedFragmentProjectId((id) => (id === projectId ? null : id));
        await fetchList(1, "replace");
      } catch {
        setError(t("videos.deleteProjectFailed"));
      } finally {
        setDeleteBusyId(null);
      }
    },
    [fetchList]
  );

  if (!session.resolved) {
    return (
      <main className="mx-auto min-h-[50vh] w-full max-w-6xl px-6 py-10 sm:px-10">
        <div className="h-8 max-w-md animate-pulse rounded-lg bg-zinc-100" aria-hidden />
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-10">
        <h1 className="text-xl font-semibold text-zinc-900">{t("videos.title")}</h1>
        <p className="mt-3 text-sm text-zinc-600">{t("errors.authRequired")}</p>
        <Link
          href="/login"
          prefetch={false}
          className="mt-6 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
        >
          {t("nav.login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t("videos.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/mijn-verbruik"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:text-sm"
          >
            {t("usage.title")}
          </Link>
          <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-medium sm:text-sm">
            <button
              type="button"
              onClick={() => setSection("completed")}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                gallerySection === "completed"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t("projects.tabs.completed")}
            </button>
            <button
              type="button"
              onClick={() => setSection("concepts")}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                gallerySection === "concepts"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t("projects.tabs.concepts")}
            </button>
          </div>
        {isAdmin ? (
          <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-medium sm:text-sm">
            <button
              type="button"
              onClick={() => {
                if (!listAll) return;
                setListAll(false);
              }}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                !listAll ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t("videos.myVideos")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (listAll) return;
                setListAll(true);
              }}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                listAll ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t("videos.allVideos")}
            </button>
          </div>
        ) : null}
        </div>
      </div>

      {gallerySection === "completed" ?
        <div className="mt-4 flex flex-wrap gap-2">
          {BUNDLE_FOLDER_OPTIONS.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setFolderFilter(folder.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                folderFilter === folder.id
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {t(folder.labelKey as never)} ({folderBundleCounts[folder.id] ?? 0})
            </button>
          ))}
        </div>
      : null}

      {gallerySection === "completed" && folderLibrarySummary ?
        <FolderLibraryHeader folderId={folderFilter} summary={folderLibrarySummary} />
      : null}

      {totalCount > 0 ? (
        <p className="mt-1 text-sm text-zinc-500">
          {t("videos.showingCount", {
            shown:
              gallerySection === "completed" ? filteredBundles.length : projects.length,
            total: totalCount,
          })}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
          {t("videos.error")}: {error}
        </p>
      ) : null}

      {cancelExportFeedback ? (
        <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {cancelExportFeedback}
        </p>
      ) : null}

      {!loading &&
      (gallerySection === "completed" ? filteredBundles.length === 0 : projects.length === 0) &&
      !error ? (
        <div className="mt-10 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            {gallerySection === "concepts" ? t("projects.concepts.emptyTitle") : t("videos.emptyTitle")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {gallerySection === "concepts"
              ? t("projects.concepts.emptyDescription")
              : t("videos.emptyDescription")}
          </p>
          <Link
            href="/animate/instant"
            prefetch={false}
            className="mt-6 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
          >
            {t("videos.createNew")}
          </Link>
        </div>
      ) : null}

      <ul className="mt-8 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {gallerySection === "completed"
          ? filteredBundles.map((bundle) => (
              <ProjectBundleCard
                key={bundle.bundleKey}
                bundle={bundle}
                expandedVideoKey={expandedVideoId}
                onTogglePlay={setExpandedVideoId}
                playbackErrorKey={playbackErrorProjectId}
                onPlaybackError={setPlaybackErrorProjectId}
                onPlaybackOk={(key) =>
                  setPlaybackErrorProjectId((eid) => (eid === key ? null : eid))
                }
                onRename={() =>
                  setRenameTarget({
                    projectId: bundle.activeProjectId,
                    projectType: bundle.projectType,
                    title: bundle.displayTitle,
                  })
                }
              />
            ))
          : null}
        {gallerySection === "concepts"
          ? projects.map((item) => {
          const thumb = item.thumbnailUrl?.trim() || item.thumbnailFallbackUrl?.trim() || null;
          const presetId = validateAnimationPresetId(item.presetId) ? item.presetId : "standard";
          const preset = getAnimationPreset(presetId);
          const secondsPerTransition =
            item.advancedSettingsEnabled &&
            item.viduDurationSeconds != null &&
            item.viduDurationSeconds > 0
              ? item.viduDurationSeconds
              : preset.durationSeconds;
          const durationFromParts = getTotalVideoDurationSeconds(item.imageCount, secondsPerTransition);
          const durationLabel =
            item.estimatedTotalDurationSeconds != null
              ? listItemDurationLabel(item, dateLocale)
              : formatDurationSeconds(durationFromParts, dateLocale);
          const intentKey = intentLabelKey(item.intent);
          const finalUrl =
            item.latestExport?.outputVideoUrl?.trim() ||
            item.previousFinalVideoUrl?.trim() ||
            null;
          const fragmentUrl = item.firstTransitionVideoUrl?.trim() || null;
          const failed = isFailedState(item);
          const processing = isProcessingState(item);
          const isInstant = (item.projectType ?? "classic") === "instant_premium";
          const isClassic = (item.projectType ?? "classic") === "classic";
          const instantNeedsRecovery =
            isInstant && item.allTransitionsCompleted && !hasPlayableFinal(item);
          const exportProgress = item.latestExport?.progress ?? 0;
          const errSnippet = item.latestExport?.errorMessage?.trim() || null;
          const itemHref =
            gallerySection === "concepts"
              ? `/videos/${encodeURIComponent(item.id)}/edit-version`
              : `/videos/${encodeURIComponent(item.id)}`;
          const conceptMeta = item.fullRerenderDraft;

          return (
            <li
              key={item.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
            >
              <Link href={itemHref} prefetch={false} className="block shrink-0">
                <div className="relative aspect-video bg-zinc-100">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      {t("videos.title")}
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full border border-white/80 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-xs">
                    {t(listItemStatusLabelKey(item))}
                  </span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={itemHref} prefetch={false} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {item.displayTitle ?? t("videos.untitledProject")}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      <ClientFormattedDateTime iso={item.createdAt} />
                    </p>
                  </Link>
                </div>

                <p className="rounded-lg bg-[#0067B1]/10 px-2 py-1 text-xs font-medium text-[#0067B1]">
                  {t("projects.concepts.cardLabel", {
                    scenes: conceptMeta?.sceneCount ?? item.imageCount,
                  })}
                </p>
                {item.draftLineage ? (
                  <DraftLineageBanner lineage={item.draftLineage} variant="card" />
                ) : null}

                {listAll && item.ownerEmail ? (
                  <p className="text-xs text-zinc-500">
                    {t("videos.owner")}: <span className="text-zinc-700">{item.ownerEmail}</span>
                  </p>
                ) : null}

                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-600">
                  <dt>{t("videos.preset")}</dt>
                  <dd className="text-right font-medium text-zinc-800">{t(presetTitleKey(item.presetId))}</dd>
                  {intentKey ? (
                    <>
                      <dt>{t("videos.intent")}</dt>
                      <dd className="text-right font-medium text-zinc-800">{t(intentKey)}</dd>
                    </>
                  ) : null}
                  <dt>{t("videos.duration")}</dt>
                  <dd className="text-right font-medium text-zinc-800">{durationLabel}</dd>
                  <dt>{t("videos.credits")}</dt>
                  <dd className="text-right font-medium text-zinc-800">
                    {item.estimatedCredits != null ? String(item.estimatedCredits) : "—"}
                  </dd>
                </dl>

                {item.transitionCount > 0 ? (
                  <p className="text-[11px] text-zinc-500">{t("videos.fragmentCount", { n: item.transitionCount })}</p>
                ) : null}

                {hasPlayableFragmentPreview(item) && fragmentUrl ? (
                  <div className="mt-2 space-y-2 border-t border-zinc-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("videos.fragmentPreview")}
                    </p>
                    {expandedFragmentProjectId === item.id ? (
                      <div>
                        <VideoPreview
                          key={fragmentUrl}
                          variant="version"
                          frameClassName="mt-0"
                          controls
                          playsInline
                          preload="none"
                          poster={thumb ?? undefined}
                          onError={() => setPlaybackFragmentErrorProjectId(item.id)}
                          onLoadedData={() => {
                            setPlaybackFragmentErrorProjectId((eid) => (eid === item.id ? null : eid));
                          }}
                          src={fragmentUrl}
                        />
                        {playbackFragmentErrorProjectId === item.id ? (
                          <p className="mt-2 text-xs text-red-700">{t("videos.playbackError")}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={fragmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                      >
                        {t("videos.open")}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedVideoId((vid) => (vid === item.id ? null : vid));
                          setExpandedFragmentProjectId((current) => {
                            if (current === item.id) {
                              setPlaybackFragmentErrorProjectId((eid) => (eid === item.id ? null : eid));
                              return null;
                            }
                            return item.id;
                          });
                        }}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                      >
                        {expandedFragmentProjectId === item.id ? t("videos.closePlayer") : t("videos.play")}
                      </button>
                      <a
                        href={animationProjectDownloadUrl(item.id, { segmentOrder: 0 })}
                        download
                        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                      >
                        {t("videos.download")}
                      </a>
                    </div>
                    <p className="text-[11px] leading-snug text-zinc-500">{t("videos.fragmentPreviewHint")}</p>
                    <p className="text-[11px] leading-snug text-zinc-500">{t("videos.fragmentsSafariHint")}</p>
                  </div>
                ) : null}

                {hasPlayableFinal(item) && finalUrl && !failed ? (
                  <div className="mt-2 space-y-2 border-t border-zinc-100 pt-3">
                    {expandedVideoId === item.id ? (
                      <div>
                        <VideoPreview
                          key={finalUrl}
                          variant="version"
                          frameClassName="mt-0"
                          controls
                          playsInline
                          preload="none"
                          poster={thumb ?? undefined}
                          onError={() => setPlaybackErrorProjectId(item.id)}
                          onLoadedData={() => {
                            setPlaybackErrorProjectId((eid) => (eid === item.id ? null : eid));
                          }}
                          src={finalUrl}
                        />
                        {playbackErrorProjectId === item.id ? (
                          <p className="mt-2 text-xs text-red-700">{t("videos.playbackError")}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedFragmentProjectId((fid) => (fid === item.id ? null : fid));
                          setExpandedVideoId((current) => {
                            if (current === item.id) {
                              setPlaybackErrorProjectId((eid) => (eid === item.id ? null : eid));
                              return null;
                            }
                            return item.id;
                          });
                        }}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                      >
                        {expandedVideoId === item.id ? t("videos.closePlayer") : t("videos.play")}
                      </button>
                      <a
                        href={animationProjectDownloadUrl(item.id)}
                        download
                        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                      >
                        {t("videos.download")}
                      </a>
                    </div>
                  </div>
                ) : null}

                {processing ? (
                  <div className="mt-1 space-y-1 text-xs text-zinc-600">
                    <p>
                      {t("videos.processing")}
                      {item.latestExport != null ? (
                        <span className="ml-1 tabular-nums text-zinc-500">({exportProgress}%)</span>
                      ) : null}
                    </p>
                    {isClassic && item.status === "rendering" && item.latestExport ? (
                      <p className="text-[11px] leading-snug text-zinc-500">{t("videos.mergeStuckHint")}</p>
                    ) : null}
                    {isClassic &&
                    item.status === "rendering" &&
                    exportRecordIsCancellable(item.latestExport) ? (
                      <button
                        type="button"
                        disabled={cancelExportBusyId === item.id}
                        onClick={() => void cancelExportForProject(item.id)}
                        className="text-left font-medium text-amber-900 underline decoration-amber-700/50 hover:text-amber-950 disabled:opacity-50"
                      >
                        {cancelExportBusyId === item.id ? t("animate.retry.busy") : t("animate.export.cancel")}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {isClassic && (failed || canRetryMergeFromList(item)) ? (
                  <div className={`mt-1 text-xs ${failed ? "text-red-700" : "text-amber-950"}`}>
                    {failed ? (
                      <>
                        <p className="font-medium">{t("videos.status.failed")}</p>
                        {errSnippet ? <p className="mt-1 line-clamp-3 text-red-600/90">{errSnippet}</p> : null}
                      </>
                    ) : (
                      <p className="font-medium text-amber-900">{t("videos.exportMergeStuckTitle")}</p>
                    )}
                    {canRetryMergeFromList(item) ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-amber-100 bg-amber-50/80 p-2 text-amber-950">
                        <p className="text-[11px] leading-snug">{t("videos.mergeRetryHint")}</p>
                        <button
                          type="button"
                          disabled={retryMergeBusyId === item.id}
                          onClick={() => void retryMergeForProject(item.id)}
                          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {retryMergeBusyId === item.id ? t("animate.retry.busy") : t("animate.export.retryMerge")}
                        </button>
                      </div>
                    ) : null}
                    {failed ? (
                      <Link href="/animate/instant" prefetch={false} className="mt-2 inline-block font-medium text-emerald-800 underline">
                        {t("videos.createNew")}
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {instantNeedsRecovery ? (
                  <div className="mt-1 rounded-lg border border-amber-100 bg-amber-50/80 p-2 text-xs text-amber-950">
                    <p className="font-medium">{t("instant.recover.notCompleted")}</p>
                    <p className="mt-1 text-[11px] leading-snug">{t("instant.recover.hint")}</p>
                    <button
                      type="button"
                      disabled={recoverBusyId === item.id}
                      onClick={() => void recoverInstantProject(item.id)}
                      className="mt-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {recoverBusyId === item.id
                        ? t("instant.videoRepair.busy")
                        : t("instant.videoRepair.cta")}
                    </button>
                  </div>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs">
                  <Link
                    href={itemHref}
                    prefetch={false}
                    className="font-medium text-emerald-800 underline decoration-emerald-700/40 hover:text-emerald-950"
                  >
                    {gallerySection === "concepts"
                      ? t("projects.concept.continueEditing")
                      : t("videos.open")}
                  </Link>
                  <button
                    type="button"
                    disabled={deleteBusyId === item.id}
                    onClick={() => {
                      if (!window.confirm(t("videos.deleteProjectConfirm"))) {
                        return;
                      }
                      void deleteProject(item.id);
                    }}
                    className="font-medium text-zinc-500 underline decoration-zinc-400 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleteBusyId === item.id ? t("videos.processing") : t("videos.deleteProjectShort")}
                  </button>
                </div>
              </div>
            </li>
          );
        })
          : null}
      </ul>

      {renameTarget && session.user ? (
        <ProjectBundleSettingsDialog
          open
          projectId={renameTarget.projectId}
          ownerId={session.user.id}
          projectType={renameTarget.projectType}
          initialTitle={renameTarget.title}
          initialBundleName={null}
          initialBundleKey={null}
          peers={projects
            .filter((p) => p.id !== renameTarget.projectId)
            .map((p) => ({
              id: p.id,
              title: p.title ?? null,
              bundleName: null,
              bundleKey: null,
              projectType: p.projectType ?? "classic",
            }))}
          onClose={() => setRenameTarget(null)}
          onSaved={() => {
            setRenameTarget(null);
            void fetchList(1, "replace");
          }}
        />
      ) : null}

      {loading && projects.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">{t("videos.processing")}</p>
      ) : null}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLoadMore()}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? t("videos.processing") : t("videos.loadMore")}
          </button>
        </div>
      ) : null}
    </main>
  );
}

export default function VideosPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-sm text-zinc-600">…</p>
        </main>
      }
    >
      <VideosPageContent />
    </Suspense>
  );
}
