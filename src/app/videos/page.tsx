"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDurationSeconds, getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import { getAnimationPreset, validateAnimationPresetId } from "@/lib/animation-presets";
import { getActiveLocale, getActiveTranslator } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import type {
  AnimationProjectListItem,
  AnimationProjectListResponse,
} from "@/types/animation-api";

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
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

function listItemDurationLabel(item: AnimationProjectListItem): string {
  const sec = item.estimatedTotalDurationSeconds;
  if (sec == null || !Number.isFinite(sec)) {
    return "—";
  }
  const locale = getActiveLocale() === "nl" ? "nl" : "en";
  return formatDurationSeconds(sec, locale);
}

function hasPlayableFinal(item: AnimationProjectListItem): boolean {
  const url = item.latestExport?.outputVideoUrl?.trim();
  return Boolean(url);
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

export default function VideosPage() {
  const t = getActiveTranslator();
  const session = useAuthSession();
  const [listAll, setListAll] = useState(false);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<AnimationProjectListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  const isAdmin = session.resolved && session.user?.role === "admin";

  const dateFmt = useMemo(() => {
    const loc = getActiveLocale() === "nl" ? "nl-NL" : "en-US";
    return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" });
  }, []);

  const fetchList = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("limit", "20");
        if (isAdmin && listAll) {
          params.set("all", "true");
        }
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
        setProjects((prev) => (mode === "append" ? [...prev, ...body.projects] : body.projects));
        setPage(nextPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("videos.error"));
        if (mode === "replace") {
          setProjects([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, listAll, t]
  );

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
  }, [session.resolved, session.user, listAll, fetchList]);

  const handleLoadMore = () => {
    if (!hasMore || loading) {
      return;
    }
    void fetchList(page + 1, "append");
  };

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

      {error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
          {t("videos.error")}: {error}
        </p>
      ) : null}

      {!loading && projects.length === 0 && !error ? (
        <div className="mt-10 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">{t("videos.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-zinc-600">{t("videos.emptyDescription")}</p>
          <Link
            href="/animate"
            className="mt-6 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
          >
            {t("videos.createNew")}
          </Link>
        </div>
      ) : null}

      <ul className="mt-8 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((item) => {
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
              ? listItemDurationLabel(item)
              : formatDurationSeconds(durationFromParts, getActiveLocale() === "nl" ? "nl" : "en");
          const intentKey = intentLabelKey(item.intent);
          const finalUrl = item.latestExport?.outputVideoUrl?.trim() || null;
          const failed = isFailedState(item);
          const processing = isProcessingState(item);
          const exportProgress = item.latestExport?.progress ?? 0;
          const errSnippet = item.latestExport?.errorMessage?.trim() || null;

          return (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
            >
              <Link href={`/videos/${item.id}`} className="block shrink-0">
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
                    {t(statusLabelKey(item.status))}
                  </span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/videos/${item.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {dateFmt.format(new Date(item.createdAt))}
                    </p>
                  </Link>
                </div>

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

                {finalUrl && !failed ? (
                  <div className="mt-2 space-y-2 border-t border-zinc-100 pt-3">
                    {expandedVideoId === item.id ? (
                      <video
                        className="w-full rounded-lg bg-black"
                        controls
                        playsInline
                        preload="metadata"
                        poster={thumb ?? undefined}
                        src={finalUrl}
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedVideoId((id) => (id === item.id ? null : item.id))
                        }
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                      >
                        {expandedVideoId === item.id ? t("videos.open") : t("videos.play")}
                      </button>
                      <a
                        href={finalUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                      >
                        {t("videos.download")}
                      </a>
                    </div>
                    <p className="text-[11px] leading-snug text-zinc-500">{t("videos.downloadHint")}</p>
                  </div>
                ) : null}

                {processing ? (
                  <p className="mt-1 text-xs text-zinc-600">
                    {t("videos.processing")}
                    {item.latestExport != null ? (
                      <span className="ml-1 tabular-nums text-zinc-500">({exportProgress}%)</span>
                    ) : null}
                  </p>
                ) : null}

                {failed ? (
                  <div className="mt-1 text-xs text-red-700">
                    <p className="font-medium">{t("videos.status.failed")}</p>
                    {errSnippet ? <p className="mt-1 line-clamp-3 text-red-600/90">{errSnippet}</p> : null}
                    <Link href="/animate" className="mt-2 inline-block font-medium text-emerald-800 underline">
                      {t("videos.createNew")}
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

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
