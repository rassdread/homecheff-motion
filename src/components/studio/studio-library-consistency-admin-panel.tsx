"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type {
  LibraryConsistencyMissingAsset,
  LibraryGenerationType,
} from "@/types/library-consistency";

type AuditResponse = {
  ok?: boolean;
  totalRecords?: number;
  missingCount?: number;
  missing?: Array<{
    asset: string;
    type: string;
    project: string;
    created: string;
    storageKey: string;
    assetUrl: string;
  }>;
};

export function StudioLibraryConsistencyAdminPanel() {
  const t = useActiveTranslator();
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/studio/library-consistency/audit", { cache: "no-store" });
      if (res.ok) {
        setAudit((await res.json()) as AuditResponse);
      }
    })();
  }, []);

  async function repairItem(item: NonNullable<AuditResponse["missing"]>[number]) {
    setBusyKey(item.storageKey);
    setMessage("");
    const res = await fetch("/api/admin/studio/library-consistency/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          storageKey: item.storageKey,
          assetUrl: item.assetUrl,
          generationType: item.type as LibraryGenerationType,
          category: "images",
          projectId: null,
          projectTitle: item.project !== "—" ? item.project : null,
          createdAt: item.created,
          thumbnailUrl: item.assetUrl,
          assetName: item.asset,
        } satisfies LibraryConsistencyMissingAsset,
      }),
    });
    setBusyKey(null);
    if (res.ok) {
      setMessage(t("library.consistency.admin.repairSuccess" as never));
      const auditRes = await fetch("/api/admin/studio/library-consistency/audit", { cache: "no-store" });
      if (auditRes.ok) {
        setAudit((await auditRes.json()) as AuditResponse);
      }
    } else {
      setMessage(t("library.consistency.admin.repairFailed" as never));
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="library-consistency-admin">
      <h2 className="text-lg font-semibold text-slate-900">
        {t("library.consistency.admin.title" as never)}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {t("library.consistency.admin.lead" as never)}
      </p>
      {audit ?
        <p className="mt-3 text-sm text-slate-800">
          {t("library.consistency.admin.summary" as never, {
            total: String(audit.totalRecords ?? 0),
            missing: String(audit.missingCount ?? 0),
          } as never)}
        </p>
      : null}
      {message ?
        <p className="mt-2 text-sm text-emerald-800">{message}</p>
      : null}
      <ul className="mt-4 space-y-2">
        {(audit?.missing ?? []).map((item) => (
          <li
            key={item.storageKey}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-slate-900">{item.asset}</p>
              <p className="text-xs text-slate-600">
                {item.type} · {item.project} · {new Date(item.created).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              disabled={busyKey === item.storageKey}
              className="rounded-lg border border-[#006D52]/30 bg-[#006D52]/10 px-3 py-1.5 text-xs font-semibold text-[#006D52]"
              onClick={() => void repairItem(item)}
            >
              {t("library.consistency.admin.addToLibrary" as never)}
            </button>
          </li>
        ))}
      </ul>
      <Link href="/studio/assets" className="mt-4 inline-block text-sm font-semibold text-[#0067B1] hover:underline">
        {t("library.consistency.openInLibrary" as never)}
      </Link>
    </section>
  );
}
