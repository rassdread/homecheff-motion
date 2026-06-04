"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { MotionStudioIntelligencePanel } from "@/components/instant/motion/motion-studio-intelligence-panel";
import {
  fetchStudioIntelligenceStale,
  postRefreshStudioIntelligence,
} from "@/lib/refresh-studio-intelligence-client";
import type { ProjectStudioQaResponse } from "@/types/studio-project-persistence";

type Props = {
  projectId: string;
  studioQa: ProjectStudioQaResponse;
  draftOnlyWarning?: boolean;
  compact?: boolean;
  onStudioQaUpdated?: (qa: ProjectStudioQaResponse) => void;
};

const STATUS_CLASS: Record<ProjectStudioQaResponse["status"], string> = {
  current: "bg-emerald-50 text-emerald-900 border-emerald-200",
  stale: "bg-amber-50 text-amber-950 border-amber-200",
  missing: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function MotionProjectStudioQaPanel({
  projectId,
  studioQa,
  draftOnlyWarning = false,
  compact = false,
  onStudioQaUpdated,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [staleCheckBusy, setStaleCheckBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const storyboardOutdated =
    studioQa.storyboardOutdated ||
    studioQa.status === "stale" ||
    studioQa.storyboardStale?.isStale;

  const runStaleCheck = async () => {
    setStaleCheckBusy(true);
    setActionError(null);
    try {
      const res = await fetchStudioIntelligenceStale(projectId, true);
      const body = res.data;
      if (!res.ok || !body.ok) {
        setActionError(
          body && "error" in body && body.error
            ? body.error
            : t("motion.qa.refresh.errorGeneric")
        );
        return;
      }
      if (body.studioQa) {
        onStudioQaUpdated?.(body.studioQa);
      } else if (body.staleness.isStale) {
        onStudioQaUpdated?.({
          ...studioQa,
          storyboardStale: body.staleness,
          storyboardOutdated: true,
        });
      }
    } finally {
      setStaleCheckBusy(false);
    }
  };

  const runRefresh = async () => {
    setRefreshBusy(true);
    setActionError(null);
    try {
      const res = await postRefreshStudioIntelligence(projectId, { refreshQa: true });
      const body = res.data;
      if (!res.ok || !body.ok) {
        setActionError(
          body && "error" in body && body.error
            ? body.error
            : t("motion.qa.refresh.errorGeneric")
        );
        return;
      }
      onStudioQaUpdated?.(body.studioQa);
    } finally {
      setRefreshBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {draftOnlyWarning ?
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {t("motion.qa.server.draftOnlyWarning")}
        </p>
      : null}
      {storyboardOutdated ?
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold">{t("motion.qa.refresh.outdatedTitle")}</p>
          <p className="mt-1">{t("motion.qa.refresh.outdatedBody")}</p>
          {studioQa.storyboardStale?.reasons.length ?
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              {studioQa.storyboardStale.reasons.slice(0, 4).map((r) => (
                <li key={r.code}>{r.message}</li>
              ))}
            </ul>
          : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshBusy}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-60"
              onClick={() => void runRefresh()}
            >
              {refreshBusy ? t("motion.qa.refresh.refreshing") : t("motion.qa.refresh.refreshQa")}
            </button>
            <Link
              href={`/studio/storyboards/${encodeURIComponent(studioQa.source.storyboardId)}`}
              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-[#006D52]"
            >
              {t("motion.qa.importSummary.openStoryboard")}
            </Link>
            <button
              type="button"
              disabled={staleCheckBusy}
              className="rounded-lg px-2 py-1.5 text-xs text-amber-900 underline disabled:opacity-60"
              onClick={() => void runStaleCheck()}
            >
              {staleCheckBusy ? t("motion.qa.refresh.checking") : t("motion.qa.refresh.recheck")}
            </button>
          </div>
        </div>
      : null}
      {studioQa.status === "stale" && !storyboardOutdated ?
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {t("motion.qa.server.staleWarning")}
        </p>
      : null}
      {actionError ?
        <p className="text-xs text-red-700">{actionError}</p>
      : null}
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/30">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="text-sm font-semibold text-violet-950">
            {t("motion.qa.server.panelTitle")}
          </span>
          <span className="flex items-center gap-2">
            {storyboardOutdated ?
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                {t("motion.qa.refresh.outdatedBadge")}
              </span>
            : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[studioQa.status]}`}
            >
              {t(`motion.qa.server.status.${studioQa.status}`)}
            </span>
            <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
          </span>
        </button>
        {open ?
          <div className="space-y-3 border-t border-violet-200/60 px-4 py-4">
            <p className="text-xs text-zinc-600">
              {t("motion.qa.source.storyboard")}:{" "}
              <span className="font-medium text-zinc-900">{studioQa.source.storyboardTitle}</span>
              {!compact ?
                <>
                  {" "}
                  <Link
                    href={`/studio/storyboards/${encodeURIComponent(studioQa.source.storyboardId)}`}
                    className="text-[#006D52] underline"
                  >
                    {t("motion.qa.importSummary.openStoryboard")}
                  </Link>
                </>
              : null}
            </p>
            {studioQa.source.refreshedAt ?
              <p className="text-xs text-zinc-500">
                {t("motion.qa.refresh.lastRefreshed", {
                  date: new Date(studioQa.source.refreshedAt).toLocaleString(),
                })}
              </p>
            : null}
            {!storyboardOutdated ?
              <button
                type="button"
                disabled={refreshBusy}
                className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-950 disabled:opacity-60"
                onClick={() => void runRefresh()}
              >
                {refreshBusy ? t("motion.qa.refresh.refreshing") : t("motion.qa.refresh.refreshQa")}
              </button>
            : null}
            <MotionStudioIntelligencePanel
              intelligence={studioQa.intelligence}
              readiness={studioQa.readiness}
            />
          </div>
        : null}
      </div>
    </div>
  );
}
