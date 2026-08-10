"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  linked: boolean;
  ssoEnabled: boolean;
};

/**
 * Dual-proof HomeCheff claim entry — requires an active Studio session.
 * Starts SSO with intent=claim; centralUserId comes only from HC claims.
 */
export function LinkHomeCheffIdentityCard({ linked, ssoEnabled }: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);

  function startClaim() {
    if (!ssoEnabled || linked || busy) return;
    const ok = window.confirm(t("account.identity.claimConfirm"));
    if (!ok) return;
    setBusy(true);
    const returnTo = encodeURIComponent("/account/settings");
    window.location.assign(`/auth/sso/start?intent=claim&returnTo=${returnTo}`);
  }

  return (
    <div className={`${studioVisual.cardOnDark} p-5`}>
      <h2 className="text-lg font-semibold text-white">{t("account.identity.title")}</h2>
      <p className="mt-1 text-sm text-white/60">{t("account.identity.intro")}</p>

      {linked ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {t("account.identity.linked")}
        </p>
      ) : ssoEnabled ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/70">{t("account.identity.unlinkedHint")}</p>
          <button
            type="button"
            onClick={startClaim}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? t("account.identity.linking") : t("account.identity.linkCta")}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/50">{t("account.identity.ssoUnavailable")}</p>
      )}
    </div>
  );
}
