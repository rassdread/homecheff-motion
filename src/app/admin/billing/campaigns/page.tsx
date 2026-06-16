"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StudioBillingPolicySnapshot } from "@/types/studio-billing";

export default function AdminBillingCampaignsPage() {
  const [policy, setPolicy] = useState<StudioBillingPolicySnapshot | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/billing/campaigns", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { policy: StudioBillingPolicySnapshot };
      setPolicy(data.policy);
    });
  }, []);

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    await fetch("/api/admin/billing/campaigns", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carryMode: policy.carryMode,
        newUserGrantCredits: policy.newUserGrantCredits,
        newUserPromotionCredits: policy.newUserPromotionCredits,
        betaLaunchCredits: policy.betaLaunchCredits,
        newUserCampaignMaxUsers: policy.newUserCampaignMaxUsers,
      }),
    });
    setSaving(false);
  };

  if (!policy) {
    return (
      <AdminBillingShell title="New user campaigns">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="New user campaigns">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <p className="text-sm text-zinc-600">
          Configure launch campaigns without code deploy. Example: 50 credits for the first 500 users.
        </p>
        <p className="text-sm">
          Campaign progress: {policy.newUserCampaignRedeemed} /{" "}
          {policy.newUserCampaignMaxUsers || "∞"} users
        </p>
        {(
          [
            ["newUserGrantCredits", "New user credits"],
            ["newUserPromotionCredits", "Promotion credits"],
            ["betaLaunchCredits", "Beta launch credits"],
            ["newUserCampaignMaxUsers", "Max users (0 = unlimited)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs text-zinc-600">
            {label}
            <input
              type="number"
              className="mt-1 w-full max-w-xs rounded border px-2 py-1 text-sm"
              value={policy[key]}
              onChange={(e) =>
                setPolicy((p) => (p ? { ...p, [key]: Number(e.target.value) } : p))
              }
            />
          </label>
        ))}
        <label className="block text-xs text-zinc-600">
          Carry mode
          <select
            className="mt-1 block rounded border px-2 py-1 text-sm"
            value={policy.carryMode}
            onChange={(e) =>
              setPolicy((p) =>
                p ? { ...p, carryMode: e.target.value as StudioBillingPolicySnapshot["carryMode"] } : p
              )
            }
          >
            <option value="UNLIMITED">Unlimited</option>
            <option value="TWELVE_MONTHS">12 months</option>
            <option value="SIX_MONTHS">6 months</option>
            <option value="THREE_MONTHS">3 months</option>
            <option value="NONE">No carry</option>
          </select>
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          {saving ? "Saving…" : "Save campaign policy"}
        </button>
      </section>
    </AdminBillingShell>
  );
}
