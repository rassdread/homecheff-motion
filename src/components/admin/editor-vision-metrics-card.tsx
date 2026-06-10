"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";

type MetricsResponse = {
  ok: boolean;
  checkedAt: string;
  metrics: {
    detectionCount: number;
    maskCount: number;
    segmentationSuccessRate: number;
    averageSegmentationMs: number;
    openAiEditSuccessRate: number;
    failedObjectEdits: number;
    onnxDetectionCount?: number;
    hybridMergeCount?: number;
  };
  sam2: {
    health: "ONLINE" | "OFFLINE" | "DEGRADED";
    endpointConfigured: boolean;
    averageLatencyMs: number | null;
    recentFailureRate: number | null;
    lastHealthCheckAt: string | null;
  };
};

function healthClass(health: MetricsResponse["sam2"]["health"]): string {
  switch (health) {
    case "ONLINE":
      return "text-emerald-700 bg-emerald-50";
    case "DEGRADED":
      return "text-amber-800 bg-amber-50";
    case "OFFLINE":
      return "text-red-700 bg-red-50";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

export function EditorVisionMetricsCard() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/editor/vision-metrics", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as MetricsResponse;
    setData(body);
    return body;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <AppCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Editor Vision V3</h2>
          <p className="mt-1 text-sm text-zinc-600">Detection, segmentation, and masked edit metrics.</p>
        </div>
        {data?.sam2?.health ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthClass(data.sam2.health)}`}>
            SAM2: {data.sam2.health}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : data?.ok ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">Detections</dt>
            <dd className="font-medium">{data.metrics.detectionCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">ONNX detections</dt>
            <dd className="font-medium">{data.metrics.onnxDetectionCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Masks created</dt>
            <dd className="font-medium">{data.metrics.maskCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Segmentation success</dt>
            <dd className="font-medium">
              {(data.metrics.segmentationSuccessRate * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Avg segmentation</dt>
            <dd className="font-medium">{Math.round(data.metrics.averageSegmentationMs)} ms</dd>
          </div>
          <div>
            <dt className="text-zinc-500">OpenAI edit success</dt>
            <dd className="font-medium">
              {(data.metrics.openAiEditSuccessRate * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Failed edits</dt>
            <dd className="font-medium">{data.metrics.failedObjectEdits}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">SAM2 latency</dt>
            <dd className="font-medium">
              {data.sam2.averageLatencyMs != null
                ? `${Math.round(data.sam2.averageLatencyMs)} ms`
                : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Metrics unavailable.</p>
      )}

      {data?.checkedAt ? (
        <p className="mt-4 text-xs text-zinc-400">
          Checked <ClientFormattedDateTime iso={data.checkedAt} />
        </p>
      ) : null}
    </AppCard>
  );
}
