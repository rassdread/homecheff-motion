"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StudioLibraryCard } from "@/components/studio/studio-library-card";
import { useActiveTranslator } from "@/i18n/client";
import { fetchProjectMediaLibrary } from "@/lib/studio-asset-library-client";
import { PROJECT_MEDIA_SECTIONS } from "@/lib/studio-project-media-library";
import type { ProjectMediaItem, ProjectMediaSection, ProjectMediaSort, ProjectMediaStatus } from "@/lib/studio-project-media-library";
import { studioLibraryVisual } from "@/lib/studio-library-visual";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type Props = {
  initialSection?: ProjectMediaSection;
};

const SECTION_KEYS: Record<ProjectMediaSection, "studio.projectMedia.section.all" | "studio.projectMedia.section.images" | "studio.projectMedia.section.videos" | "studio.projectMedia.section.audio" | "studio.projectMedia.section.processing" | "studio.projectMedia.section.failed" | "studio.projectMedia.section.archive"> = {
  all: "studio.projectMedia.section.all",
  images: "studio.projectMedia.section.images",
  videos: "studio.projectMedia.section.videos",
  audio: "studio.projectMedia.section.audio",
  processing: "studio.projectMedia.section.processing",
  failed: "studio.projectMedia.section.failed",
  archive: "studio.projectMedia.section.archive",
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "";
  }
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function StudioProjectMediaBrowser({ initialSection = "all" }: Props) {
  const t = useActiveTranslator();
  const [section, setSection] = useState<ProjectMediaSection>(initialSection);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<ProjectMediaStatus | "all">("all");
  const [sort, setSort] = useState<ProjectMediaSort>("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ProjectMediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchProjectMediaLibrary({
      section,
      q: debouncedQuery,
      projectId,
      status,
      sort,
      page,
      untitled: t("videos.untitledProject"),
    });
    if (!result.ok) {
      setError(t("studio.projectMedia.loadFailed"));
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(result.items);
    setTotal(result.total);
    setPageSize(result.pageSize);
    setCounts(result.counts);
    setProjects(result.projects);
    setLoading(false);
  }, [section, debouncedQuery, projectId, status, sort, page, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PROJECT_MEDIA_SECTIONS.map((entry) => (
          <button
            key={entry}
            type="button"
            className={entry === section ? studioLibraryVisual.filterChipActive : studioLibraryVisual.filterChip}
            onClick={() => {
              setSection(entry);
              setPage(1);
              setSelectedId(null);
            }}
          >
            {t(SECTION_KEYS[entry])} ({counts[entry] ?? 0})
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={t("studio.projectMedia.search")}
          className={studioLibraryVisual.formControlWide}
          aria-label={t("studio.projectMedia.search")}
        />
        <select
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
            setPage(1);
          }}
          className={studioLibraryVisual.formControl}
          aria-label={t("studio.projectMedia.project")}
        >
          <option value="">{t("studio.projectMedia.allProjects")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProjectMediaStatus | "all");
            setPage(1);
          }}
          className={studioLibraryVisual.formControl}
          aria-label={t("studio.projectMedia.status")}
        >
          <option value="all">{t("studio.projectMedia.statusAll")}</option>
          <option value="completed">{t("studio.projectMedia.status.completed")}</option>
          <option value="processing">{t("studio.projectMedia.status.processing")}</option>
          <option value="failed">{t("studio.projectMedia.status.failed")}</option>
          <option value="archived">{t("studio.projectMedia.status.archived")}</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as ProjectMediaSort)}
          className={studioLibraryVisual.formControl}
          aria-label={t("studio.projectMedia.sort")}
        >
          <option value="newest">{t("studio.projectMedia.sortNewest")}</option>
          <option value="oldest">{t("studio.projectMedia.sortOldest")}</option>
          <option value="name">{t("studio.projectMedia.sortName")}</option>
        </select>
      </div>
      {error ? <p className={`mt-4 ${studioLibraryVisual.errorText}`}>{error}</p> : null}
      {loading ? <p className={`mt-4 ${studioLibraryVisual.loadingText}`}>{t("studio.projectMedia.loading")}</p> : null}
      {!loading && items.length === 0 ? <p className={`mt-4 ${studioLibraryVisual.emptyText}`}>{t("studio.projectMedia.empty")}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <StudioLibraryCard
              key={item.id}
              title={item.projectTitle}
              typeLabel={t(SECTION_KEYS[item.section])}
              statusLabel={t(`studio.projectMedia.status.${item.status}` as "studio.projectMedia.status.completed")}
              modifiedLabel={new Date(item.createdAt).toLocaleDateString()}
              thumbnailUrl={item.previewUrl}
              thumbnailFallback={item.mediaType === "video" ? "video" : item.mediaType === "audio" ? "audio" : "img"}
              selected={selectedId === item.id}
              onClick={() => setSelectedId(item.id)}
            />
          ))}
        </div>
        {selected ? <MediaViewer item={selected} /> : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className={studioLibraryVisual.filterChip}
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          {t("studio.projectMedia.previous")}
        </button>
        <p className={studioLibraryVisual.metaMuted}>{t("studio.projectMedia.page", { page: String(page), pages: String(pageCount) })}</p>
        <button
          type="button"
          className={studioLibraryVisual.filterChip}
          disabled={page >= pageCount}
          onClick={() => setPage((current) => current + 1)}
        >
          {t("studio.projectMedia.next")}
        </button>
      </div>
    </div>
  );
}

function MediaViewer({ item }: { item: ProjectMediaItem }) {
  const t = useActiveTranslator();
  const duration = formatDuration(item.durationSeconds);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(SECTION_KEYS[item.section])}</p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{item.projectTitle}</h3>
      <p className="mt-1 text-xs text-slate-600">{t(`studio.projectMedia.status.${item.status}` as "studio.projectMedia.status.completed")}</p>
      {item.playable && item.mediaType === "video" && item.mediaUrl ?
        <video controls playsInline poster={item.previewUrl ?? undefined} src={item.mediaUrl} className="mt-3 max-h-64 w-full rounded-xl bg-black" />
      : item.playable && item.mediaType === "audio" && item.mediaUrl ?
        <audio controls src={item.mediaUrl} className="mt-3 w-full" />
      : item.playable && item.previewUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.previewUrl} alt={item.projectTitle} className="mt-3 max-h-64 w-full rounded-xl object-cover" />
      : <p className="mt-3 text-sm text-slate-600">{t("studio.projectMedia.notPlayable")}</p>}
      <dl className="mt-3 space-y-1 text-xs text-slate-700">
        <div>
          <dt className="font-medium text-slate-900">{t("studio.projectMedia.created")}</dt>
          <dd>{new Date(item.createdAt).toLocaleString()}</dd>
        </div>
        {duration ?
          <div>
            <dt className="font-medium text-slate-900">{t("studio.projectMedia.duration")}</dt>
            <dd>{duration}</dd>
          </div>
        : null}
      </dl>
      {item.projectHref ?
        <Link href={item.projectHref} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#006D52] hover:underline">
          {t("studio.projectMedia.openProject")}
        </Link>
      : null}
    </div>
  );
}
