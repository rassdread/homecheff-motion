"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";

type StatusLabel = "READY" | "ACTIVE" | "FALLBACK" | "DISABLED";

type OverlayEngineApiResponse = {
  checkedAt: string;
  readinessScore: number;
  card: {
    safeZones: StatusLabel;
    objectDetection: StatusLabel;
    typography: StatusLabel;
    placement: StatusLabel;
    timing: StatusLabel;
    ocr: StatusLabel;
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
        </div>
        {!loading && data ? (
          <p className="shrink-0 text-sm font-semibold text-zinc-900">
            {t("admin.overlayEngine.score", { score: String(data.readinessScore) })}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("admin.overlayEngine.loading")}</p>
      ) : card ? (
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.safeZones")}</dt>
            <dd>
              <StatusBadge label={card.safeZones} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.objectDetection")}</dt>
            <dd>
              <StatusBadge label={card.objectDetection} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.typography")}</dt>
            <dd>
              <StatusBadge label={card.typography} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.placement")}</dt>
            <dd>
              <StatusBadge label={card.placement} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.timing")}</dt>
            <dd>
              <StatusBadge label={card.timing} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-zinc-600">{t("admin.overlayEngine.ocr")}</dt>
            <dd>
              <StatusBadge label={card.ocr} />
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-amber-800">{t("admin.overlayEngine.unavailable")}</p>
      )}

      {data?.checkedAt ? (
        <p className="mt-3 text-xs text-zinc-500">
          {t("admin.overlayEngine.lastChecked")}{" "}
          <ClientFormattedDateTime iso={data.checkedAt} />
        </p>
      ) : null}

      {data?.recommendedNextAction ? (
        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {data.recommendedNextAction}
        </p>
      ) : null}
    </AppCard>
  );
}
