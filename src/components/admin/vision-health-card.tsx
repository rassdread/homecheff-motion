"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";

type DetectorBlock = {
  status:
    | "READY"
    | "DISABLED"
    | "PACKAGE_MISSING"
    | "MODEL_MISSING"
    | "RUNTIME_UNSUPPORTED"
    | "LICENSE_BLOCKED";
  enabled: boolean;
  packageInstalled: boolean;
  modelPresent: boolean;
  modelPath: string;
  missingModels?: string[];
  warnings: string[];
  runtimeReady?: boolean;
  detectorKind?: string;
  modelLicense?: string;
  licensePermissive?: boolean;
};

type VisionHealthResponse = {
  ok: boolean;
  checkedAt: string;
  featureFlags: {
    mediaPipe: boolean;
    objectDetector: boolean;
    safeZoneDebug: boolean;
  };
  mediaPipe: DetectorBlock;
  objectDetector: DetectorBlock;
  warnings: string[];
};

function statusClass(status: DetectorBlock["status"]): string {
  switch (status) {
    case "READY":
      return "text-emerald-700 bg-emerald-50";
    case "DISABLED":
      return "text-zinc-600 bg-zinc-100";
    case "RUNTIME_UNSUPPORTED":
    case "PACKAGE_MISSING":
    case "MODEL_MISSING":
    case "LICENSE_BLOCKED":
      return "text-amber-800 bg-amber-50";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

export function VisionHealthCard() {
  const [data, setData] = useState<VisionHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);

  const load = useCallback(async (probe: boolean) => {
    const url = probe
      ? "/api/admin/video/vision-health?probe=1"
      : "/api/admin/video/vision-health";
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as VisionHealthResponse;
    setData(body);
    return body;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load(true);
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

  async function onProbe() {
    setProbing(true);
    try {
      await load(true);
    } finally {
      setProbing(false);
    }
  }

  function renderDetector(name: string, block: DetectorBlock | undefined) {
    if (!block) {
      return null;
    }
    return (
      <div className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-900">{name}</span>
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusClass(block.status)}`}>
            {block.status}
          </span>
        </div>
        <dl className="mt-2 space-y-1 text-xs text-zinc-600">
          <div>
            <dt className="inline font-medium">Flag: </dt>
            <dd className="inline">{block.enabled ? "on" : "off"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Package: </dt>
            <dd className="inline">{block.packageInstalled ? "installed" : "missing"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Model: </dt>
            <dd className="inline">{block.modelPresent ? "present" : "missing"}</dd>
          </div>
          {block.detectorKind ? (
            <div>
              <dt className="inline font-medium">Kind: </dt>
              <dd className="inline">{block.detectorKind}</dd>
            </div>
          ) : null}
          {block.modelLicense ? (
            <div>
              <dt className="inline font-medium">License: </dt>
              <dd className="inline">
                {block.modelLicense}
                {block.licensePermissive === false ? " (blocked)" : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-medium">Runtime: </dt>
            <dd className="inline">
              {block.runtimeReady === undefined
                ? "not probed"
                : block.runtimeReady
                  ? "ready"
                  : "unsupported"}
            </dd>
          </div>
          <div className="break-all">
            <dt className="font-medium">Path</dt>
            <dd>{block.modelPath}</dd>
          </div>
          {block.missingModels && block.missingModels.length > 0 ? (
            <div>
              <dt className="font-medium">Missing files</dt>
              <dd>{block.missingModels.join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  return (
    <AppCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Vision models (Safe Zone V3–V4)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Local MediaPipe + object detector readiness for export-time safe zones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onProbe()}
          disabled={loading || probing}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {probing ? "Checking…" : "Re-check"}
        </button>
      </div>

      {loading && !data ? (
        <p className="mt-4 text-sm text-zinc-500">Loading vision diagnostics…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3">
            {renderDetector("MediaPipe", data?.mediaPipe)}
            {renderDetector("Object detector", data?.objectDetector)}
          </div>

          {data?.featureFlags ? (
            <p className="mt-3 text-xs text-zinc-500">
              Flags — MediaPipe: {data.featureFlags.mediaPipe ? "1" : "0"}, Object detector:{" "}
              {data.featureFlags.objectDetector ? "1" : "0"}, debug:{" "}
              {data.featureFlags.safeZoneDebug ? "1" : "0"}
            </p>
          ) : null}

          {data?.warnings && data.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber-800">
              {data.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {data?.checkedAt ? (
            <p className="mt-3 text-xs text-zinc-400">
              Checked <ClientFormattedDateTime iso={data.checkedAt} />
            </p>
          ) : null}
        </>
      )}
    </AppCard>
  );
}
