"use client";

import { useCallback, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { PremiumRenderValidationReport } from "@/lib/premium-render-validation";

type Props = {
  isAdmin: boolean;
  buildPayload: () => Record<string, unknown> | null;
};

export function NoCreditRenderCheckPanel({ isAdmin, buildPayload }: Props) {
  const t = useActiveTranslator();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PremiumRenderValidationReport | null>(null);
  const [error, setError] = useState("");

  const runCheck = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) {
      setError(t("instant.noCreditCheck.missingPayload"));
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/instant-premium/validate-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        validation?: PremiumRenderValidationReport;
        blockMessage?: string;
        error?: string;
      };
      if (data.validation) {
        setReport(data.validation);
      } else {
        setError(data.blockMessage ?? data.error ?? t("instant.noCreditCheck.failed"));
      }
    } catch {
      setError(t("instant.noCreditCheck.failed"));
    } finally {
      setLoading(false);
    }
  }, [buildPayload, t]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/70 px-3 py-2">
      <p className="text-xs font-medium text-amber-950">{t("instant.noCreditCheck.title")}</p>
      <p className="mt-1 text-[11px] text-amber-900/90">{t("instant.noCreditCheck.hint")}</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void runCheck()}
        className="mt-2 rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900 disabled:opacity-50"
      >
        {loading ? t("instant.noCreditCheck.running") : t("instant.noCreditCheck.button")}
      </button>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      {report ? (
        <dl className="mt-2 space-y-1 font-mono text-[10px] text-amber-950">
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.viduPrompt")}: </dt>
            <dd className="inline">
              {report.viduPromptChars} / {report.qualityGates.promptMaxChars} ·{" "}
              {t("instant.noCreditCheck.wouldCallVidu")}: {report.wouldCallVidu ? "yes" : "no"}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.style")}: </dt>
            <dd className="inline">{report.animationStyleId}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.textLock")}: </dt>
            <dd className="inline">{report.textLockMode}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.continuity")}: </dt>
            <dd className="inline">{report.continuityMode}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.microActing")}: </dt>
            <dd className="inline">{report.microActingProfile.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.bridge")}: </dt>
            <dd className="inline">{report.segmentBridge}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("instant.noCreditCheck.roles")}: </dt>
            <dd className="inline">
              {report.detectedRoles.length > 0 ? report.detectedRoles.join(", ") : "—"}
            </dd>
          </div>
          {report.images.map((img) => (
            <div key={img.index}>
              <dt className="font-semibold">
                {img.fileName}: {img.lockedRegionCount} {t("instant.noCreditCheck.locked")}
                {img.promptProtectedCount > 0 ?
                  ` · ${img.promptProtectedCount} ${t("instant.noCreditCheck.promptOnly")}`
                : ""}
                {img.textLockWarning || img.headlineNotLocked ? " ⚠" : ""}
              </dt>
              {img.lockedRegions.length > 0 ?
                img.lockedRegions.map((r) => (
                  <dd key={r.id} className="pl-2 text-amber-900/90">
                    lock: {r.textPreview || r.blockType} ({Math.round(r.confidence * 100)}%)
                  </dd>
                ))
              : null}
              {img.promptProtectedPreviews.length > 0 ?
                img.promptProtectedPreviews.map((preview, i) => (
                  <dd key={`p-${img.index}-${i}`} className="pl-2 text-amber-800/80">
                    prompt-only: {preview}
                  </dd>
                ))
              : null}
            </div>
          ))}
          {report.segmentJoins.length > 0 ? (
            <div>
              <dt className="font-semibold">{t("instant.noCreditCheck.joins")}</dt>
              {report.segmentJoins.map((j) => (
                <dd key={`${j.segmentA}-${j.segmentB}`}>
                  {j.segmentA}→{j.segmentB}: sim {(j.similarity * 100).toFixed(2)}% · {j.joinMode} ·{" "}
                  dissolve {(j.mergeDissolveRatio * 100).toFixed(0)}%
                  {typeof j.exposureDelta === "number" ?
                    ` · exp Δ ${(j.exposureDelta * 100).toFixed(1)}%`
                  : ""}
                  {j.applyExposureCorrection ? " · EQ" : ""}
                </dd>
              ))}
            </div>
          ) : null}
          {report.warnings.length > 0 ? (
            <div className="mt-1 text-[10px] text-amber-900">{report.warnings.join(" · ")}</div>
          ) : null}
          {!report.ok && report.blockMessage ? (
            <p className="mt-1 text-xs font-medium text-red-800">{report.blockMessage}</p>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
