"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";

type AuditVoiceRow = {
  name: string;
  voiceId: string;
  accent: string;
  language: string;
  gender: string;
  age: string;
  category: string;
  description: string;
  catalogSource: string | null;
  canonicalAccentId: string | null;
};

type AuditPayload = {
  source: string;
  fetchedAt: string;
  totalVoices: number;
  accountVoices: number;
  sharedVoices: number;
  dedupeCount: number;
  totalFetched: number;
  accountFetched: number;
  sharedFetched: number;
  paginationLimited: boolean;
  sharedVoicesLimit: number | null;
  top100: AuditVoiceRow[];
};

export function StudioVoiceLibraryAdminAuditPanel() {
  const t = useActiveTranslator();
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/studio/voice-library-audit");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Audit failed.");
      }
      setData((await res.json()) as AuditPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-amber-950">
          {t("studio.voiceLibrary.adminAudit.title")}
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[36px] rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-950"
        >
          {t("studio.voiceLibrary.adminAudit.refresh")}
        </button>
      </div>
      <p className="mt-1 text-xs text-amber-900">{t("studio.voiceLibrary.adminAudit.lead")}</p>

      {loading ?
        <p className="mt-3 text-xs text-amber-900">{t("studio.voiceLibrary.loading")}</p>
      : null}
      {error ?
        <p className="mt-3 text-xs text-red-800">{error}</p>
      : null}

      {data ?
        <>
          <dl className="mt-3 grid gap-2 text-xs text-amber-950 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.source")}</dt>
              <dd>{data.source}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.total")}</dt>
              <dd>{data.totalVoices}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.accountVoices")}</dt>
              <dd>{data.accountVoices}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.sharedVoices")}</dt>
              <dd>{data.sharedVoices}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.dedupe")}</dt>
              <dd>{data.dedupeCount}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("studio.voiceLibrary.adminAudit.paginationLimited")}</dt>
              <dd>
                {data.paginationLimited
                  ? t("studio.voiceLibrary.adminAudit.yes")
                  : t("studio.voiceLibrary.adminAudit.no")}
                {data.sharedVoicesLimit != null
                  ? ` (${data.sharedFetched}/${data.sharedVoicesLimit})`
                  : null}
              </dd>
            </div>
          </dl>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-amber-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-amber-100/90">
                <tr>
                  <th className="px-2 py-1 font-semibold">{t("studio.voiceLibrary.adminAudit.col.name")}</th>
                  <th className="px-2 py-1 font-semibold">{t("studio.voiceLibrary.adminAudit.col.accent")}</th>
                  <th className="px-2 py-1 font-semibold">{t("studio.voiceLibrary.adminAudit.col.lang")}</th>
                  <th className="px-2 py-1 font-semibold">{t("studio.voiceLibrary.adminAudit.col.category")}</th>
                  <th className="px-2 py-1 font-semibold">{t("studio.voiceLibrary.adminAudit.col.source")}</th>
                </tr>
              </thead>
              <tbody>
                {data.top100.map((row) => (
                  <tr key={row.voiceId} className="border-t border-amber-100">
                    <td className="px-2 py-1">{row.name}</td>
                    <td className="px-2 py-1">{row.accent || "—"}</td>
                    <td className="px-2 py-1">{row.language || "—"}</td>
                    <td className="px-2 py-1">{row.category || "—"}</td>
                    <td className="px-2 py-1">{row.catalogSource || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      : null}
    </section>
  );
}
