"use client";

import { useEffect, useState } from "react";
import type { AdminUserBillingSnapshot, CreditOriginType } from "@/types/studio-billing";

const GRANT_ORIGINS: CreditOriginType[] = [
  "MANUAL_GRANT",
  "COMPENSATION",
  "BETA",
  "PROMOTIONAL",
  "REFERRAL",
];

export function AdminUserBillingPanel({ userId }: { userId: string }) {
  const [billing, setBilling] = useState<AdminUserBillingSnapshot | null>(null);
  const [credits, setCredits] = useState(100);
  const [reason, setReason] = useState("");
  const [origin, setOrigin] = useState<CreditOriginType>("MANUAL_GRANT");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/admin/billing/users/${userId}`, { credentials: "include" });
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { billing: AdminUserBillingSnapshot };
      setBilling(data.billing);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const grant = async (action: "grant" | "remove") => {
    if (!reason.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/billing/users/${userId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, credits, reason: reason.trim(), creditOrigin: origin }),
    });
    setLoading(false);
    setReason("");
    const res = await fetch(`/api/admin/billing/users/${userId}`, { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as { billing: AdminUserBillingSnapshot };
      setBilling(data.billing);
    }
  };

  if (!billing) {
    return <p className="text-sm text-zinc-500">Loading billing…</p>;
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="font-semibold text-zinc-900">Billing & credits</h3>
      <p className="mt-1 text-xs text-zinc-600">
        Plan: {billing.plan} · Status: {billing.billingStatus} · Spent: {billing.totalSpentCredits}{" "}
        credits
      </p>
      {billing.wallet ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <div>Available: {billing.wallet.availableBalance}</div>
          <div>Purchased: {billing.wallet.purchasedBalance}</div>
          <div>Promotional: {billing.wallet.promotionalBalance}</div>
          <div>Reserved: {billing.wallet.reservedBalance}</div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="number"
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
          className="w-24 rounded border px-2 py-1 text-sm"
        />
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value as CreditOriginType)}
          className="rounded border px-2 py-1 text-sm"
        >
          {GRANT_ORIGINS.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <input
          placeholder="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-w-[200px] flex-1 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void grant("grant")}
          className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
        >
          Grant
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void grant("remove")}
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
        >
          Remove
        </button>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">Ledger history</summary>
        <ul className="mt-2 max-h-48 overflow-y-auto text-xs">
          {billing.ledger.map((row) => (
            <li key={row.id} className="border-b border-zinc-200 py-1">
              {row.actionType} {row.creditsDelta > 0 ? "+" : ""}
              {row.creditsDelta} → {row.balanceAfter}
              {row.creditOrigin ? ` (${row.creditOrigin})` : ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
