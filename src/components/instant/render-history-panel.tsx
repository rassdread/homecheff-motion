"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { ProjectRenderVersionSummary } from "@/types/animation-api";

type Props = {
  versions: ProjectRenderVersionSummary[];
  projectId: string;
};

export function RenderHistoryPanel({ versions, projectId }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [diffLines, setDiffLines] = useState<Array<{ field: string; before: string; after: string }>>([]);
  const [diffBusy, setDiffBusy] = useState(false);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.renderVersionNumber - a.renderVersionNumber),
    [versions]
  );

  if (sorted.length === 0) {
    return null;
  }

  const formatDate = (iso: string | null) => {
    if (!iso) {
      return "—";
    }
    try {
      return new Date(iso).toLocaleString(dateLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const loadDiff = async () => {
    if (!compareA || !compareB || compareA === compareB) {
      return;
    }
    setDiffBusy(true);
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/render-versions?compareA=${encodeURIComponent(compareA)}&compareB=${encodeURIComponent(compareB)}`,
        { credentials: "same-origin" }
      );
      const json = (await res.json()) as { diff?: Array<{ field: string; before: string; after: string }> };
      setDiffLines(json.diff ?? []);
    } finally {
      setDiffBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900">{t("projectDetail.renderHistory.title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("projectDetail.renderHistory.hint")}</p>

      <ul className="mt-4 space-y-2">
        {sorted.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {t("projectDetail.renderHistory.versionLabel", {
                  number: String(row.renderVersionNumber),
                })}
                {row.isDefault ? (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    {t("projectDetail.renderHistory.current")}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-zinc-500">
                {t("projectDetail.renderHistory.created")}: {formatDate(row.createdAt)}
              </p>
              {row.versionNote ? (
                <p className="mt-0.5 text-xs text-zinc-600">{row.versionNote}</p>
              ) : null}
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{row.status}</span>
          </li>
        ))}
      </ul>

      {sorted.length >= 2 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 p-3">
          <p className="text-xs font-semibold text-zinc-700">{t("projectDetail.renderHistory.compareTitle")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">{t("projectDetail.renderHistory.pickA")}</option>
              {sorted.map((v) => (
                <option key={`a-${v.id}`} value={v.id}>
                  v{v.renderVersionNumber}
                </option>
              ))}
            </select>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">{t("projectDetail.renderHistory.pickB")}</option>
              {sorted.map((v) => (
                <option key={`b-${v.id}`} value={v.id}>
                  v{v.renderVersionNumber}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadDiff()}
              disabled={diffBusy || !compareA || !compareB}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-800 disabled:opacity-50"
            >
              {diffBusy ? "…" : t("projectDetail.renderHistory.compareAction")}
            </button>
          </div>
          {diffLines.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-zinc-600">
              {diffLines.map((line) => (
                <li key={line.field}>
                  <span className="font-medium text-zinc-800">{line.field}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
