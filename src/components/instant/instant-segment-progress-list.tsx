"use client";

import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

type Props = {
  projectId: string;
  snapshot: InstantPremiumStatusResponse;
  segmentRetryBusy: number | null;
  mergeRetryBusy: boolean;
  onRetrySegment: (segmentIndex: number) => void;
  onRetryMerge: () => void;
};

export function InstantSegmentProgressList({
  projectId,
  snapshot,
  segmentRetryBusy,
  mergeRetryBusy,
  onRetrySegment,
  onRetryMerge,
}: Props) {
  const t = useActiveTranslator();
  const globalRetryingSegment =
    snapshot.retryState === "retrying_segment" && snapshot.retryingSegmentIndex != null;

  if (!snapshot.segments?.length) {
    return null;
  }

  return (
    <>
      {snapshot.segmentsMergeFailed ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">{t("instant.progress.segmentsMergeFailed")}</p>
          {snapshot.canRetryMerge ? (
            <button
              type="button"
              disabled={mergeRetryBusy || snapshot.retryState === "retrying_merge"}
              className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => onRetryMerge()}
            >
              {mergeRetryBusy || snapshot.retryState === "retrying_merge"
                ? t("instant.progress.retryingMerge")
                : t("instant.progress.retryMergeButton")}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={snapshot.segmentsMergeFailed ? "mt-4" : "mt-6"}>
        <h2 className="text-base font-semibold text-zinc-900">{t("instant.progress.segmentsTitle")}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t("instant.progress.segmentsHelp")}</p>
      </div>
      <div className="mt-3 space-y-3">
        {snapshot.segments.map((segment) => {
          const isRetryingThis =
            segmentRetryBusy === segment.index ||
            (globalRetryingSegment && snapshot.retryingSegmentIndex === segment.index);
          const canShowRetry =
            segment.canRetry && segment.status === "failed" && !isRetryingThis && segmentRetryBusy == null;

          return (
            <div
              key={segment.index}
              className={`rounded-xl border p-3 ${
                segment.status === "failed" ? "border-red-200 bg-red-50/40" : "border-zinc-200"
              }`}
            >
              <p className="text-xs font-semibold text-zinc-700">
                {t("instant.progress.segment")} #{segment.index + 1} — {segment.status}
              </p>
              {segment.videoUrl ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="mt-2 max-h-44 w-full rounded-lg border border-zinc-200 bg-black"
                >
                  <source src={segment.videoUrl} type="video/mp4" />
                </video>
              ) : segment.status !== "failed" ? (
                <p className="mt-1 text-xs text-zinc-500">{t("instant.progress.segmentPending")}</p>
              ) : null}
              {segment.errorCode ? (
                <p className="mt-1 font-mono text-xs text-red-800">
                  {t("instant.progress.segmentErrorCode", { code: segment.errorCode })}
                </p>
              ) : null}
              {segment.error && !segment.errorCode ? (
                <p className="mt-1 text-xs text-red-700">{segment.error}</p>
              ) : null}
              {segment.error && segment.errorCode ? (
                <p className="mt-1 text-xs text-red-700">{segment.error}</p>
              ) : null}
              {canShowRetry ? (
                <button
                  type="button"
                  disabled={segmentRetryBusy != null || mergeRetryBusy}
                  className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 disabled:opacity-60"
                  onClick={() => onRetrySegment(segment.index)}
                >
                  {t("instant.progress.retrySegment")}
                </button>
              ) : null}
              {isRetryingThis ? (
                <p className="mt-2 text-xs font-medium text-zinc-600">{t("instant.progress.retryingSegment")}</p>
              ) : null}
              {segment.videoUrl ? (
                <div className="mt-2">
                  <a
                    href={animationProjectDownloadUrl(projectId, { segmentOrder: segment.index })}
                    download={`homecheff-motion-${projectId}-segment-${segment.index + 1}.mp4`}
                    className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800"
                  >
                    {t("instant.progress.downloadSegment")}
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
