"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { formatMotionVersionLabel } from "@/lib/motion-version-display";
import type { ProjectRenderVersionSummary } from "@/types/animation-api";

type Props = {
  versions: ProjectRenderVersionSummary[];
  projectId: string;
  onRestored?: () => void;
};

export function RenderHistoryPanel({ versions, projectId, onRestored }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [diffLines, setDiffLines] = useState<Array<{ field: string; before: string; after: string }>>([]);
  const [diffBusy, setDiffBusy] = useState(false);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [noteDraftById, setNoteDraftById] = useState<Record<string, string>>({});
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);

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

  const kindLabel = (kind: ProjectRenderVersionSummary["kind"]) =>
    kind === "full_rerender"
      ? t("projectDetail.renderHistory.kindFullRerender")
      : kind === "text_rerender"
        ? t("projectDetail.renderHistory.kindTextRerender")
        : t("projectDetail.renderHistory.kindInitial");

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

  const saveVersionNote = async (versionId: string) => {
    const note = noteDraftById[versionId] ?? "";
    setNoteBusyId(versionId);
    try {
      const res = await fetch(`/api/animations/projects/${encodeURIComponent(projectId)}/version-note`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "render", targetId: versionId, versionNote: note }),
      });
      if (!res.ok) {
        return;
      }
      onRestored?.();
    } finally {
      setNoteBusyId(null);
    }
  };

  const restoreVersion = async (versionId: string) => {
    setRestoreBusyId(versionId);
    setRestoreFeedback(null);
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/render-versions/${encodeURIComponent(versionId)}/restore`,
        { method: "POST", credentials: "same-origin" }
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setRestoreFeedback(json.error ?? t("projectDetail.renderHistory.restoreFailed"));
        return;
      }
      setRestoreFeedback(t("projectDetail.renderHistory.restoreDone"));
      onRestored?.();
    } catch {
      setRestoreFeedback(t("projectDetail.renderHistory.restoreFailed"));
    } finally {
      setRestoreBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900">{t("projectDetail.renderHistory.title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("projectDetail.renderHistory.hint")}</p>

      {restoreFeedback ? (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{restoreFeedback}</p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {sorted.map((row) => {
          const finalUrl = row.finalVideoUrl?.trim() || null;
          const canRestore = row.status === "completed" && Boolean(finalUrl) && !row.isDefault;

          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {formatMotionVersionLabel(row.renderVersionNumber, row.versionNote, dateLocale === "nl-NL" ? "nl" : "en")}
                  {row.isDefault ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      {t("projectDetail.renderHistory.current")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {kindLabel(row.kind)} · {t("projectDetail.renderHistory.created")}:{" "}
                  {formatDate(row.completedAt ?? row.createdAt)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    maxLength={200}
                    value={noteDraftById[row.id] ?? row.versionNote ?? ""}
                    onChange={(e) =>
                      setNoteDraftById((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    placeholder={t("projects.versionName.label")}
                    className="min-w-[8rem] flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    disabled={noteBusyId === row.id}
                    onClick={() => void saveVersionNote(row.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {noteBusyId === row.id ? "…" : t("projects.versionNote.save")}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {row.status}
                </span>
                {finalUrl ? (
                  <a
                    href={finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    {t("projectDetail.renderHistory.preview")}
                  </a>
                ) : null}
                {canRestore ? (
                  <button
                    type="button"
                    disabled={restoreBusyId === row.id}
                    onClick={() => void restoreVersion(row.id)}
                    className="rounded-lg border border-[#0067B1]/30 bg-[#0067B1]/10 px-2.5 py-1 text-xs font-medium text-[#0067B1] hover:bg-[#0067B1]/15 disabled:opacity-50"
                  >
                    {restoreBusyId === row.id
                      ? "…"
                      : t("projectDetail.renderHistory.restore")}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
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
