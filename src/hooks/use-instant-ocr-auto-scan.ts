"use client";

import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { hashImageBlob, shouldPromptBakedTextReview } from "@/lib/baked-text-auto-scan";
import {
  getCachedBakedTextOcr,
  setCachedBakedTextOcr,
} from "@/lib/baked-text-ocr-client-cache";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import {
  CHECKOUT_PENDING_SCAN_WAIT_MS,
  createScanRequestId,
  type DetectTextApiResponse,
  isActiveOcrScanPhase,
  logOcrAutoScan,
  OCR_SCAN_TIMEOUT_MS,
  withTimeout,
} from "@/lib/instant-ocr-scan";
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
  uploadToBlob: (img: LocalImageWithBakedText) => Promise<UploadImageResponse>;
  setImages: Dispatch<SetStateAction<LocalImageWithBakedText[]>>;
  updateBakedText: (imageId: string, patch: Partial<BakedTextProtectionDraft>) => void;
}) {
  const { fastRenderMode, t, uploadToBlob, setImages, updateBakedText } = params;
  const inFlightOcrByHashRef = useRef<Map<string, Promise<ScanResultPayload>>>(new Map());
  const abortByImageRef = useRef<Map<string, boolean>>(new Map());

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
      const meaningful = shouldPromptBakedTextReview(blocks);
      const avgConf =
        blocks.length > 0
          ? blocks.filter((b) => b.kept !== false).reduce((s, b) => s + b.confidence, 0) /
            Math.max(1, blocks.filter((b) => b.kept !== false).length)
          : 0;

      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== imageId) {
            return img;
          }
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

      logOcrAutoScan("response", {
        imageId,
        scanRequestId: meta.scanRequestId,
        blockCount: blocks.length,
        autoConfirmed,
        phase: autoConfirmed ? "auto_protected" : meaningful ? "needs_review" : "no_text_found",
      });
    },
    [setImages]
  );

  const applyScanFailure = useCallback(
    (
      imageId: string,
      code: "timeout" | "failed" | "interrupted",
      scanRequestId: string,
      startedAt: string
    ) => {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(startedAt).getTime();
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                bakedText: {
                  ...img.bakedText,
                  enabled: code === "timeout" ? img.bakedText.enabled : false,
                  status: code === "timeout" ? "detected" : "skipped",
                  scanPhase: code,
                  scanBusy: false,
                  autoScanState: "done",
                  autoScanComplete: true,
                  needsReview: code === "timeout",
                  reviewOpen: code === "timeout",
                  scanFinishedAt: finishedAt,
                  scanDurationMs: durationMs,
                  scanErrorCode: code,
                  scanRequestId,
                },
              }
            : img
        )
      );
      logOcrAutoScan(code, { imageId, scanRequestId, durationMs });
    },
    [setImages]
  );

  const skipTextProtection = useCallback(
    (imageId: string) => {
      abortByImageRef.current.set(imageId, true);
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
    [patchScan]
  );

  const scanBakedText = useCallback(
    async (imageId: string, options?: { force?: boolean; silent?: boolean }) => {
      if (fastRenderMode) {
        return;
      }

      const force = options?.force ?? false;
      abortByImageRef.current.set(imageId, false);
      const scanRequestId = createScanRequestId();
      const startedAt = new Date().toISOString();

      let snapshot: LocalImageWithBakedText | undefined;
      setImages((prev) => {
        snapshot = prev.find((i) => i.id === imageId);
        if (!snapshot) {
          return prev;
        }
        return prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                bakedText: {
                  ...img.bakedText,
                  scanBusy: true,
                  autoScanState: "scanning",
                  scanPhase: "queued",
                  scanRequestId,
                  scanStartedAt: startedAt,
                  scanErrorCode: undefined,
                },
              }
            : img
        );
      });

      if (!snapshot) {
        return;
      }

      logOcrAutoScan("queued", { imageId, scanRequestId });

      let contentHash = snapshot.bakedText.contentHash;
      try {
        if (!contentHash) {
          patchScan(imageId, { scanPhase: "uploading" });
          logOcrAutoScan("upload-ready", { imageId, scanRequestId });
          contentHash = await hashImageBlob(snapshot.optimizedBlob);
          patchScan(imageId, { contentHash });
        }

        if (!force) {
          const cached = getCachedBakedTextOcr(contentHash);
          if (cached) {
            applyOcrResult(imageId, cached.blocks, cached.autoConfirmed, {
              provider: cached.provider,
              durationMs: 0,
              scanRequestId,
              finishedAt: new Date().toISOString(),
            });
            return;
          }
          const inFlight = inFlightOcrByHashRef.current.get(contentHash);
          if (inFlight) {
            const result = await inFlight;
            if (abortByImageRef.current.get(imageId)) {
              return;
            }
            applyOcrResult(imageId, result.blocks, result.autoConfirmed, {
              provider: result.provider,
              durationMs: result.durationMs,
              scanRequestId: result.scanRequestId,
              finishedAt: new Date().toISOString(),
            });
            return;
          }
        }

        patchScan(imageId, { scanPhase: "calling_ocr" });
        logOcrAutoScan("request-start", { imageId, scanRequestId });

        const imgForUpload = snapshot;
        const fetchBlocks = async (): Promise<ScanResultPayload> => {
          let imageUrl = imgForUpload.bakedText.remoteWorkingUrl;
          if (!imageUrl) {
            patchScan(imageId, { scanPhase: "uploading" });
            const up = await uploadToBlob(imgForUpload);
            imageUrl = up.workingImageUrl;
            patchScan(imageId, { remoteWorkingUrl: imageUrl });
            logOcrAutoScan("upload-ready", { imageId, scanRequestId, imageUrl: true });
          }

          const res = await fetch(
            `/api/instant-premium/images/${encodeURIComponent(imageId)}/detect-text`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ imageUrl, scanRequestId }),
            }
          );
          const data = (await res.json().catch(() => ({}))) as DetectTextApiResponse;
          if (!res.ok) {
            throw new Error(data.error ?? t("instant.bakedText.scanFailed"));
          }
          return {
            blocks: data.blocks ?? [],
            autoConfirmed: data.autoConfirmed === true,
            provider: data.provider,
            blockCount: data.blockCount,
            averageConfidence: data.averageConfidence,
            durationMs: data.durationMs,
            scanRequestId: data.scanRequestId ?? scanRequestId,
          };
        };

        const ocrPromise = withTimeout(fetchBlocks(), OCR_SCAN_TIMEOUT_MS, "ocr");
        inFlightOcrByHashRef.current.set(contentHash, ocrPromise);
        const ocrResult = await ocrPromise;

        if (abortByImageRef.current.get(imageId)) {
          return;
        }

        setCachedBakedTextOcr(contentHash, ocrResult.blocks, ocrResult.autoConfirmed, ocrResult.provider);
        applyOcrResult(imageId, ocrResult.blocks, ocrResult.autoConfirmed, {
          provider: ocrResult.provider,
          durationMs: ocrResult.durationMs,
          scanRequestId: ocrResult.scanRequestId,
          finishedAt: new Date().toISOString(),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "scan_failed";
        if (message.includes("timeout")) {
          applyScanFailure(imageId, "timeout", scanRequestId, startedAt);
        } else {
          applyScanFailure(imageId, "failed", scanRequestId, startedAt);
        }
      } finally {
        if (contentHash) {
          inFlightOcrByHashRef.current.delete(contentHash);
        }
      }
    },
    [applyOcrResult, applyScanFailure, fastRenderMode, patchScan, t, uploadToBlob, setImages]
  );

  const waitForPendingScans = useCallback(
    async (getImages: () => LocalImageWithBakedText[]) => {
      const deadline = Date.now() + CHECKOUT_PENDING_SCAN_WAIT_MS;
      while (Date.now() < deadline) {
        const pending = getImages().some((img) =>
          isActiveOcrScanPhase(img.bakedText.scanPhase)
        );
        if (!pending) {
          return true;
        }
        await sleep(250);
      }
      return !getImages().some((img) => isActiveOcrScanPhase(img.bakedText.scanPhase));
    },
    []
  );

  return {
    scanBakedText,
    skipTextProtection,
    waitForPendingScans,
  };
}
