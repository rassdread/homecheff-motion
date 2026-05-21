import {
  isImageLikeMediaUrl,
  MIN_FINAL_SEGMENT_DURATION_SEC,
  MIN_FINAL_SEGMENT_FRAME_COUNT,
} from "@/server/instant-premium/final-segment-source";

export type TransitionRow = {
  id: string;
  order: number;
  status: string;
  startImageId: string;
  endImageId: string;
  providerJobId: string | null;
  outputVideoUrl: string | null;
};

export type ProbedSegmentMetrics = {
  durationSec: number | null;
  frameCount: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  sha256: string | null;
  motionScore: number | null;
  likelyFrozen: boolean | null;
  imagePlaceholderUrl: boolean;
  probeError: string | null;
};

export type SegmentIntegrityRow = {
  transitionId: string;
  order: number;
  status: string;
  startImageId: string;
  endImageId: string;
  providerJobId: string | null;
  outputVideoUrl: string | null;
  metrics: ProbedSegmentMetrics;
  duplicateUrl: boolean;
  duplicateHash: boolean;
  issues: string[];
};

export type ChainValidation = {
  ok: boolean;
  breaks: Array<{ atOrder: number; message: string }>;
};

export type SegmentIntegrityReport = {
  projectId: string;
  segments: SegmentIntegrityRow[];
  chain: ChainValidation;
  badOrders: number[];
  verdict: "SEGMENTS_OK" | "SEGMENTS_BAD";
  summary: string;
};

export function validateTransitionImageChain(transitions: TransitionRow[]): ChainValidation {
  const sorted = [...transitions].sort((a, b) => a.order - b.order);
  const breaks: ChainValidation["breaks"] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    if (current.endImageId !== next.startImageId) {
      breaks.push({
        atOrder: next.order,
        message: `Chain break: transition order ${current.order} endImageId (${current.endImageId}) !== order ${next.order} startImageId (${next.startImageId})`,
      });
    }
  }
  return { ok: breaks.length === 0, breaks };
}

export function evaluateSegmentIssues(params: {
  row: TransitionRow;
  metrics: ProbedSegmentMetrics;
  duplicateUrl: boolean;
  duplicateHash: boolean;
  /** Another segment's order when this URL duplicates that segment */
  duplicateUrlWithOrder?: number;
}): string[] {
  const issues: string[] = [];
  const { row, metrics, duplicateUrl, duplicateHash, duplicateUrlWithOrder } = params;
  const url = row.outputVideoUrl?.trim() ?? "";

  if (row.status !== "completed") {
    issues.push(`status_not_completed:${row.status}`);
  }
  if (!url) {
    issues.push("missing_outputVideoUrl");
  }
  if (metrics.imagePlaceholderUrl || (url && isImageLikeMediaUrl(url))) {
    issues.push("image_placeholder_url");
  }
  if (duplicateUrl) {
    issues.push(
      duplicateUrlWithOrder != null
        ? `duplicated_outputVideoUrl_with_order_${duplicateUrlWithOrder}`
        : "duplicated_outputVideoUrl"
    );
  }
  if (duplicateHash) {
    issues.push("duplicated_hash");
  }
  if (metrics.probeError) {
    issues.push(`probe_failed:${metrics.probeError}`);
  }
  if (metrics.durationSec != null && metrics.durationSec < MIN_FINAL_SEGMENT_DURATION_SEC) {
    issues.push(`duration_too_short:${metrics.durationSec.toFixed(3)}s`);
  }
  if (metrics.frameCount != null && metrics.frameCount < MIN_FINAL_SEGMENT_FRAME_COUNT) {
    issues.push(`frame_count_too_low:${metrics.frameCount}`);
  }
  if (metrics.likelyFrozen) {
    issues.push(
      metrics.motionScore != null
        ? `frozen_segment:motionScore=${metrics.motionScore.toFixed(2)}`
        : "frozen_segment"
    );
  }

  return issues;
}

export function buildSegmentIntegrityReport(params: {
  projectId: string;
  segments: SegmentIntegrityRow[];
  chain: ChainValidation;
}): SegmentIntegrityReport {
  const badOrders = new Set<number>();
  for (const seg of params.segments) {
    if (seg.issues.length > 0) {
      badOrders.add(seg.order);
    }
  }
  for (const br of params.chain.breaks) {
    badOrders.add(br.atOrder);
  }

  const sortedBad = [...badOrders].sort((a, b) => a - b);
  const verdict = sortedBad.length === 0 ? "SEGMENTS_OK" : "SEGMENTS_BAD";
  const summary =
    verdict === "SEGMENTS_OK"
      ? "SEGMENTS_OK — rebuild should be able to fix final assembly."
      : `SEGMENTS_BAD — rebuild cannot fix this. Rerender/repair these segments: ${sortedBad.join(", ")}`;

  return {
    projectId: params.projectId,
    segments: params.segments,
    chain: params.chain,
    badOrders: sortedBad,
    verdict,
    summary,
  };
}
