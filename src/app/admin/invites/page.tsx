"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { getActiveTranslator } from "@/i18n";

type InviteRow = {
  id: string;
  email: string | null;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "used" | "expired" | "revoked";
};

export default function AdminInvitesPage() {
  const t = getActiveTranslator();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [expiresDays, setExpiresDays] = useState(7);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    const res = await fetch("/api/admin/invites");
    if (!res.ok) {
      setLoadError(t("admin.invites.loadError"));
      return;
    }
    const data = (await res.json()) as { invites: InviteRow[] };
    setInvites(data.invites);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreatedUrl(null);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          role,
          expiresInDays: expiresDays,
        }),
      });
      if (!res.ok) {
        setLoadError(t("admin.invites.createError"));
        return;
      }
      const data = (await res.json()) as { inviteUrl: string };
      setCreatedUrl(data.inviteUrl);
      setEmail("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/admin/invites/${id}/revoke`, { method: "POST" });
    if (res.ok) {
      await load();
    }
  }

  async function copyLink() {
    if (!createdUrl) {
      return;
    }
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function statusLabel(s: InviteRow["status"]): string {
    const labels: Record<InviteRow["status"], string> = {
      active: t("admin.invites.status.active"),
      used: t("admin.invites.status.used"),
      expired: t("admin.invites.status.expired"),
      revoked: t("admin.invites.status.revoked"),
    };
    return labels[s];
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">{t("admin.invites.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.invites.intro")}</p>

      <AppCard className="mt-8">
        <h2 className="text-lg font-semibold">{t("admin.invites.createTitle")}</h2>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">{t("admin.invites.emailOptional")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">{t("admin.invites.role")}</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="user">{t("admin.role.user")}</option>
              <option value="power">{t("admin.role.power")}</option>
              <option value="admin">{t("admin.role.admin")}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">{t("admin.invites.expiresDays")}</span>
            <input
              type="number"
              min={1}
              max={90}
              value={expiresDays}
              onChange={(e) => setExpiresDays(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <GradientButton type="submit" loading={submitting} className="w-full sm:w-auto">
            {t("admin.invites.submit")}
          </GradientButton>
        </form>

        {createdUrl ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-900">{t("admin.invites.createdTitle")}</p>
            <p className="mt-2 break-all font-mono text-xs text-zinc-800">{createdUrl}</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              {copied ? t("admin.invites.copied") : t("admin.invites.copyLink")}
            </button>
          </div>
        ) : null}
      </AppCard>

      {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 pr-2">{t("admin.invites.table.email")}</th>
              <th className="py-2 pr-2">{t("admin.invites.table.role")}</th>
              <th className="py-2 pr-2">{t("admin.invites.table.status")}</th>
              <th className="py-2 pr-2">{t("admin.invites.table.created")}</th>
              <th className="py-2 pr-2">{t("admin.invites.table.expires")}</th>
              <th className="py-2">{t("admin.invites.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} className="border-b border-zinc-100">
                <td className="py-2 pr-2">{inv.email ?? "—"}</td>
                <td className="py-2 pr-2">{inv.role}</td>
                <td className="py-2 pr-2">{statusLabel(inv.status)}</td>
                <td className="py-2 pr-2 text-xs text-zinc-600">
                  {new Date(inv.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-2 text-xs text-zinc-600">
                  {new Date(inv.expiresAt).toLocaleString()}
                </td>
                <td className="py-2">
                  {inv.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void revoke(inv.id)}
                      className="text-sm text-red-700 underline"
                    >
                      {t("admin.invites.revoke")}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
