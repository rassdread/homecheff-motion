"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveTranslator } from "@/i18n";

type UserRow = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  usageToday: number;
  usageMonth: number;
};

function TableSkeletonRow() {
  return (
    <tr className="border-b border-zinc-100">
      <td className="py-3 pr-2" colSpan={7}>
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const t = getActiveTranslator();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError(t("admin.users.loadError"));
      setUsers([]);
      return;
    }
    const data = (await res.json()) as { users: UserRow[] };
    setUsers(data.users);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function patchUser(id: string, body: { role?: string; isActive?: boolean }) {
    const prev = users;
    setSavingId(id);
    setError("");
    setUsers((rows) =>
      rows.map((u) => (u.id === id ? { ...u, ...body, role: body.role ?? u.role } : u))
    );
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setUsers(prev);
        setError(t("admin.users.updateError"));
        return;
      }
      const data = (await res.json()) as {
        user: { id: string; email: string; role: string; isActive: boolean };
      };
      setUsers((rows) =>
        rows.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u))
      );
    } catch {
      setUsers(prev);
      setError(t("admin.users.updateError"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">{t("admin.users.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.users.intro")}</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 pr-2">{t("admin.users.table.email")}</th>
              <th className="py-2 pr-2">{t("admin.users.table.role")}</th>
              <th className="py-2 pr-2">{t("admin.users.table.active")}</th>
              <th className="py-2 pr-2">{t("admin.users.table.created")}</th>
              <th className="py-2 pr-2">{t("admin.users.table.usageToday")}</th>
              <th className="py-2 pr-2">{t("admin.users.table.usageMonth")}</th>
              <th className="py-2">{t("admin.users.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <TableSkeletonRow />
                <TableSkeletonRow />
                <TableSkeletonRow />
              </>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-2">{u.email}</td>
                  <td className="py-2 pr-2">
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => void patchUser(u.id, { role: e.target.value })}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      <option value="user">{t("admin.role.user")}</option>
                      <option value="power">{t("admin.role.power")}</option>
                      <option value="admin">{t("admin.role.admin")}</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    {savingId === u.id ? (
                      <span className="text-xs text-zinc-500">{t("admin.users.rowSaving")}</span>
                    ) : u.isActive ? (
                      t("admin.users.stateActive")
                    ) : (
                      t("admin.users.stateInactive")
                    )}
                  </td>
                  <td className="py-2 pr-2 text-xs text-zinc-600">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-2">{u.usageToday}</td>
                  <td className="py-2 pr-2">{u.usageMonth}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={savingId === u.id}
                      onClick={() => void patchUser(u.id, { isActive: !u.isActive })}
                      className="text-xs text-emerald-800 underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingId === u.id
                        ? t("admin.users.rowSaving")
                        : u.isActive
                          ? t("admin.users.deactivate")
                          : t("admin.users.activate")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">{t("admin.loadingTable")}</p>
      ) : null}
    </main>
  );
}
