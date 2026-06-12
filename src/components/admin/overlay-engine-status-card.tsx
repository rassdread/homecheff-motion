"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";

type StatusLabel = "READY" | "ACTIVE" | "FALLBACK" | "DISABLED";

type StatusReasonDetail = {
  label: StatusLabel;
  reason: string;
  action?: string;
  launchCritical: boolean;
};

type OverlayEngineApiResponse = {
  checkedAt: string;
  readinessScore: number;
  source?: "video-worker" | "app-process";
  probeWarning?: string;
  card: {
    safeZones: StatusLabel;
    objectDetection: StatusLabel;
    typography: StatusLabel;
    placement: StatusLabel;
    timing: StatusLabel;
    ocr: StatusLabel;
  };
  cardReasons?: Record<keyof OverlayEngineApiResponse["card"], StatusReasonDetail>;
  sam2?: { available: boolean; reason: string; optionalForLaunch: boolean };
  featureImpact?: Array<{
    feature: string;
    service: string;
    worksWithoutVision: boolean;
    improvedByVision: boolean;
    requiresVision: boolean;
    notes: string;
  }>;
  activationChecklist?: {
    local: { envVars: string[]; setupCommands: string[]; healthEndpoints: string[] };
    production: {
      envVars: string[];
      setupCommands: string[];
      workerFlags: string[];
      healthEndpoints: string[];
    };
  };
  recommendedNextAction: string;
};

function statusClass(label: StatusLabel): string {
  switch (label) {
    case "READY":
    case "ACTIVE":
      return "text-emerald-700 bg-emerald-50";
    case "FALLBACK":
      return "text-amber-800 bg-amber-50";
    case "DISABLED":
      return "text-zinc-600 bg-zinc-100";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

function StatusBadge({ label }: { label: StatusLabel }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(label)}`}
    >
      {label}
    </span>
  );
}

const CARD_ROWS: Array<{ key: keyof OverlayEngineApiResponse["card"]; labelKey: string }> = [
  { key: "safeZones", labelKey: "admin.overlayEngine.safeZones" },
  { key: "objectDetection", labelKey: "admin.overlayEngine.objectDetection" },
  { key: "typography", labelKey: "admin.overlayEngine.typography" },
  { key: "placement", labelKey: "admin.overlayEngine.placement" },
  { key: "timing", labelKey: "admin.overlayEngine.timing" },
  { key: "ocr", labelKey: "admin.overlayEngine.ocr" },
];

export function OverlayEngineStatusCard() {
  const t = useActiveTranslator();
  const [data, setData] = useState<OverlayEngineApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/video/overlay-engine-status?probe=1", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as OverlayEngineApiResponse;
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

  const card = data?.card;

  return (
    <AppCard>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.overlayEngine.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("admin.overlayEngine.intro")}</p>
          {data?.source ?
            <p className="mt-1 text-xs text-zinc-500">
              {t("admin.overlayEngine.probeSource" as never, { source: data.source } as never)}
            </p>
          : null}
        </div>
        {!loading && data ?
          <p className="shrink-0 text-sm font-semibold text-zinc-900">
            {t("admin.overlayEngine.score", { score: String(data.readinessScore) })}
          </p>
        : null}
      </div>

      {data?.probeWarning ?
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {data.probeWarning}
        </p>
      : null}

      {loading ?
        <p className="mt-4 text-sm text-zinc-500">{t("admin.overlayEngine.loading")}</p>
      : card ?
        <dl className="mt-4 grid gap-3 text-sm">
          {CARD_ROWS.map(({ key, labelKey }) => {
            const reason = data.cardReasons?.[key];
            return (
              <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-medium text-zinc-700">{t(labelKey as never)}</dt>
                  <dd>
                    <StatusBadge label={card[key]} />
                  </dd>
                </div>
                {reason ?
                  <p className="mt-1 text-xs text-zinc-600">{reason.reason}</p>
                : null}
                {reason?.action ?
                  <p className="mt-0.5 text-xs font-medium text-sky-800">{reason.action}</p>
                : null}
              </div>
            );
          })}
        </dl>
      : (
        <p className="mt-4 text-sm text-amber-800">{t("admin.overlayEngine.unavailable")}</p>
      )}

      {data?.sam2 ?
        <p className="mt-3 rounded-md border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
          SAM2 (Editor): {data.sam2.available ? "configured" : "optional — not configured"}. {data.sam2.reason}
        </p>
      : null}

      {data?.checkedAt ?
        <p className="mt-3 text-xs text-zinc-500">
          {t("admin.overlayEngine.lastChecked")}{" "}
          <ClientFormattedDateTime iso={data.checkedAt} />
        </p>
      : null}

      {data?.recommendedNextAction ?
        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {data.recommendedNextAction}
        </p>
      : null}

      {data?.activationChecklist ?
        <details className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-zinc-800">
            {t("admin.overlayEngine.checklistTitle" as never)}
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-medium text-zinc-700">{t("admin.overlayEngine.checklistLocal" as never)}</p>
              <ul className="mt-1 list-disc pl-4 text-zinc-600">
                {data.activationChecklist.local.envVars.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium text-zinc-700">Setup</p>
              <ul className="mt-1 list-disc pl-4 text-zinc-600">
                {data.activationChecklist.local.setupCommands.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-700">{t("admin.overlayEngine.checklistProduction" as never)}</p>
              <ul className="mt-1 list-disc pl-4 text-zinc-600">
                {data.activationChecklist.production.envVars.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium text-zinc-700">Worker flags</p>
              <ul className="mt-1 list-disc pl-4 text-zinc-600">
                {data.activationChecklist.production.workerFlags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      : null}

      {data?.featureImpact && data.featureImpact.length > 0 ?
        <details className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-zinc-800">
            {t("admin.overlayEngine.featureImpactTitle" as never)}
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-1 pr-2">Feature</th>
                  <th className="py-1 pr-2">Service</th>
                  <th className="py-1 pr-2">No vision</th>
                  <th className="py-1 pr-2">Improved</th>
                  <th className="py-1 pr-2">Required</th>
                </tr>
              </thead>
              <tbody>
                {data.featureImpact.map((row) => (
                  <tr key={`${row.service}-${row.feature}`} className="border-b border-zinc-100">
                    <td className="py-1 pr-2">{row.feature}</td>
                    <td className="py-1 pr-2">{row.service}</td>
                    <td className="py-1 pr-2">{row.worksWithoutVision ? "✓" : "—"}</td>
                    <td className="py-1 pr-2">{row.improvedByVision ? "✓" : "—"}</td>
                    <td className="py-1 pr-2">{row.requiresVision ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      : null}
    </AppCard>
  );
}
