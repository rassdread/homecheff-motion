"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useActiveTranslator } from "@/i18n/client";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import { isActiveOcrScanPhase, type OcrScanPhase } from "@/lib/instant-ocr-scan";

function statusKeyForPhase(phase: OcrScanPhase | undefined): string {
  switch (phase) {
    case "queued":
      return "instant.ocrStatus.queued";
    case "optimizing":
      return "instant.ocrStatus.optimizing";
    case "uploading":
      return "instant.ocrStatus.uploading";
    case "calling_ocr":
      return "instant.ocrStatus.callingOcr";
    case "detecting_blocks":
      return "instant.ocrStatus.detectingBlocks";
    case "received_result":
      return "instant.ocrStatus.preparingProtection";
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
  const mounted = useMounted();
  const [, setTick] = useState(0);
  const active =
    isActiveOcrScanPhase(bakedText.scanPhase) ||
    bakedText.scanBusy ||
    bakedText.autoScanState === "scanning";

  useEffect(() => {
    if (!active || !bakedText.scanStartedAt) {
      return;
    }
    const timer = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(timer);
  }, [active, bakedText.scanStartedAt]);

  const phase = bakedText.scanPhase ?? (active ? "calling_ocr" : "idle");
  const labelKey = statusKeyForPhase(phase);
  const showDetailMessage =
    Boolean(bakedText.scanStatusMessage) &&
    (phase === "failed" || phase === "timeout" || phase === "interrupted");
  const blockCount = bakedText.scanBlockCount ?? bakedText.blocks.length;
  const liveElapsedMs =
    mounted && active && bakedText.scanStartedAt
      ? Date.now() - new Date(bakedText.scanStartedAt).getTime()
      : bakedText.scanDurationMs;

  const progressPercent = (() => {
    if (!active) {
      return 0;
    }
    switch (phase) {
      case "queued":
        return 12;
      case "optimizing":
        return 28;
      case "uploading":
        return 42;
      case "calling_ocr":
        return 68;
      case "detecting_blocks":
        return 88;
      default:
        return 10;
    }
  })();

  return (
    <div className="mt-2 space-y-2">
      {active ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : null}
      <p
        className={`text-xs ${active ? "text-sky-800" : "text-zinc-600"} ${active ? "animate-pulse" : ""}`}
      >
        {active ? (
          <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700 align-[-2px]" />
        ) : null}
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
      {mounted && isAdmin && bakedText.scanRequestId ? (
        <p className="font-mono text-[10px] text-zinc-400">
          {bakedText.scanRequestId.slice(0, 8)}…
          {liveElapsedMs != null ? ` · ${liveElapsedMs}ms` : ""}
          {bakedText.scanProvider ? ` · ${bakedText.scanProvider}` : ""}
        </p>
      ) : null}
    </div>
  );
}
