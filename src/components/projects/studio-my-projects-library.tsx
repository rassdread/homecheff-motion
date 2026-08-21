"use client";

/**
 * S2H — Human “Mijn projecten” library.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type {
  StudioProjectHumanStatus,
  StudioProjectHumanType,
  StudioProjectRecommendedAction,
  StudioProjectSummary,
} from "@/types/studio-project-summary";

function trackProjectsEvent(
  event: string,
  props?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("homecheff:studio-projects", { detail: { event, ...props } })
    );
  } catch {
    /* ignore */
  }
}

function formatRelativeEdited(iso: string, t: (k: TranslationKey) => string, locale: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const diff = Date.now() - ms;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && new Date(ms).getDate() === new Date().getDate()) {
    return t("studio.projects.date.today");
  }
  if (diff < 2 * day) return t("studio.projects.date.yesterday");
  if (diff < 7 * day) {
    const days = Math.max(2, Math.floor(diff / day));
    return t("studio.projects.date.daysAgo").replace("{days}", String(days));
  }
  try {
    return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

function statusLabelKey(status: StudioProjectHumanStatus): TranslationKey {
  return `studio.projects.status.${status}` as TranslationKey;
}

function typeLabelKey(type: StudioProjectHumanType): TranslationKey {
  return `studio.projects.type.${type}` as TranslationKey;
}

function actionLabelKey(action: StudioProjectRecommendedAction): TranslationKey {
  return `studio.projects.action.${action}` as TranslationKey;
}

export function StudioMyProjectsLibrary() {
  const t = useActiveTranslator();
  const [projects, setProjects] = useState<StudioProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [locale, setLocale] = useState("nl");

  useEffect(() => {
    try {
      const lang = document.documentElement.lang || "nl";
      setLocale(lang.startsWith("en") ? "en" : "nl");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async (cursor?: string | null, append = false) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "40" });
      if (cursor) qs.set("cursor", cursor);
      const res = await fetch(`/api/studio/projects?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("studio.projects.error.load"));
        if (!append) setProjects([]);
        return;
      }
      const data = (await res.json()) as {
        projects: StudioProjectSummary[];
        nextCursor: string | null;
      };
      setProjects((prev) => (append ? [...prev, ...data.projects] : data.projects));
      setNextCursor(data.nextCursor);
      if (!append) {
        trackProjectsEvent("studio_projects_view", { count: data.projects.length });
      }
    } catch {
      setError(t("studio.projects.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayTitle = (p: StudioProjectSummary) =>
    p.title.trim() || t("studio.projects.fallbackTitle");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-testid="studio-my-projects">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {t("studio.projects.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.projects.subtitle")}</p>
        </div>
        <Link
          href="/studio"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white hover:bg-[#005a44]"
        >
          {t("studio.projects.cta.create")}
        </Link>
      </header>

      {error ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-[#006D52] underline-offset-2 hover:underline"
            onClick={() => void load()}
          >
            {t("studio.projects.retry")}
          </button>
        </div>
      ) : null}

      {loading && projects.length === 0 ? (
        <ul className="space-y-3" aria-busy="true" aria-label={t("studio.projects.loading")}>
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-50"
            />
          ))}
        </ul>
      ) : null}

      {!loading && projects.length === 0 && !error ? (
        <div
          className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center"
          data-testid="studio-my-projects-empty"
        >
          <p className="text-base font-semibold text-zinc-900">{t("studio.projects.empty.title")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            {t("studio.projects.empty.hint")}
          </p>
          <Link
            href="/studio"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white"
          >
            {t("studio.projects.cta.create")}
          </Link>
        </div>
      ) : null}

      {projects.length > 0 ? (
        <ul className="flex flex-col gap-3" data-testid="studio-my-projects-list">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
              data-project-id={project.id}
              data-project-status={project.status}
            >
              <div className="flex gap-3 sm:gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-20 sm:w-20">
                  {project.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                      {t(typeLabelKey(project.humanType))}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-zinc-900">
                    {displayTitle(project)}
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    <span>{t(typeLabelKey(project.humanType))}</span>
                    <span aria-hidden className="mx-1.5 text-zinc-300">
                      ·
                    </span>
                    <span>{t(statusLabelKey(project.status))}</span>
                    <span aria-hidden className="mx-1.5 text-zinc-300">
                      ·
                    </span>
                    <span>{formatRelativeEdited(project.lastEditedAt, t, locale)}</span>
                  </p>
                  {project.localOnly ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{t("studio.projects.localOnly")}</p>
                  ) : null}
                  {project.secondaryWarningKey ? (
                    <p className="mt-0.5 text-xs text-amber-800">
                      {t(project.secondaryWarningKey as TranslationKey)}
                    </p>
                  ) : null}
                  {project.versionCount > 1 ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("studio.projects.versionCount").replace(
                        "{count}",
                        String(project.versionCount)
                      )}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={project.continueHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white hover:bg-[#005a44]"
                      onClick={() =>
                        trackProjectsEvent("studio_project_continue", {
                          id: project.sourceId,
                          action: project.recommendedAction,
                        })
                      }
                    >
                      {t(actionLabelKey(project.recommendedAction))}
                    </Link>

                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        aria-label={t("studio.projects.moreActions")}
                        aria-expanded={menuOpenId === project.id}
                        onClick={() =>
                          setMenuOpenId((id) => (id === project.id ? null : project.id))
                        }
                      >
                        ⋯
                      </button>
                      {menuOpenId === project.id ? (
                        <div
                          className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
                          role="menu"
                        >
                          <Link
                            href={project.continueHref}
                            className="block px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
                            role="menuitem"
                            onClick={() => {
                              trackProjectsEvent("studio_project_open", {
                                id: project.sourceId,
                              });
                              setMenuOpenId(null);
                            }}
                          >
                            {t("studio.projects.menu.open")}
                          </Link>
                          {project.canDownload && project.latestResultUrl ? (
                            <a
                              href={project.latestResultUrl}
                              download
                              className="block px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
                              role="menuitem"
                              onClick={() => {
                                trackProjectsEvent("studio_project_download", {
                                  id: project.sourceId,
                                });
                                setMenuOpenId(null);
                              }}
                            >
                              {t("studio.projects.menu.download")}
                            </a>
                          ) : null}
                          {project.canReturnGrowth && project.returnUrl ? (
                            <a
                              href={project.returnUrl}
                              className="block px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
                              role="menuitem"
                              onClick={() => {
                                trackProjectsEvent("studio_project_origin_open", {
                                  origin: "growth",
                                });
                                setMenuOpenId(null);
                              }}
                            >
                              {t("studio.projects.menu.returnGrowth")}
                            </a>
                          ) : null}
                          {project.canOpenHomecheff && project.returnUrl ? (
                            <a
                              href={project.returnUrl}
                              className="block px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
                              role="menuitem"
                              onClick={() => {
                                trackProjectsEvent("studio_project_origin_open", {
                                  origin: "homecheff",
                                });
                                setMenuOpenId(null);
                              }}
                            >
                              {t("studio.projects.menu.openHomecheff")}
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {nextCursor ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loading}
            className="min-h-11 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => void load(nextCursor, true)}
          >
            {t("studio.projects.loadMore")}
          </button>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-zinc-500">
        <Link href="/studio/storyboards" className="underline-offset-2 hover:underline">
          {t("studio.projects.legacyStoryboards")}
        </Link>
        <span aria-hidden className="mx-2">
          ·
        </span>
        <Link href="/videos" className="underline-offset-2 hover:underline">
          {t("studio.projects.legacyVideos")}
        </Link>
        <span aria-hidden className="mx-2">
          ·
        </span>
        <Link href="/projects/packages" className="underline-offset-2 hover:underline">
          {t("studio.projects.legacyPackages")}
        </Link>
      </p>
    </div>
  );
}
