"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StudioCreditPackSnapshot } from "@/types/studio-billing";

export default function AdminBillingCreditPacksPage() {
  const [packs, setPacks] = useState<StudioCreditPackSnapshot[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    void fetch("/api/admin/billing/credit-packs", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { packs: StudioCreditPackSnapshot[] };
      setPacks(data.packs);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const savePack = async (pack: StudioCreditPackSnapshot) => {
    setSaving(pack.slug);
    await fetch("/api/admin/billing/credit-packs", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pack),
    });
    setSaving(null);
    load();
  };

  return (
    <AdminBillingShell title="Credit packs">
      <div className="space-y-4">
        {packs.map((pack) => (
          <div key={pack.slug} className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold">{pack.name}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-zinc-600">
                Credits
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={pack.credits}
                  onChange={(e) =>
                    setPacks((rows) =>
                      rows.map((row) =>
                        row.slug === pack.slug ? { ...row, credits: Number(e.target.value) } : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Price EUR
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={pack.priceEur}
                  onChange={(e) =>
                    setPacks((rows) =>
                      rows.map((row) =>
                        row.slug === pack.slug ? { ...row, priceEur: Number(e.target.value) } : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Bonus credits
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={pack.bonusCredits}
                  onChange={(e) =>
                    setPacks((rows) =>
                      rows.map((row) =>
                        row.slug === pack.slug
                          ? { ...row, bonusCredits: Number(e.target.value) }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Stripe price ID
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={pack.stripePriceId ?? ""}
                  onChange={(e) =>
                    setPacks((rows) =>
                      rows.map((row) =>
                        row.slug === pack.slug
                          ? { ...row, stripePriceId: e.target.value || null }
                          : row
                      )
                    )
                  }
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pack.active}
                onChange={(e) =>
                  setPacks((rows) =>
                    rows.map((row) =>
                      row.slug === pack.slug ? { ...row, active: e.target.checked } : row
                    )
                  )
                }
              />
              Active
            </label>
            <button
              type="button"
              disabled={saving === pack.slug}
              onClick={() => void savePack(pack)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            >
              Save pack
            </button>
          </div>
        ))}
      </div>
    </AdminBillingShell>
  );
}
