"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { hashImageBlob, shouldPromptBakedTextReview } from "@/lib/baked-text-auto-scan";
import {
  getCachedBakedTextOcr,
  setCachedBakedTextOcr,
  setCachedBakedTextOcrNoText,
} from "@/lib/baked-text-ocr-client-cache";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import { prepareOcrBlob } from "@/lib/ocr-image-prep";
import { logOcrPerf } from "@/lib/ocr-performance-log";
import { estimateLikelyHasTextFromBlob } from "@/lib/ocr-text-heuristics";
import { OcrConcurrencyQueue } from "@/lib/ocr-concurrency-queue";
import { isRetryableOcrErrorCode } from "@/lib/ocr-provider-errors";
import {
  CHECKOUT_PENDING_SCAN_WAIT_MS,
  createScanRequestId,
  type DetectTextApiResponse,
  fetchJsonWithTimeout,
  isActiveOcrScanPhase,
  isTimeoutError,
  logOcrAutoScan,
  OCR_AUTO_RETRY_DELAY_MS,
  OCR_AUTO_RETRY_MAX,
  OCR_IMMEDIATE_AUTO_SCAN_COUNT,
  OCR_MAX_CONCURRENT_SCANS,
  OCR_OPENAI_TIMEOUT_MS,
  OCR_SCAN_CLIENT_FETCH_TIMEOUT_MS,
  OCR_UPLOAD_TIMEOUT_MS,
  OCR_WATCHDOG_TIMEOUT_MS,
  withTimeout,
} from "@/lib/instant-ocr-scan";
import { IMAGE_UPLOAD_USER_MESSAGE_NL } from "@/lib/instant-image-upload-errors";
import type { UploadImageResponse } from "@/types/animation-api";

export type LocalImageWithBakedText = {
  id: string;
  originalFileName: string;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  mimeType: string;
  sizeBytes: number;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  bakedText: BakedTextProtectionDraft;
  remoteWorkingUrl?: string;
};

type ScanResultPayload = {
  blocks: BakedTextBlockRecord[];
  autoConfirmed: boolean;
  provider?: string;
  blockCount?: number;
  averageConfidence?: number;
  durationMs?: number;
  scanRequestId: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useInstantOcrAutoScan(params: {
  fastRenderMode: boolean;
  t: (key: string, values?: Record<string, string | number | undefined>) => string;
  uploadOcrBlob: (img: LocalImageWithBakedText, ocrBlob: Blob) => Promise<UploadImageResponse>;
  setImages: Dispatch<SetStateAction<LocalImageWithBakedText[]>>;
  updateBakedText: (imageId: string, patch: Partial<BakedTextProtectionDraft>) => void;
}) {
  const { fastRenderMode, t, uploadOcrBlob, setImages, updateBakedText } = params;
  const scanQueueRef = useRef(new OcrConcurrencyQueue(OCR_MAX_CONCURRENT_SCANS));
  const inFlightOcrByHashRef = useRef<Map<string, Promise<ScanResultPayload>>>(new Map());
  const abortByImageRef = useRef<Map<string, boolean>>(new Map());
  const watchdogByImageRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const runningScanIdsRef = useRef<Set<string>>(new Set());
  const terminalFailureIdsRef = useRef<Set<string>>(new Set());
  const lazyScanQueueRef = useRef<string[]>([]);
  const scanBakedTextFnRef = useRef<
    (imageId: string, options?: { force?: boolean; silent?: boolean }) => void
  >(() => {});

  const clearWatchdog = useCallback((imageId: string) => {
    const timer = watchdogByImageRef.current.get(imageId);
    if (timer) {
      clearTimeout(timer);
      watchdogByImageRef.current.delete(imageId);
    }
  }, []);

  const cancelOcrScanForImage = useCallback(
    (imageId: string) => {
      abortByImageRef.current.set(imageId, true);
      clearWatchdog(imageId);
      runningScanIdsRef.current.delete(imageId);
      terminalFailureIdsRef.current.delete(imageId);
      lazyScanQueueRef.current = lazyScanQueueRef.current.filter((id) => id !== imageId);
      logOcrAutoScan("cancelled", { imageId });
    },
    [clearWatchdog]
  );

  const patchScan = useCallback(
    (imageId: string, patch: Partial<BakedTextProtectionDraft>) => {
      updateBakedText(imageId, patch);
    },
    [updateBakedText]
  );

  const applyOcrResult = useCallback(
    (
      imageId: string,
      blocks: BakedTextBlockRecord[],
      autoConfirmed: boolean,
      meta: {
        provider?: string;
        durationMs?: number;
        scanRequestId: string;
        finishedAt: string;
      }
    ) => {
      clearWatchdog(imageId);
      const meaningful = shouldPromptBakedTextReview(blocks);

      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== imageId) {
            return img;
          }
          const avgConf =
            blocks.length > 0
              ? blocks.filter((b) => b.kept !== false).reduce((s, b) => s + b.confidence, 0) /
                Math.max(1, blocks.filter((b) => b.kept !== false).length)
              : 0;
          const baseMeta = {
            scanBusy: false,
            autoScanState: "done" as const,
            autoScanComplete: true,
            scanFinishedAt: meta.finishedAt,
            scanDurationMs: meta.durationMs,
            scanProvider: meta.provider,
            scanBlockCount: blocks.length,
            scanAverageConfidence: avgConf,
            scanRequestId: meta.scanRequestId,
          };

          if (!meaningful) {
            return {
              ...img,
              bakedText: {
                ...img.bakedText,
                ...baseMeta,
                enabled: false,
                status: "skipped",
                scanPhase: "no_text_found",
                blocks: [],
                needsReview: false,
                reviewOpen: false,
                autoProtected: false,
                userSkipped: false,
              },
            };
          }

          if (autoConfirmed) {
            return {
              ...img,
              bakedText: {
                ...img.bakedText,
                ...baseMeta,
                enabled: true,
                status: "confirmed",
                scanPhase: "auto_protected",
                blocks,
                needsReview: false,
                reviewOpen: false,
                autoProtected: true,
                userSkipped: false,
              },
            };
          }

          return {
            ...img,
            bakedText: {
              ...img.bakedText,
              ...baseMeta,
              enabled: true,
              status: "detected",
              scanPhase: "needs_review",
              blocks,
              needsReview: true,
              reviewOpen: true,
              autoProtected: false,
              userSkipped: false,
            },
          };
        })
      );

      logOcrAutoScan("state-update", {
        imageId,
        scanRequestId: meta.scanRequestId,
        blockCount: blocks.length,
        autoConfirmed,
      });
    },
    [clearWatchdog, setImages]
  );

  const applyScanFailure = useCallback(
    (
      imageId: string,
      code: "timeout" | "failed" | "interrupted",
      scanRequestId: string,
      startedAt: string,
      detail?: { errorCode?: string; userMessage?: string; timeoutPhase?: string }
    ) => {
      clearWatchdog(imageId);
      if (code === "failed" || code === "timeout") {
        terminalFailureIdsRef.current.add(imageId);
      }
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(startedAt).getTime();
      logOcrPerf("scan-failure", {
        imageId,
        code,
        durationMs,
        timeoutPhase: detail?.timeoutPhase,
        errorCode: detail?.errorCode,
      });
      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== imageId) {
            return img;
          }
          if (
            !isActiveOcrScanPhase(img.bakedText.scanPhase) &&
            img.bakedText.scanPhase !== "received_result"
          ) {
            return img;
          }
          return {
            ...img,
            bakedText: {
              ...img.bakedText,
              enabled: false,
              status: "skipped",
              scanPhase: code,
              scanBusy: false,
              autoScanState: "done",
              autoScanComplete: true,
              needsReview: false,
              reviewOpen: false,
              scanFinishedAt: finishedAt,
              scanDurationMs: durationMs,
              scanErrorCode: detail?.errorCode ?? code,
              scanStatusMessage: detail?.userMessage,
              scanRequestId,
              blocks: [],
            },
          };
        })
      );
    },
    [clearWatchdog, setImages]
  );

  const skipTextProtection = useCallback(
    (imageId: string) => {
      abortByImageRef.current.set(imageId, true);
      clearWatchdog(imageId);
      patchScan(imageId, {
        enabled: false,
        status: "skipped",
        scanPhase: "skipped",
        userSkipped: true,
        scanBusy: false,
        autoScanState: "done",
        autoScanComplete: true,
        needsReview: false,
        reviewOpen: false,
        blocks: [],
      });
    },
    [clearWatchdog, patchScan]
  );

  const runScan = useCallback(
    async (imageId: string, options?: { force?: boolean; silent?: boolean }) => {
      const force = options?.force ?? false;
      const pipelineStart = performance.now();
      abortByImageRef.current.set(imageId, false);
      const scanRequestId = createScanRequestId();
      const startedAt = new Date().toISOString();

      patchScan(imageId, {
        scanBusy: true,
        autoScanState: "scanning",
        scanPhase: "queued",
        scanRequestId,
        scanStartedAt: startedAt,
        scanErrorCode: undefined,
        scanStatusMessage: undefined,
        autoScanComplete: false,
      });

      const watchdog = setTimeout(() => {
        applyScanFailure(imageId, "timeout", scanRequestId, startedAt, {
          errorCode: "OPENAI_TIMEOUT",
          timeoutPhase: "watchdog",
        });
      }, OCR_WATCHDOG_TIMEOUT_MS + 250);
      watchdogByImageRef.current.set(imageId, watchdog);

      let contentHash: string | undefined;
      try {
        const snapshot = await new Promise<LocalImageWithBakedText | undefined>((resolve) => {
          setImages((prev) => {
            resolve(prev.find((i) => i.id === imageId));
            return prev;
          });
        });

        if (!snapshot) {
          applyScanFailure(imageId, "failed", scanRequestId, startedAt);
          return;
        }

        const executeScan = async (): Promise<ScanResultPayload> => {
          let hash = snapshot.bakedText.contentHash;
          if (!hash) {
            hash = await hashImageBlob(snapshot.optimizedBlob);
            patchScan(imageId, { contentHash: hash });
          }
          contentHash = hash;

          if (!force) {
            const cached = getCachedBakedTextOcr(hash);
            if (cached) {
              logOcrPerf("cache-hit", { imageId, hash: hash.slice(0, 12) });
              logOcrAutoScan("fetch-response", { imageId, scanRequestId, cached: true });
              return {
                blocks: cached.blocks,
                autoConfirmed: cached.autoConfirmed,
                provider: cached.provider,
                scanRequestId,
              };
            }
          }

          const shared = !force ? inFlightOcrByHashRef.current.get(hash) : undefined;
          if (shared) {
            patchScan(imageId, { scanPhase: "calling_ocr" });
            return withTimeout(shared, OCR_OPENAI_TIMEOUT_MS, "ocr_shared_wait");
          }

          patchScan(imageId, { scanPhase: "optimizing" });
          const prep = await prepareOcrBlob(snapshot.optimizedBlob);
          logOcrPerf("resize", {
            imageId,
            sourceBytes: prep.sourceBytes,
            outputBytes: prep.outputBytes,
            width: prep.width,
            height: prep.height,
            resizeMs: prep.durationMs,
          });

          if (!force) {
            const heuristic = await estimateLikelyHasTextFromBlob(prep.blob);
            logOcrPerf("heuristic", {
              imageId,
              likelyHasText: heuristic.likelyHasText,
              score: Number(heuristic.score.toFixed(3)),
            });
            if (!heuristic.likelyHasText) {
              setCachedBakedTextOcrNoText(hash);
              return {
                blocks: [],
                autoConfirmed: false,
                provider: "heuristic_skip",
                scanRequestId,
              };
            }
          }

          const fetchBlocks = async (): Promise<ScanResultPayload> => {
            let imageUrl =
              snapshot.bakedText.remoteWorkingUrl ?? snapshot.remoteWorkingUrl ?? undefined;

            if (!imageUrl) {
              patchScan(imageId, { scanPhase: "uploading" });
              const uploadStart = performance.now();
              const up = await withTimeout(
                uploadOcrBlob(snapshot, prep.blob),
                OCR_UPLOAD_TIMEOUT_MS,
                "ocr_upload"
              );
              const uploadMs = Math.round(performance.now() - uploadStart);
              logOcrPerf("upload", { imageId, uploadMs, bytes: prep.outputBytes });
              imageUrl = up.workingImageUrl;
              patchScan(imageId, { remoteWorkingUrl: imageUrl });
            }

            patchScan(imageId, { scanPhase: "calling_ocr" });
            const openAiStart = performance.now();

            let lastApiError: {
              errorCode?: string;
              userMessage?: string;
              status: number;
            } | null = null;

            for (let attempt = 0; attempt <= OCR_AUTO_RETRY_MAX; attempt += 1) {
              if (attempt > 0) {
                await sleep(OCR_AUTO_RETRY_DELAY_MS);
              }

              const res = await fetchJsonWithTimeout(
                `/api/instant-premium/images/${encodeURIComponent(imageId)}/detect-text`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ imageUrl, scanRequestId, mode: "fast" }),
                },
                OCR_SCAN_CLIENT_FETCH_TIMEOUT_MS
              );
              const data = (await res.json().catch(() => ({}))) as DetectTextApiResponse;

              if (
                res.status === 504 ||
                data.errorCode === "OCR_TIMEOUT" ||
                data.errorCode === "OPENAI_TIMEOUT" ||
                data.status === "timeout"
              ) {
                const timeoutErr = {
                  errorCode: data.errorCode ?? "OPENAI_TIMEOUT",
                  userMessage: data.userMessage,
                  status: res.status,
                };
                if (
                  attempt < OCR_AUTO_RETRY_MAX &&
                  isRetryableOcrErrorCode(timeoutErr.errorCode)
                ) {
                  lastApiError = timeoutErr;
                  continue;
                }
                const err = new Error("ocr_fetch_timeout");
                (err as Error & { ocrDetail?: typeof timeoutErr }).ocrDetail = timeoutErr;
                throw err;
              }

              if (!res.ok) {
                lastApiError = {
                  errorCode: data.errorCode,
                  userMessage: data.userMessage ?? data.error,
                  status: res.status,
                };
                if (
                  res.status === 503 &&
                  attempt < OCR_AUTO_RETRY_MAX &&
                  isRetryableOcrErrorCode(data.errorCode)
                ) {
                  continue;
                }
                const err = new Error(data.error ?? t("instant.bakedText.scanFailed"));
                (err as Error & { ocrDetail?: typeof lastApiError }).ocrDetail = lastApiError;
                throw err;
              }

              const openAiMs = Math.round(performance.now() - openAiStart);
              logOcrPerf("openai-client", {
                imageId,
                openAiMs,
                blockCount: data.blockCount,
                totalMs: Math.round(performance.now() - pipelineStart),
              });

              patchScan(imageId, { scanPhase: "detecting_blocks" });

              return {
                blocks: data.blocks ?? [],
                autoConfirmed: data.autoConfirmed === true,
                provider: data.provider,
                blockCount: data.blockCount,
                averageConfidence: data.averageConfidence,
                durationMs: data.durationMs,
                scanRequestId: data.scanRequestId ?? scanRequestId,
              };
            }

            const err = new Error(lastApiError?.userMessage ?? t("instant.bakedText.scanFailed"));
            (err as Error & { ocrDetail?: typeof lastApiError }).ocrDetail = lastApiError ?? undefined;
            throw err;
          };

          const promise = fetchBlocks();
          inFlightOcrByHashRef.current.set(hash, promise);
          try {
            return await promise;
          } finally {
            inFlightOcrByHashRef.current.delete(hash);
          }
        };

        const ocrResult = await executeScan();

        if (abortByImageRef.current.get(imageId)) {
          return;
        }

        if (contentHash) {
          if (ocrResult.blocks.length === 0 && ocrResult.provider === "heuristic_skip") {
            setCachedBakedTextOcrNoText(contentHash);
          } else {
            setCachedBakedTextOcr(
              contentHash,
              ocrResult.blocks,
              ocrResult.autoConfirmed,
              ocrResult.provider
            );
          }
        }

        patchScan(imageId, { scanPhase: "received_result" });

        applyOcrResult(imageId, ocrResult.blocks, ocrResult.autoConfirmed, {
          provider: ocrResult.provider,
          durationMs: ocrResult.durationMs ?? Math.round(performance.now() - pipelineStart),
          scanRequestId: ocrResult.scanRequestId,
          finishedAt: new Date().toISOString(),
        });

        logOcrPerf("scan-complete", {
          imageId,
          totalMs: Math.round(performance.now() - pipelineStart),
          blockCount: ocrResult.blocks.length,
        });
      } catch (error) {
        if (abortByImageRef.current.get(imageId)) {
          return;
        }
        const ocrDetail = (error as Error & {
          ocrDetail?: { errorCode?: string; userMessage?: string };
        }).ocrDetail;
        const uploadDetail = (error as Error & {
          uploadDetail?: { code?: string; requestId?: string };
        }).uploadDetail;
        const label = error instanceof Error ? error.message : "";
        if (uploadDetail || label.includes("ocr_upload")) {
          patchScan(imageId, { remoteWorkingUrl: undefined });
          applyScanFailure(imageId, "failed", scanRequestId, startedAt, {
            errorCode: uploadDetail?.code ?? "IMAGE_UPLOAD_FAILED",
            userMessage:
              error instanceof Error && error.message
                ? error.message
                : IMAGE_UPLOAD_USER_MESSAGE_NL,
          });
        } else if (isTimeoutError(error) || label === "ocr_fetch_timeout") {
          applyScanFailure(imageId, "timeout", scanRequestId, startedAt, {
            errorCode: ocrDetail?.errorCode ?? "OPENAI_TIMEOUT",
            userMessage: ocrDetail?.userMessage,
            timeoutPhase: label.includes("upload") ? "upload" : "openai",
          });
        } else {
          applyScanFailure(imageId, "failed", scanRequestId, startedAt, {
            errorCode: ocrDetail?.errorCode,
            userMessage: ocrDetail?.userMessage,
          });
        }
      } finally {
        if (contentHash) {
          inFlightOcrByHashRef.current.delete(contentHash);
        }
      }
    },
    [applyOcrResult, applyScanFailure, patchScan, setImages, t, uploadOcrBlob]
  );

  const scanBakedText = useCallback(
    async (imageId: string, options?: { force?: boolean; silent?: boolean }) => {
      if (fastRenderMode) {
        return;
      }
      if (options?.force) {
        runningScanIdsRef.current.delete(imageId);
        terminalFailureIdsRef.current.delete(imageId);
        lazyScanQueueRef.current = lazyScanQueueRef.current.filter((id) => id !== imageId);
      } else if (
        runningScanIdsRef.current.has(imageId) ||
        terminalFailureIdsRef.current.has(imageId)
      ) {
        return;
      }
      runningScanIdsRef.current.add(imageId);
      try {
        await scanQueueRef.current.run(() => runScan(imageId, options));
      } finally {
        runningScanIdsRef.current.delete(imageId);
        const nextId = lazyScanQueueRef.current.shift();
        if (nextId) {
          scanBakedTextFnRef.current(nextId, { silent: true });
        }
      }
    },
    [fastRenderMode, runScan]
  );

  useEffect(() => {
    scanBakedTextFnRef.current = (imageId, options) => {
      void scanBakedText(imageId, options);
    };
  }, [scanBakedText]);

  const scheduleAutoScans = useCallback(
    (imageIds: string[]) => {
      if (fastRenderMode || imageIds.length === 0) {
        return;
      }
      const unique = [...new Set(imageIds)];
      const immediate = unique.slice(0, OCR_IMMEDIATE_AUTO_SCAN_COUNT);
      const lazy = unique.slice(OCR_IMMEDIATE_AUTO_SCAN_COUNT);
      lazyScanQueueRef.current.push(
        ...lazy.filter((id) => !lazyScanQueueRef.current.includes(id))
      );
      for (const id of immediate) {
        void scanBakedText(id, { silent: true });
      }
    },
    [fastRenderMode, scanBakedText]
  );

  const waitForPendingScans = useCallback(
    async (getImages: () => LocalImageWithBakedText[]) => {
      const deadline = Date.now() + CHECKOUT_PENDING_SCAN_WAIT_MS;
      while (Date.now() < deadline) {
        const pending = getImages().some((img) =>
          isActiveOcrScanPhase(img.bakedText.scanPhase)
        );
        if (!pending && lazyScanQueueRef.current.length === 0) {
          return true;
        }
        await sleep(250);
      }
      return (
        !getImages().some((img) => isActiveOcrScanPhase(img.bakedText.scanPhase)) &&
        lazyScanQueueRef.current.length === 0
      );
    },
    []
  );

  return {
    scanBakedText,
    scheduleAutoScans,
    skipTextProtection,
    waitForPendingScans,
    cancelOcrScanForImage,
  };
}
