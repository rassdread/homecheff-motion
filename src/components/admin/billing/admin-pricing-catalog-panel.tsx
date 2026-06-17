"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRICING_CATALOG_CATEGORIES } from "@/lib/studio-pricing-catalog-meta";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioPricingCatalogAdminEntry } from "@/types/studio-pricing-catalog";
import type { PricingCatalogCategory } from "@/lib/studio-pricing-catalog-meta";

type EditForm = {
  creditCost: number;
  providerCostUsd: number;
  displayNameNl: string;
  displayNameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  active: boolean;
  visibleInCatalog: boolean;
  notes: string;
};

function entryToForm(entry: StudioPricingCatalogAdminEntry): EditForm {
  return {
    creditCost: entry.creditCost,
    providerCostUsd: entry.providerCostUsd,
    displayNameNl: entry.displayNameNl,
    displayNameEn: entry.displayNameEn,
    descriptionNl: entry.descriptionNl,
    descriptionEn: entry.descriptionEn,
    active: entry.active,
    visibleInCatalog: entry.visibleInCatalog,
    notes: entry.notes,
  };
}

export function AdminPricingCatalogPanel() {
  const t = useActiveTranslator();
  const [items, setItems] = useState<StudioPricingCatalogAdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PricingCatalogCategory | "">("");
  const [paidFilter, setPaidFilter] = useState<"" | "paid" | "free">("");
  const [editing, setEditing] = useState<StudioPricingCatalogAdminEntry | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (paidFilter) params.set("paid", paidFilter);
    try {
      const res = await fetch(`/api/admin/billing/pricing?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { items?: StudioPricingCatalogAdminEntry[] };
      if (!res.ok) {
        throw new Error("load failed");
      }
      setItems(data.items ?? []);
    } catch {
      setError(t("admin.pricing.errors.loadFailed" as never));
    } finally {
      setLoading(false);
    }
  }, [category, paidFilter, search, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        await load();
        if (cancelled) return;
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const marginSummary = useMemo(() => {
    const warnings = items.filter(
      (row) =>
        row.profitabilityStatus === "NEGATIVE_MARGIN" ||
        row.profitabilityStatus === "CRITICAL" ||
        row.profitabilityStatus === "LOW_MARGIN"
    ).length;
    return { warnings, total: items.length };
  }, [items]);

  function profitabilityClass(status: StudioPricingCatalogAdminEntry["profitabilityStatus"]): string {
    switch (status) {
      case "CRITICAL":
      case "NEGATIVE_MARGIN":
        return "font-semibold text-red-600";
      case "LOW_MARGIN":
        return "font-semibold text-orange-600";
      default:
        return "text-emerald-700";
    }
  }

  const save = useCallback(async () => {
    if (!editing || !form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/billing/pricing/${encodeURIComponent(editing.actionType)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "save failed");
      }
      setEditing(null);
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.pricing.errors.saveFailed" as never));
    } finally {
      setSaving(false);
    }
  }, [editing, form, load, t]);

  const restoreDefaults = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/billing/pricing/${encodeURIComponent(editing.actionType)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreDefaults: true }),
      });
      setEditing(null);
      setForm(null);
      await load();
    } finally {
      setSaving(false);
    }
  }, [editing, load]);

  const syncDefaults = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/billing/pricing/sync-defaults", {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }, [load]);

  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

  return (
    <div className="space-y-6" data-testid="admin-pricing-catalog">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-600">{t("admin.pricing.intro" as never)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("admin.pricing.marginWarnings" as never, { count: marginSummary.warnings } as never)}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void syncDefaults()}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("admin.pricing.syncDefaults" as never)}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.pricing.search" as never)}
          className="min-w-[12rem] rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PricingCatalogCategory | "")}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.pricing.allCategories" as never)}</option>
          {PRICING_CATALOG_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {t(`pricing.catalog.category.${key}` as never)}
            </option>
          ))}
        </select>
        <select
          value={paidFilter}
          onChange={(e) => setPaidFilter(e.target.value as "" | "paid" | "free")}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.pricing.allPaidStates" as never)}</option>
          <option value="paid">{t("admin.pricing.paidOnly" as never)}</option>
          <option value="free">{t("admin.pricing.freeOnly" as never)}</option>
        </select>
      </div>

      {error ?
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      : null}

      {loading ?
        <p className="text-sm text-zinc-500">{t("admin.pricing.loading" as never)}</p>
      : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">{t("admin.pricing.col.action" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.category" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.credits" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.providerCost" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.margin" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.profitability" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.provider" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.visible" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.active" as never)}</th>
                <th className="px-4 py-3">{t("admin.pricing.col.updated" as never)}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.actionType} className="border-b border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{row.displayNameEn}</p>
                    <p className="text-xs text-zinc-500">{row.actionType}</p>
                  </td>
                  <td className="px-4 py-3">{t(`pricing.catalog.category.${row.category}` as never)}</td>
                  <td className="px-4 py-3 font-semibold">{row.creditCost}</td>
                  <td className="px-4 py-3">${row.providerCostUsd.toFixed(3)}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>€{row.revenueEur.toFixed(2)} → €{row.marginEur.toFixed(2)}</p>
                    <p className={profitabilityClass(row.profitabilityStatus)}>
                      {row.marginPercent.toFixed(1)}%
                    </p>
                  </td>
                  <td className={`px-4 py-3 text-xs ${profitabilityClass(row.profitabilityStatus)}`}>
                    {t(`admin.pricing.profitability.${row.profitabilityStatus}` as never)}
                  </td>
                  <td className="px-4 py-3">{row.provider}</td>
                  <td className="px-4 py-3">{row.visibleInCatalog ? "✓" : "—"}</td>
                  <td className="px-4 py-3">{row.active ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-emerald-700 underline"
                      onClick={() => {
                        setEditing(row);
                        setForm(entryToForm(row));
                      }}
                    >
                      {t("admin.pricing.edit" as never)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && form ?
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("admin.pricing.editTitle" as never)} — {editing.actionType}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{t("admin.pricing.futureOnlyNote" as never)}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              {t("admin.pricing.fields.credits" as never)}
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.creditCost}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, creditCost: Number(e.target.value) } : prev
                  )
                }
              />
            </label>
            <label className="block text-sm">
              {t("admin.pricing.fields.providerCost" as never)}
              <input
                type="number"
                min={0}
                step={0.001}
                className={inputClass}
                value={form.providerCostUsd}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, providerCostUsd: Number(e.target.value) } : prev
                  )
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("admin.pricing.fields.displayNameNl" as never)}
              <input
                className={inputClass}
                value={form.displayNameNl}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, displayNameNl: e.target.value } : prev))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("admin.pricing.fields.displayNameEn" as never)}
              <input
                className={inputClass}
                value={form.displayNameEn}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, displayNameEn: e.target.value } : prev))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("admin.pricing.fields.descriptionNl" as never)}
              <textarea
                className={inputClass}
                rows={2}
                value={form.descriptionNl}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, descriptionNl: e.target.value } : prev))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("admin.pricing.fields.descriptionEn" as never)}
              <textarea
                className={inputClass}
                rows={2}
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, descriptionEn: e.target.value } : prev))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, active: e.target.checked } : prev))
                }
              />
              {t("admin.pricing.fields.active" as never)}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.visibleInCatalog}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, visibleInCatalog: e.target.checked } : prev
                  )
                }
              />
              {t("admin.pricing.fields.visibleInCatalog" as never)}
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("admin.pricing.fields.notes" as never)}
              <textarea
                className={inputClass}
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                }
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("admin.pricing.save" as never)}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void restoreDefaults()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              {t("admin.pricing.restoreDefaults" as never)}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              {t("admin.pricing.cancel" as never)}
            </button>
          </div>
        </div>
      : null}
    </div>
  );
}
