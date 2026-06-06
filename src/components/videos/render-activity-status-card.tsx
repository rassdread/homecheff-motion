"use client";

import { useCallback, useMemo, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  detectStuckRender,
  isActiveRenderProjectStatus,
  normalizeActivityStatus,
} from "@/lib/render-activity-status";
import type { CancelCreditSummary } from "@/lib/render-cancel-credits";
import {
  postCancelProjectRender,
  postRefreshProviderStatus,
  postRepairProjectStatus,
  postRetryProjectRender,
} from "@/lib/render-activity-client";
import { resolveProjectDisplayStatus } from "@/lib/project-display-status";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

type Props = {
  projectId: string;
  projectStatus: string;
  exportStatus?: string | null;
  outputVideoUrl?: string | null;
  startedAtMs: number | null;
  lastUpdatedAtMs: number | null;
  lastProgressAtMs: number | null;
  providerJobIds?: string[];
  creditsSummary?: CancelCreditSummary | null;
  isAdmin?: boolean;
  className?: string;
  onActionComplete?: (payload: {
    action: "cancel" | "retry" | "refresh" | "repair";
    status?: InstantPremiumStatusResponse;
    projectStatus?: string;
    credits?: CancelCreditSummary;
  }) => void;
};

function displayStatusLabelKey(status: string): TranslationKey {
  switch (status) {
    case "completed":
      return "videos.status.completed";
    case "generating":
      return "videos.status.generating";
    case "rendering":
      return "videos.status.rendering";
    case "failed":
      return "videos.status.failed";
    case "cancelled":
      return "renderActivity.status.cancelled";
    default:
      return "videos.status.queued";
  }
}

function creditMessageKey(summary: CancelCreditSummary | null | undefined): TranslationKey {
  if (!summary) {
    return "renderActivity.credits.checking";
  }
  if (summary.costStatus === "pending_cost_check") {
    return "renderActivity.credits.checking";
  }
  if (summary.costStatus === "none" || summary.creditsUsed === 0) {
    return "renderActivity.credits.none";
  }
  return "renderActivity.credits.used";
}

export function RenderActivityStatusCard({
  projectId,
  projectStatus,
  exportStatus,
  outputVideoUrl,
  startedAtMs,
  lastUpdatedAtMs,
  lastProgressAtMs,
  providerJobIds = [],
  creditsSummary,
  isAdmin = false,
  className = "",
  onActionComplete,
}: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState<"cancel" | "retry" | "refresh" | "repair" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localCredits, setLocalCredits] = useState<CancelCreditSummary | null>(
    creditsSummary ?? null
  );

  const displayStatus = resolveProjectDisplayStatus({
    projectStatus,
    exportStatus,
    outputVideoUrl,
  });
  const normalizedProjectStatus = normalizeActivityStatus(projectStatus);
  const active = isActiveRenderProjectStatus(projectStatus);

  const stuck = useMemo(
    () =>
      detectStuckRender({
        status: normalizedProjectStatus,
        activityStartedAtMs: startedAtMs,
        lastProgressAtMs: lastProgressAtMs ?? lastUpdatedAtMs,
      }),
    [normalizedProjectStatus, startedAtMs, lastProgressAtMs, lastUpdatedAtMs]
  );

  const credits = localCredits ?? creditsSummary;

  const runAction = useCallback(
    async (action: "cancel" | "retry" | "refresh" | "repair", forceLocal?: boolean) => {
      setBusy(action);
      setFeedback(null);
      try {
        const result =
          action === "cancel" ?
            await postCancelProjectRender(projectId, { forceLocal })
          : action === "retry" ?
            await postRetryProjectRender(projectId)
          : action === "repair" ?
            await postRepairProjectStatus(projectId)
          : await postRefreshProviderStatus(projectId);

        if (!result.ok) {
          setFeedback(result.data.error ?? t("renderActivity.error.generic"));
          return;
        }

        if (result.data.credits) {
          setLocalCredits(result.data.credits);
        }

        if (action === "cancel") {
          setFeedback(t("renderActivity.cancelledNotice"));
        }

        onActionComplete?.({
          action,
          status: result.data.status,
          projectStatus: result.data.projectStatus,
          credits: result.data.credits,
        });
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : t("renderActivity.error.generic"));
      } finally {
        setBusy(null);
      }
    },
    [projectId, onActionComplete, t]
  );

  if (!active && normalizedProjectStatus !== "cancelled") {
    return null;
  }

  const cancelLabel =
    displayStatus === "rendering" ?
      t("renderActivity.action.cancelRender")
    : t("renderActivity.action.stopGeneration");

  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("renderActivity.title")}
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {t(displayStatusLabelKey(normalizedProjectStatus === "cancelled" ? "cancelled" : displayStatus))}
          </p>
        </div>
        {stuck.stuck ?
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            {t("renderActivity.stuck.badge")}
          </span>
        : null}
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">{t("renderActivity.startedAt")}</dt>
          <dd className="font-medium text-zinc-800">
            {startedAtMs ?
              <ClientFormattedDateTime iso={new Date(startedAtMs).toISOString()} />
            : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("renderActivity.lastUpdate")}</dt>
          <dd className="font-medium text-zinc-800">
            {lastUpdatedAtMs ?
              <ClientFormattedDateTime iso={new Date(lastUpdatedAtMs).toISOString()} />
            : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">{t("renderActivity.credits.label")}</dt>
          <dd className="font-medium text-zinc-800">
            {credits?.costStatus === "known" && credits.creditsUsed != null ?
              t("renderActivity.credits.used", { count: String(Math.round(credits.creditsUsed)) })
            : t(creditMessageKey(credits))}
          </dd>
        </div>
        {isAdmin && providerJobIds.length > 0 ?
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">{t("renderActivity.providerJobIds")}</dt>
            <dd className="font-mono text-xs text-zinc-700">{providerJobIds.join(", ")}</dd>
          </div>
        : null}
      </dl>

      {stuck.stuck ?
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("renderActivity.stuck.message")}
        </p>
      : null}

      {normalizedProjectStatus === "cancelled" ?
        <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {t("renderActivity.cancelled.details")}
        </p>
      : null}

      {feedback ?
        <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {feedback}
        </p>
      : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {active ?
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void runAction("cancel")}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
          >
            {busy === "cancel" ? t("button.loading") : cancelLabel}
          </button>
        : null}
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void runAction("retry")}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50"
        >
          {busy === "retry" ? t("button.loading") : t("renderActivity.action.retry")}
        </button>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void runAction("refresh")}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50"
        >
          {busy === "refresh" ? t("button.loading") : t("renderActivity.action.refresh")}
        </button>
        {stuck.stuck ?
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void runAction("repair")}
            className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50"
          >
            {busy === "repair" ? t("button.loading") : t("renderActivity.action.checkStatus")}
          </button>
        : null}
        {isAdmin ?
          <>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void runAction("refresh")}
              className="rounded-full border border-[#0067B1]/30 px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
            >
              {t("renderActivity.action.providerCheck")}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void runAction("cancel", true)}
              className="rounded-full border border-red-400 px-4 py-2 text-sm font-semibold text-red-900 disabled:opacity-50"
            >
              {t("renderActivity.action.forceCancelLocal")}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void runAction("repair")}
              className="rounded-full border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {t("renderActivity.action.repair")}
            </button>
          </>
        : null}
      </div>
    </section>
  );
}
