"use client";

import { useEffect, useState } from "react";

type Dash = {
  ok: boolean;
  affiliateCentralUserId?: string;
  kpis?: {
    pendingCents: number;
    availableCents: number;
    paidCents: number;
    reversedCents: number;
    totalEarnedCents: number;
  };
  productBreakdownCents?: Record<string, number>;
  attributions?: Array<{
    referredCentralUserId: string;
    attributionStart: string;
    attributionEnd: string;
    sourcePlatform: string;
    remainingMs: number;
  }>;
  recentEvents?: Array<{
    id: string;
    product: string;
    commissionAmountCents: number;
    status: string;
    createdAt: string;
  }>;
  code?: string;
};

function eur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function StudioAffiliateDashboardClient() {
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/me/affiliate/dashboard?source=studio", {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await res.json()) as Dash;
        if (!res.ok) {
          setErr(j.code ?? "Laden mislukt");
          return;
        }
        setData(j);
      } catch {
        setErr("Netwerkfout");
      }
    })();
  }, []);

  if (err) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        {err === "UNAUTHORIZED"
          ? "Log in om je affiliate-dashboard te zien."
          : err}
      </div>
    );
  }
  if (!data?.kpis) {
    return <p className="text-sm text-zinc-500">Laden…</p>;
  }

  const k = data.kpis;
  const studioRef =
    data.affiliateCentralUserId != null
      ? `https://studio.homecheff.eu/?ref=${encodeURIComponent(data.affiliateCentralUserId)}`
      : null;
  return (
    <div className="space-y-6">
      {studioRef ? (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <h2 className="text-sm font-semibold text-emerald-950">Je Studio-referral link</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Deel deze link. Bij signup wordt de referral 12 maanden vastgezet op centralUserId.
          </p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-800">{studioRef}</p>
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Totaal", k.totalEarnedCents],
          ["Pending", k.pendingCents],
          ["Beschikbaar", k.availableCents],
          ["Uitbetaald", k.paidCents],
        ].map(([label, cents]) => (
          <div key={label as string} className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">{label as string}</p>
            <p className="mt-1 text-lg font-semibold">{eur(cents as number)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Productverdeling</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.entries(data.productBreakdownCents ?? {}).map(([p, c]) => (
            <li key={p} className="flex justify-between">
              <span>{p}</span>
              <span className="font-medium">{eur(c)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Actieve 12-maands referrals</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(data.attributions ?? []).length === 0 ? (
            <li className="text-zinc-500">Nog geen actieve referrals.</li>
          ) : (
            (data.attributions ?? []).map((a) => (
              <li key={a.referredCentralUserId} className="border-t border-zinc-100 pt-2">
                <p className="font-mono text-xs">{a.referredCentralUserId.slice(0, 8)}…</p>
                <p className="text-xs text-zinc-600">
                  {a.sourcePlatform} · tot {new Date(a.attributionEnd).toLocaleDateString("nl-NL")} ·{" "}
                  {Math.ceil(a.remainingMs / (86400000))} dagen resterend
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Recente commissie</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(data.recentEvents ?? []).slice(0, 15).map((e) => (
            <li key={e.id} className="flex justify-between border-t border-zinc-100 pt-2">
              <span>
                {e.product} · {e.status}
              </span>
              <span className="font-medium">{eur(e.commissionAmountCents)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
