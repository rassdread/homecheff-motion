"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { BrandAssetProtectionResult } from "@/types/brand-asset-protection";

type Props = {
  protection?: BrandAssetProtectionResult | null;
  compact?: boolean;
  showDebug?: boolean;
};

export function EditorBrandProtectionBanner({
  protection,
  compact = false,
  showDebug = false,
}: Props) {
  const t = useActiveTranslator();

  if (!protection?.active) {
    return null;
  }

  const hasPostComposite = protection.postCompositeAssets.length > 0;
  const hasPerspectiveWarp = protection.assets.some(
    (asset) => asset.placementMode === "perspective_warp"
  );
  const hasProtectedLogo = protection.assets.some(
    (a) => a.assetType === "logo" || a.assetType === "text_logo"
  );

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50/90 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      data-testid="brand-protection-banner"
      data-brand-protection-active="true"
      data-preserve-logo-exact={protection.preserveLogoExact ? "true" : "false"}
      data-post-composite={hasPostComposite ? "true" : "false"}
      data-perspective-warp={hasPerspectiveWarp ? "true" : "false"}
    >
      <p className="text-sm font-semibold text-emerald-900">
        {t("editor.brandProtection.active" as never)}
      </p>
      {hasProtectedLogo ?
        <p className="mt-1 text-xs text-emerald-800">
          {t("editor.brandProtection.logoProtected" as never)}
        </p>
      : null}
      {hasPostComposite ?
        <p className="mt-1 text-xs text-emerald-800">
          {t("editor.brandProtection.postComposite" as never)}
        </p>
      : null}
      {hasPerspectiveWarp ?
        <p className="mt-1 text-xs text-emerald-800">
          {t("editor.brandProtection.perspectiveWarp" as never)}
        </p>
      : null}
      {hasPostComposite ?
        <p className="mt-1 text-xs text-emerald-700">
          {t("editor.brandProtection.originalLogoKept" as never)}
        </p>
      : null}
      {showDebug ?
        <ul className="mt-2 space-y-0.5 text-[11px] text-emerald-700" data-testid="brand-protection-debug">
          {protection.assets.map((asset) => (
            <li key={asset.id}>
              {asset.label ?? asset.id} — {asset.preserveMode}
            </li>
          ))}
        </ul>
      : null}
    </div>
  );
}
