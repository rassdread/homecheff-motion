"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StudioPromoCodeSnapshot } from "@/types/studio-billing";

export default function AdminBillingPromoCodesPage() {
  const [codes, setCodes] = useState<StudioPromoCodeSnapshot[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/billing/promo-codes", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { codes: StudioPromoCodeSnapshot[] };
    setCodes(data.codes);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/billing/promo-codes", { credentials: "include" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { codes: StudioPromoCodeSnapshot[] };
      if (!cancelled) setCodes(data.codes);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleActive(id: string, active: boolean) {
    setBusyId(id);
    try {
      await fetch("/api/admin/billing/promo-codes", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  if (!codes) {
    return (
      <AdminBillingShell title="Promo codes">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Promo codes">
      <p className="text-sm text-zinc-600">
        Surfaces existing `/api/admin/billing/promo-codes`. Create codes from Promotions; manage status
        here.
      </p>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Campaign</th>
              <th className="px-3 py-2">Benefit</th>
              <th className="px-3 py-2">Uses</th>
              <th className="px-3 py-2">Remaining</th>
              <th className="px-3 py-2">Window</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-mono font-medium">{row.code}</td>
                <td className="px-3 py-2">{row.promotionName}</td>
                <td className="px-3 py-2">{row.benefitType}</td>
                <td className="px-3 py-2">
                  {row.usedCount}
                  {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                </td>
                <td className="px-3 py-2">
                  {row.remainingUses == null ? "∞" : row.remainingUses}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {(row.startDate ?? "—").toString().slice(0, 10)} →{" "}
                  {(row.endDate ?? "—").toString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">{row.active ? "active" : "inactive"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => void toggleActive(row.id, !row.active)}
                  >
                    {row.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  No promo codes yet. Create them from Promotions.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminBillingShell>
  );
}
