"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  studioEmail: string;
  studioDisplayName: string | null;
  homecheffEmail: string;
  homecheffDisplayName: string | null;
  returnTo: string;
};

export function ClaimConfirmClient({
  studioEmail,
  studioDisplayName,
  homecheffEmail,
  homecheffDisplayName,
  returnTo,
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [busy, setBusy] = useState<"link" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finalize(action: "confirm" | "cancel") {
    if (busy) return;
    setBusy(action === "confirm" ? "link" : "cancel");
    setError(null);
    try {
      const res = await fetch("/api/account/claim-central", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        returnTo?: string;
        code?: string;
        cancelled?: boolean;
      };
      if (action === "cancel") {
        router.replace("/account/settings");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.code ?? "CLAIM_UNAUTHORIZED");
        setBusy(null);
        return;
      }
      router.replace(data.returnTo || returnTo || "/account/settings");
    } catch {
      setError("INTERNAL_ERROR");
      setBusy(null);
    }
  }

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold text-emerald-800">HomeCheff Studio</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {t("account.identity.claimTitle")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{t("account.identity.claimBody")}</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {t("account.identity.homecheffAccount")}
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {homecheffDisplayName || homecheffEmail}
              </p>
              {homecheffDisplayName ? (
                <p className="text-sm text-zinc-600">{homecheffEmail}</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {t("account.identity.studioAccount")}
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {studioDisplayName || studioEmail}
              </p>
              {studioDisplayName ? (
                <p className="text-sm text-zinc-600">{studioEmail}</p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-600">{t("account.identity.claimError")}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void finalize("confirm")}
              className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "link" ? t("account.identity.linking") : t("account.identity.linkAccounts")}
            </button>
            <Link
              href={`/auth/sso/start?intent=claim&returnTo=${encodeURIComponent(returnTo || "/account/settings")}`}
              className="rounded-md border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              {t("account.identity.useAnotherHomecheff")}
            </Link>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void finalize("cancel")}
              className="rounded-md px-4 py-2.5 text-sm text-zinc-600 underline disabled:opacity-60"
            >
              {t("account.identity.cancelClaim")}
            </button>
          </div>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
