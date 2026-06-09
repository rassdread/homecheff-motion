"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  identityScoreBadgeClass,
  resolveIdentityScoreBadgeTone,
} from "@/lib/studio-asset-identity-variant-audit";
import type { GeneratedIdentityVariantAudit } from "@/types/studio-asset-identity-variant-audit";

type Props = {
  audit: GeneratedIdentityVariantAudit;
  onRegenerate?: () => void;
  onViewPrompt?: () => void;
  onAcceptAnyway?: () => void;
  showRecoveryActions?: boolean;
  compact?: boolean;
};

function AuditItemRow({
  kind,
  messageKey,
  detail,
}: {
  kind: "preserved" | "lost" | "warning";
  messageKey: string;
  detail?: string;
}) {
  const t = useActiveTranslator();
  const icon = kind === "preserved" ? "✓" : "⚠";
  const color =
    kind === "preserved" ? "text-emerald-800" : kind === "lost" ? "text-amber-800" : "text-amber-900";
  return (
    <li className={`text-sm ${color}`}>
      {icon} {t(messageKey as never)}
      {detail ? <span className="text-zinc-600"> — {detail}</span> : null}
    </li>
  );
}

export function StudioVariantQualityPanel({
  audit,
  onRegenerate,
  onViewPrompt,
  onAcceptAnyway,
  showRecoveryActions = true,
  compact = false,
}: Props) {
  const t = useActiveTranslator();
  const [auditOpen, setAuditOpen] = useState(!compact);
  const tone = resolveIdentityScoreBadgeTone(audit.identityScore, audit.identityProfile);

  return (
    <div className={`rounded-xl border p-4 ${identityScoreBadgeClass(tone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {t("studio.variantQuality.title")}
          </p>
          <p className="mt-1 text-lg font-bold">
            {t("studio.variantQuality.identityScore", { score: String(audit.identityScore) })}
          </p>
        </div>
        <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs font-semibold">
          {t("studio.variantQuality.threshold", { score: String(audit.profileWarningThreshold) })}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {audit.preserved.map((item) => (
          <AuditItemRow key={item.messageKey} kind="preserved" messageKey={item.messageKey} detail={item.detail} />
        ))}
        {audit.warningItems.map((item) => (
          <AuditItemRow key={`${item.messageKey}-${item.detail ?? ""}`} kind="warning" messageKey={item.messageKey} detail={item.detail} />
        ))}
        {audit.lost.map((item) => (
          <AuditItemRow key={`${item.messageKey}-${item.detail ?? ""}`} kind="lost" messageKey={item.messageKey} detail={item.detail} />
        ))}
      </ul>

      {audit.recoveryRequired ?
        <p className="mt-3 text-sm font-medium">{t("studio.variantQuality.recoveryRequired")}</p>
      : null}

      {showRecoveryActions && audit.recoveryRequired ?
        <div className="mt-3 flex flex-wrap gap-2">
          {onRegenerate ?
            <button
              type="button"
              onClick={onRegenerate}
              className="min-h-[44px] rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
            >
              {t("studio.variantQuality.action.regenerate")}
            </button>
          : null}
          {onViewPrompt ?
            <button
              type="button"
              onClick={onViewPrompt}
              className="min-h-[44px] rounded-full border border-current/30 bg-white/60 px-4 py-2 text-sm font-semibold"
            >
              {t("studio.variantQuality.action.viewPrompt")}
            </button>
          : null}
          {onAcceptAnyway ?
            <button
              type="button"
              onClick={onAcceptAnyway}
              className="min-h-[44px] rounded-full border border-current/30 bg-white/60 px-4 py-2 text-sm font-semibold"
            >
              {t("studio.variantQuality.action.acceptAnyway")}
            </button>
          : null}
        </div>
      : null}

      <button
        type="button"
        onClick={() => setAuditOpen((v) => !v)}
        className="mt-4 min-h-[44px] text-sm font-semibold underline opacity-90"
      >
        {auditOpen ? t("studio.variantQuality.auditCollapse") : t("studio.variantQuality.auditExpand")}
      </button>

      {auditOpen ?
        <div className="mt-3 rounded-lg border border-current/15 bg-white/50 p-3">
          <p className="text-sm font-semibold">{t("studio.variantQuality.auditTitle")}</p>
          <p className="mt-1 text-xs opacity-80">
            {t("studio.variantQuality.auditSource", { name: audit.sourceName })}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase opacity-70">{t("studio.variantQuality.preservedHeading")}</p>
              <ul className="mt-1 space-y-0.5">
                {audit.preserved.map((item) => (
                  <li key={`p-${item.messageKey}`} className="text-xs">
                    ✓ {t(item.messageKey as never)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase opacity-70">{t("studio.variantQuality.lostHeading")}</p>
              <ul className="mt-1 space-y-0.5">
                {audit.lost.length === 0 ?
                  <li className="text-xs opacity-70">—</li>
                : audit.lost.map((item) => (
                    <li key={`l-${item.messageKey}-${item.detail ?? ""}`} className="text-xs">
                      ⚠ {t(item.messageKey as never)}
                      {item.detail ? ` (${item.detail})` : ""}
                    </li>
                  ))
                }
              </ul>
            </div>
          </div>
          {audit.recommendations.length > 0 ?
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase opacity-70">{t("studio.variantQuality.recommendationHeading")}</p>
              <ul className="mt-1 space-y-0.5">
                {audit.recommendations.map((key) => (
                  <li key={key} className="text-xs">
                    {t(key as never)}
                  </li>
                ))}
              </ul>
            </div>
          : null}
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="font-medium">{t("studio.variantQuality.score.family")}</dt>
              <dd>{audit.familyScore}%</dd>
            </div>
            <div>
              <dt className="font-medium">{t("studio.variantQuality.score.brand")}</dt>
              <dd>{audit.brandScore}%</dd>
            </div>
            <div>
              <dt className="font-medium">{t("studio.variantQuality.score.shapeMarkers")}</dt>
              <dd>{audit.shapeMarkerScore}%</dd>
            </div>
          </dl>
        </div>
      : null}
    </div>
  );
}

export function StudioIdentityScoreBadge({
  score,
  profileLevel,
}: {
  score: number;
  profileLevel?: string;
}) {
  const t = useActiveTranslator();
  const tone = resolveIdentityScoreBadgeTone(
    score,
    profileLevel as import("@/types/studio-asset-identity-profile").IdentityProfileLevel | undefined
  );
  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${identityScoreBadgeClass(tone)}`}
    >
      {t("studio.variantQuality.badge", { score: String(score) })}
    </span>
  );
}
