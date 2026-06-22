"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { formatStorageBytes } from "@/lib/format-storage-bytes";
import {
  auditRuntimeStorage,
  installRuntimeStorageAuditConsoleHook,
  printRuntimeStorageAuditTable,
  RUNTIME_STORAGE_WARN_DOCUMENT_BYTES,
  RUNTIME_STORAGE_WARN_KEY_BYTES,
  RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES,
  type RuntimeStorageAudit,
} from "@/lib/runtime-storage-audit";
import { useActiveTranslator, useLocale } from "@/i18n/client";

function WarningBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{label}</span>
  );
}

export function BrowserRuntimeStorageAuditCard() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [audit, setAudit] = useState<RuntimeStorageAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (logToConsole: boolean) => {
    const result = await auditRuntimeStorage();
    setAudit(result);
    setError(null);
    if (logToConsole) {
      printRuntimeStorageAuditTable(result);
    }
    return result;
  }, []);

  useEffect(() => {
    installRuntimeStorageAuditConsoleHook();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("admin.runtimeStorageAudit.error" as never));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.runtimeStorageAudit.error" as never));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppCard className="sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("admin.runtimeStorageAudit.title" as never)}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("admin.runtimeStorageAudit.intro" as never)}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("admin.runtimeStorageAudit.consoleHint" as never)}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading || refreshing}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {refreshing
            ? t("admin.runtimeStorageAudit.refreshing" as never)
            : t("admin.runtimeStorageAudit.refresh" as never)}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("admin.runtimeStorageAudit.loading" as never)}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {audit ? (
        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("admin.runtimeStorageAudit.localTitle" as never)}
            </h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.totalLocal" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.localStorage.totalBytes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.keyCount" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">{audit.localStorage.keyCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.quota" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {audit.localStorage.quotaBytes != null
                    ? formatStorageBytes(audit.localStorage.quotaBytes, locale)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.quotaUsed" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {audit.localStorage.quotaUsedPercent != null
                    ? `${audit.localStorage.quotaUsedPercent.toFixed(1)}%`
                    : "—"}
                </dd>
              </div>
            </dl>

            {audit.localStorage.topKeys.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 pr-4 font-medium">{t("admin.runtimeStorageAudit.colKey" as never)}</th>
                      <th className="py-2 pr-4 font-medium">{t("admin.runtimeStorageAudit.colSize" as never)}</th>
                      <th className="py-2 font-medium">{t("admin.runtimeStorageAudit.colQuotaPct" as never)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.localStorage.topKeys.map((row) => (
                      <tr key={row.key} className="border-b border-zinc-100">
                        <td className="max-w-xs truncate py-2 pr-4 font-mono text-zinc-800" title={row.key}>
                          {row.key}
                          {row.bytes > RUNTIME_STORAGE_WARN_KEY_BYTES ? (
                            <span className="ml-2">
                              <WarningBadge label=">250KB" />
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 text-zinc-700">{row.sizeKb.toFixed(1)} KB</td>
                        <td className="py-2 text-zinc-700">
                          {row.quotaPercent != null ? `${row.quotaPercent.toFixed(2)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("admin.runtimeStorageAudit.indexedDbTitle" as never)}
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              {t("admin.runtimeStorageAudit.indexedDbTotal" as never, {
                total: formatStorageBytes(audit.indexedDb.totalBytes, locale),
              })}
            </p>
            {audit.indexedDb.databases.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 pr-4 font-medium">{t("admin.runtimeStorageAudit.colDatabase" as never)}</th>
                      <th className="py-2 pr-4 font-medium">{t("admin.runtimeStorageAudit.colStore" as never)}</th>
                      <th className="py-2 pr-4 font-medium">{t("admin.runtimeStorageAudit.colEntries" as never)}</th>
                      <th className="py-2 font-medium">{t("admin.runtimeStorageAudit.colSize" as never)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.indexedDb.databases.flatMap((db) =>
                      db.stores.length > 0
                        ? db.stores.map((store) => (
                            <tr key={`${store.database}:${store.store}`} className="border-b border-zinc-100">
                              <td className="py-2 pr-4 font-mono text-zinc-800">{store.database}</td>
                              <td className="py-2 pr-4 font-mono text-zinc-700">{store.store}</td>
                              <td className="py-2 pr-4 text-zinc-700">{store.entryCount}</td>
                              <td className="py-2 text-zinc-700">{(store.bytes / 1024).toFixed(1)} KB</td>
                            </tr>
                          ))
                        : [
                            <tr key={db.name} className="border-b border-zinc-100">
                              <td className="py-2 pr-4 font-mono text-zinc-800">{db.name}</td>
                              <td className="py-2 pr-4 text-zinc-500">—</td>
                              <td className="py-2 pr-4 text-zinc-500">0</td>
                              <td className="py-2 text-zinc-700">{(db.bytes / 1024).toFixed(1)} KB</td>
                            </tr>,
                          ]
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{t("admin.runtimeStorageAudit.indexedDbEmpty" as never)}</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("admin.runtimeStorageAudit.editorTitle" as never)}
            </h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.editorDocuments" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">{audit.editor.documentCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.avgDocument" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.editor.averageDocumentBytes, locale)}
                  {audit.editor.largestDocumentBytes > RUNTIME_STORAGE_WARN_DOCUMENT_BYTES ? (
                    <span className="ml-2">
                      <WarningBadge label=">1MB max" />
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.avgVision" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.editor.averageVisionHierarchyBytes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.avgSemantic" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.editor.averageSemanticLayersBytes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.avgCopilot" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.editor.averageCopilotContextBytes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("admin.runtimeStorageAudit.largestDocument" as never)}</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {formatStorageBytes(audit.editor.largestDocumentBytes, locale)}
                </dd>
              </div>
            </dl>
          </section>

          {audit.warnings.length > 0 ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">
                {t("admin.runtimeStorageAudit.warningsTitle" as never)}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {audit.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${warning.key ?? warning.sessionId ?? index}`}>
                    {warning.message} — {formatStorageBytes(warning.bytes, locale)}
                    {warning.key ? ` (${warning.key})` : null}
                    {warning.sessionId ? ` (${warning.sessionId})` : null}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-800">
                {t("admin.runtimeStorageAudit.warningThresholds" as never, {
                  keyKb: String(RUNTIME_STORAGE_WARN_KEY_BYTES / 1024),
                  docMb: String(RUNTIME_STORAGE_WARN_DOCUMENT_BYTES / (1024 * 1024)),
                  totalMb: String(RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES / (1024 * 1024)),
                })}
              </p>
            </section>
          ) : null}
        </div>
      ) : null}
    </AppCard>
  );
}
