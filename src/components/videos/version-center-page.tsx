"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoPreview } from "@/components/ui/video-preview";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { brand } from "@/lib/brand";
import {
  buildVersionCenterRows,
  rowsForTab,
  tabCounts,
  versionCenterTabTitleKey,
  VERSION_CENTER_TABS,
  type VersionCenterTab,
} from "@/lib/version-center-tabs";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

export function VersionCenterPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const t = useActiveTranslator();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<VersionCenterTab>("original");

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as AnimationProjectDetailResponse | null;
      if (!res.ok || !json) {
        throw new Error(t("versions.center.loadError"));
      }
      setDetail(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("versions.center.loadError"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => (detail ? buildVersionCenterRows(detail) : []), [detail]);
  const counts = useMemo(() => tabCounts(rows), [rows]);
  const visible = useMemo(() => rowsForTab(rows, tab), [rows, tab]);

  return (
    <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              {t("versions.center.label")}
            </p>
            <h1 className="text-2xl font-bold text-zinc-900">{t("versions.center.title")}</h1>
            {detail?.title ? (
              <p className="mt-1 text-sm text-zinc-600">{detail.title}</p>
            ) : null}
          </div>
          <Link
            href={`/videos/${id}`}
            prefetch={false}
            className="text-sm font-semibold text-[#0067B1] hover:underline"
          >
            {t("versions.center.backToProject")} →
          </Link>
        </div>

        <div className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {VERSION_CENTER_TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold sm:px-4 sm:text-sm ${
                tab === key
                  ? "border-[#006D52]/40 bg-[#006D52]/10 text-[#006D52]"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t(versionCenterTabTitleKey(key) as never)} ({counts[key]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600">{t("instant.loading")}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {!loading && !error && visible.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
            {t("versions.center.empty")}
          </p>
        ) : null}

        <div className="space-y-4">
          {visible.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 sm:max-w-[200px]">
                  {row.videoUrl ? (
                    <VideoPreview src={row.videoUrl} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                      {t("versions.center.noPreview")}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-zinc-900">{row.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.status}
                    {row.createdAt ? ` · ${new Date(row.createdAt).toLocaleString()}` : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={row.href}
                      prefetch={false}
                      className="rounded-full border border-[#006D52]/30 bg-[#006D52]/5 px-3 py-1.5 text-xs font-semibold text-[#006D52] hover:bg-[#006D52]/10"
                    >
                      {t("versions.center.open")}
                    </Link>
                    {row.videoUrl ? (
                      <a
                        href={animationProjectDownloadUrl(row.projectId, {
                          renderVersionId: row.renderVersionId,
                          languageExportId: row.languageExportId,
                          languageCode: row.languageCode,
                        })}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        {t("versions.center.download")}
                      </a>
                    ) : null}
                    {row.canOpenEditor ? (
                      <Link
                        href={
                          row.kind === "full_rerender"
                            ? `/videos/${row.projectId}?openFullRerender=1`
                            : `/videos/${row.projectId}/edit-version`
                        }
                        prefetch={false}
                        className="rounded-full border border-[#0067B1]/30 px-3 py-1.5 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
                      >
                        {t("versions.center.openEditor")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
