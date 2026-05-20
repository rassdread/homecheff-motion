"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import { isActiveOcrScanPhase, type OcrScanPhase } from "@/lib/instant-ocr-scan";

function statusKeyForPhase(phase: OcrScanPhase | undefined): string {
  switch (phase) {
    case "queued":
      return "instant.ocrStatus.queued";
    case "uploading":
      return "instant.ocrStatus.uploading";
    case "calling_ocr":
      return "instant.ocrStatus.callingOcr";
    case "received_result":
      return "instant.ocrStatus.receivedResult";
    case "auto_protected":
      return "instant.ocrStatus.autoProtected";
    case "needs_review":
      return "instant.ocrStatus.needsReview";
    case "no_text_found":
      return "instant.ocrStatus.noText";
    case "timeout":
      return "instant.ocrStatus.timeout";
    case "failed":
      return "instant.ocrStatus.failed";
    case "skipped":
      return "instant.ocrStatus.skipped";
    case "interrupted":
      return "instant.ocrStatus.interrupted";
    default:
      return "instant.ocrStatus.idle";
  }
}

type Props = {
  bakedText: BakedTextProtectionDraft;
  isAdmin?: boolean;
};

export function InstantOcrStatusLine({ bakedText, isAdmin }: Props) {
  const t = useActiveTranslator();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const active =
    isActiveOcrScanPhase(bakedText.scanPhase) ||
    bakedText.scanBusy ||
    bakedText.autoScanState === "scanning";

  useEffect(() => {
    if (!active || !bakedText.scanStartedAt) {
      return;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active, bakedText.scanStartedAt]);

  const phase = bakedText.scanPhase ?? (active ? "calling_ocr" : "idle");
  const labelKey = statusKeyForPhase(phase);
  const showDetailMessage =
    Boolean(bakedText.scanStatusMessage) &&
    (phase === "failed" || phase === "timeout" || phase === "interrupted");
  const blockCount = bakedText.scanBlockCount ?? bakedText.blocks.length;
  const liveElapsedMs =
    active && bakedText.scanStartedAt
      ? nowMs - new Date(bakedText.scanStartedAt).getTime()
      : bakedText.scanDurationMs;

  return (
    <div className="mt-2 space-y-1">
      <p
        className={`text-xs ${active ? "text-sky-800" : "text-zinc-600"} ${active ? "animate-pulse" : ""}`}
      >
        {t(labelKey as never)}
        {blockCount > 0 && bakedText.scanPhase === "calling_ocr" ? (
          <span className="text-zinc-500"> · {t("instant.ocrStatus.blocksPending")}</span>
        ) : null}
        {blockCount > 0 &&
        (bakedText.scanPhase === "needs_review" ||
          bakedText.scanPhase === "auto_protected" ||
          bakedText.scanPhase === "received_result") ? (
          <span className="text-zinc-500">
            {" "}
            · {t("instant.ocrStatus.blocksFound", { count: blockCount })}
          </span>
        ) : null}
      </p>
      {showDetailMessage ? (
        <p className="text-xs text-red-800/90">{bakedText.scanStatusMessage}</p>
      ) : null}
      {isAdmin && bakedText.scanRequestId ? (
        <p className="font-mono text-[10px] text-zinc-400">
          {bakedText.scanRequestId.slice(0, 8)}…
          {liveElapsedMs != null ? ` · ${liveElapsedMs}ms` : ""}
          {bakedText.scanProvider ? ` · ${bakedText.scanProvider}` : ""}
          {bakedText.scanAverageConfidence != null
            ? ` · ${Math.round(bakedText.scanAverageConfidence * 100)}%`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
